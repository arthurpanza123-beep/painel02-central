import { getEvolutionConfig } from '../evolution/config'
import { maskPhone, sanitizeForLog } from '../evolution/mask'
import { normalizePhone } from '../evolution/normalize-phone'
import { buildInstallMessage, normalizeInstallDevice } from './install-templates'
import { classifyInboundAdIntent, shouldSendWelcomeToPhone, type WelcomeEligibilityResult } from './inbound-classifier'
import {
  cancelWelcomeFlow,
  ensureInboundLead,
  isRecentIso,
  metadataString,
  recordOperationalEvent,
  updateClientOperationalState,
  type OperationalClient,
} from './operational-store'
import { dispatchWelcomeFlow } from './welcome-flow'
import { sendText } from '../evolution/send-text'

type InboundDecisionCode =
  | 'INBOUND_IGNORED'
  | 'WELCOME_SKIPPED_CLIENT_EXISTS'
  | 'WELCOME_SKIPPED_TEST_EXISTS'
  | 'WELCOME_SKIPPED_EXISTING_CONTACT'
  | 'WELCOME_SKIPPED_LOOKUP_UNAVAILABLE'
  | 'WELCOME_SKIPPED_RECENT_HISTORY'
  | 'WELCOME_SKIPPED_NOT_FIRST_CONTACT'
  | 'WELCOME_STARTED'
  | 'WELCOME_SENT'
  | 'WELCOME_DRY_RUN'
  | 'INSTALL_SENT'
  | 'INSTALL_DRY_RUN'
  | 'INSTALL_SKIPPED_RECENT_DUPLICATE'
  | 'FLOW_SKIPPED_DUPLICATE'
  | 'FLOW_FAILED'
  | 'LEAD_OPT_OUT'
  | 'LEAD_WRONG_NUMBER'
  | 'PLANS_SENT'
  | 'PLANS_DRY_RUN'

export interface InboundWebhookResult {
  ok: boolean
  code: InboundDecisionCode
  message: string
  phone?: string
  welcomeEligibility?: WelcomeEligibilityResult
  welcome?: unknown
  install?: unknown
}

type ExtractedInbound = {
  phone: string
  text: string
  fromMe: boolean
  messageId: string
  event: string
  pushName?: string
}

const processedMessages = new Map<string, number>()
const recentWelcomeByPhone = new Map<string, number>()
const recentInstallByPhone = new Map<string, { timestamp: number; device: string }>()
const PROCESSED_TTL_MS = 6 * 60 * 60 * 1000
const WELCOME_TTL_MS = Number(process.env.INBOUND_WELCOME_TTL_HOURS || 24) * 60 * 60 * 1000
const INSTALL_TTL_MS = Number(process.env.INBOUND_INSTALL_TTL_HOURS || 24) * 60 * 60 * 1000
const PLANS_TTL_MS = Number(process.env.INBOUND_PLANS_TTL_HOURS || 24) * 60 * 60 * 1000

function boolEnv(value: string | undefined, fallback: boolean) {
  if (value == null || value === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

function pruneCache(map: Map<string, number>, ttl: number): void
function pruneCache(map: Map<string, { timestamp: number; device: string }>, ttl: number): void
function pruneCache(map: Map<string, number | { timestamp: number; device: string }>, ttl: number) {
  const cutoff = Date.now() - ttl
  for (const [key, value] of map.entries()) {
    const timestamp = typeof value === 'number' ? value : value.timestamp
    if (timestamp < cutoff) map.delete(key)
  }
}

function pickText(message: Record<string, unknown>): string {
  const inner = message.message && typeof message.message === 'object' ? message.message as Record<string, unknown> : {}
  return String(
    inner.conversation ||
    (inner.extendedTextMessage as Record<string, unknown> | undefined)?.text ||
    message.text ||
    message.messageText ||
    ''
  ).trim()
}

function pickPhone(data: Record<string, unknown>): string {
  const key = data.key && typeof data.key === 'object' ? data.key as Record<string, unknown> : {}
  const remoteJid = String(key.remoteJid || data.remoteJid || data.from || data.sender || '')
  const phone = remoteJid.split('@')[0]
  return normalizePhone(phone)
}

function extractInbound(payload: unknown): ExtractedInbound | null {
  if (!payload || typeof payload !== 'object') return null
  const root = payload as Record<string, unknown>
  const data = root.data && typeof root.data === 'object' ? root.data as Record<string, unknown> : root
  const key = data.key && typeof data.key === 'object' ? data.key as Record<string, unknown> : {}
  const event = String(root.event || data.event || '')
  const phone = pickPhone(data)
  const text = pickText(data)
  const fromMe = Boolean(key.fromMe || data.fromMe)
  const messageId = String(key.id || data.id || data.messageId || '')
  const pushName = String(data.pushName || data.senderName || data.name || '')
  if (!phone) return null
  return { phone, text, fromMe, messageId, event, pushName }
}

function logInbound(code: string, payload: Record<string, unknown>) {
  console.log(`[${code}] ${JSON.stringify(sanitizeForLog(payload))}`)
}

function metadataFlag(metadata: Record<string, unknown>, key: string): boolean {
  const value = metadata[key]
  return value === true || value === 'true' || value === 1 || value === '1'
}

function welcomeSkipMessage(eligibility?: WelcomeEligibilityResult | null): string {
  if (!eligibility) return 'Boas-vindas bloqueada por falta de decisao confiavel.'
  if (eligibility.code === 'WELCOME_SKIPPED_CLIENT_EXISTS') return 'Telefone ja salvo como cliente active; boas-vindas nao enviada.'
  if (eligibility.code === 'WELCOME_SKIPPED_TEST_EXISTS') return 'Telefone ja salvo como test_active; boas-vindas nao enviada.'
  if (eligibility.code === 'WELCOME_SKIPPED_EXISTING_CONTACT') return 'Telefone ja existe/salvo; boas-vindas nao enviada.'
  if (eligibility.code === 'WELCOME_SKIPPED_RECENT_HISTORY') return 'Historico recente/conversa existente; boas-vindas nao enviada.'
  if (eligibility.code === 'WELCOME_SKIPPED_NOT_FIRST_CONTACT') return 'Mensagem nao parece primeiro contato real; boas-vindas nao enviada.'
  if (eligibility.code === 'WELCOME_SKIPPED_LOOKUP_UNAVAILABLE') return 'Consulta de cliente/historico indisponivel; falha fechada sem boas-vindas.'
  return eligibility.reason || 'Boas-vindas bloqueada.'
}

async function recordWelcomeSkip(input: {
  code: InboundDecisionCode
  phone: string
  client: OperationalClient | null
  eligibility?: WelcomeEligibilityResult | null
  message?: string
}) {
  await recordOperationalEvent(input.code, input.code === 'WELCOME_SKIPPED_LOOKUP_UNAVAILABLE' ? 'warning' : 'info', {
    client: input.client,
    phone: input.phone,
    stage: 'novo_lead',
    message: input.message || welcomeSkipMessage(input.eligibility),
    metadata: { flow: 'welcome', eligibility: input.eligibility || null },
  })
}

function looksLikeDeviceAnswer(text: string) {
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  return /(samsung|sansung|lg|roku|android|google tv|tcl|tv box|box|fire|stick|iphone|ios|celular|telefone|smart stb|smart up|tv antiga|pc|computador|notebook)/.test(normalized)
}

function ownInstanceNumbers() {
  const config = getEvolutionConfig()
  return [
    config.operatorWhatsapp,
    process.env.EVOLUTION_CONNECTED_PHONE,
    process.env.EVOLUTION_INSTANCE_PHONE,
    process.env.WHATSAPP_INSTANCE_PHONE,
  ].map((value) => normalizePhone(value || '')).filter(Boolean)
}

function isExistingCustomerStatus(status: unknown) {
  const normalized = String(status || '').toLowerCase()
  return ['active', 'test_active', 'expired', 'overdue', 'vencido', 'inactive', 'cancelled', 'canceled', 'paid'].includes(normalized)
}

function buildPlansActivationMessage() {
  return [
    'Olá, tudo bem?',
    '',
    'A Central Play Plus é uma experiência de entretenimento organizada para sua TV, celular ou TV Box.',
    '',
    'Temos opções de acesso de acordo com o tempo que você deseja usar.',
    '',
    'Para eu te passar a melhor orientação, me diga qual aparelho você quer usar:',
    '',
    'Smart TV, TV Box, Fire Stick, celular ou computador?',
    '',
    'Depois disso eu te explico os planos e o passo a passo de ativação.',
  ].join('\n')
}

async function maybeSendPlansActivation(input: {
  phone: string
  client: OperationalClient | null
  messageId?: string
}) {
  const metadata = input.client?.legacy_metadata && typeof input.client.legacy_metadata === 'object' && !Array.isArray(input.client.legacy_metadata) ? input.client.legacy_metadata : {}
  const previous = metadataString(metadata, 'plans_activation_sent_at')
  if (isRecentIso(previous, PLANS_TTL_MS)) {
    await recordOperationalEvent('FLOW_SKIPPED_DUPLICATE', 'info', {
      client: input.client,
      phone: input.phone,
      stage: 'contato',
      message: 'Template de planos/ativacao duplicado ignorado.',
      metadata: { flow: 'plans_activation', previous_sent_at: previous },
    })
    return { ok: true, skipped: true, code: 'PLANS_SKIPPED_RECENT_DUPLICATE' }
  }

  const config = getEvolutionConfig()
  const dryRun = config.dryRun || !config.enabled
  const message = buildPlansActivationMessage()
  const now = new Date().toISOString()
  if (dryRun) {
    await updateClientOperationalState({
      client: input.client,
      status: 'lead',
      metadataPatch: {
        plans_activation_sent_at: now,
        plans_activation_status: 'dry_run',
        plans_activation_last_message_id: input.messageId || undefined,
        inbound_flow_sent: true,
        first_auto_flow_sent_at: metadataString(metadata, 'first_auto_flow_sent_at') || now,
        last_auto_flow_type: 'plans_activation',
        last_auto_flow_source: 'inbound_ads',
        last_auto_flow_message_id: input.messageId || undefined,
      },
    }).catch(() => null)
    await recordOperationalEvent('PLANS_DRY_RUN', 'info', {
      client: input.client,
      phone: input.phone,
      stage: 'contato',
      message: 'Template curto de planos/ativacao preparado.',
      metadata: { flow: 'plans_activation' },
    })
    return { ok: true, dryRun: true, code: 'PLANS_DRY_RUN', preview: message }
  }

  const result = await sendText({ phone: input.phone, message, dryRun: false, context: { flow: 'plans_activation', source: 'inbound_ads' } })
  await updateClientOperationalState({
    client: input.client,
    status: 'lead',
    metadataPatch: {
      plans_activation_sent_at: result.ok ? now : previous || undefined,
      plans_activation_failed_at: result.ok ? undefined : now,
      plans_activation_status: result.ok ? 'sent' : 'failed',
      plans_activation_last_message_id: input.messageId || undefined,
      inbound_flow_sent: result.ok || metadataFlag(metadata, 'inbound_flow_sent'),
      first_auto_flow_sent_at: result.ok ? metadataString(metadata, 'first_auto_flow_sent_at') || now : metadataString(metadata, 'first_auto_flow_sent_at') || undefined,
      last_auto_flow_type: result.ok ? 'plans_activation' : metadataString(metadata, 'last_auto_flow_type') || undefined,
      last_auto_flow_source: result.ok ? 'inbound_ads' : metadataString(metadata, 'last_auto_flow_source') || undefined,
      last_auto_flow_message_id: result.ok ? input.messageId || undefined : metadataString(metadata, 'last_auto_flow_message_id') || undefined,
    },
  }).catch(() => null)
  await recordOperationalEvent(result.ok ? 'PLANS_SENT' : 'FLOW_FAILED', result.ok ? 'success' : 'error', {
    client: input.client,
    phone: input.phone,
    stage: 'contato',
    message: result.ok ? 'Template de planos/ativacao enviado.' : 'Falha ao enviar template de planos/ativacao.',
    metadata: { flow: 'plans_activation', code: result.code },
  })
  return { ...result, preview: message }
}

async function maybeSendInstall(input: {
  phone: string
  text: string
  client: OperationalClient | null
  messageId?: string
}): Promise<unknown | null> {
  if (!boolEnv(process.env.INBOUND_INSTALL_AUTO_REPLY_ENABLED, true)) return null
  if (!looksLikeDeviceAnswer(input.text)) return null

  pruneCache(recentInstallByPhone, INSTALL_TTL_MS)
  const config = getEvolutionConfig()
  const dryRun = config.dryRun || !config.enabled
  const device = normalizeInstallDevice(input.text)
  const metadata = input.client?.legacy_metadata && typeof input.client.legacy_metadata === 'object' && !Array.isArray(input.client.legacy_metadata) ? input.client.legacy_metadata : {}
  const previousDevice = metadataString(metadata, 'install_device')
  const previousInstallAt = metadataString(metadata, 'install_sent_at')
  if (previousDevice === device && isRecentIso(previousInstallAt, INSTALL_TTL_MS)) {
    logInbound('INSTALL_SKIPPED_RECENT_DUPLICATE', { phone: input.phone, device, source: 'supabase_metadata' })
    await recordOperationalEvent('FLOW_SKIPPED_DUPLICATE', 'info', {
      client: input.client,
      phone: input.phone,
      stage: 'contato',
      message: 'Instalacao duplicada ignorada por trava persistente.',
      metadata: { flow: 'install', device, previous_install_at: previousInstallAt },
    })
    return { ok: true, skipped: true, code: 'INSTALL_SKIPPED_RECENT_DUPLICATE', device }
  }
  const recentInstall = recentInstallByPhone.get(input.phone)
  if (recentInstall?.device === device) {
    logInbound('INSTALL_SKIPPED_RECENT_DUPLICATE', { phone: input.phone, device })
    return { ok: true, skipped: true, code: 'INSTALL_SKIPPED_RECENT_DUPLICATE', device }
  }

  const app = process.env.INBOUND_DEFAULT_INSTALL_APP || 'XCloud'
  const message = buildInstallMessage(app, device)
  recentInstallByPhone.set(input.phone, { timestamp: Date.now(), device })
  const now = new Date().toISOString()

  if (dryRun) {
    await updateClientOperationalState({
      client: input.client,
      status: 'lead',
      metadataPatch: {
        install_sent_at: now,
        install_device: device,
        install_last_message_id: input.messageId || metadataString(metadata, 'last_inbound_message_id') || undefined,
        install_dry_run: true,
        install_status: 'dry_run',
        active_flow_type: 'install',
        welcome_flow_status: 'cancelled',
        welcome_flow_cancelled_at: now,
        welcome_cancel_reason: 'install_sent',
        inbound_flow_sent: true,
        first_auto_flow_sent_at: metadataString(metadata, 'first_auto_flow_sent_at') || now,
        last_auto_flow_type: 'install',
        last_auto_flow_source: 'inbound_ads',
        last_auto_flow_message_id: input.messageId || undefined,
      },
    }).catch(() => null)
    await recordOperationalEvent('INSTALL_DRY_RUN', 'info', {
      client: input.client,
      phone: input.phone,
      stage: 'contato',
      message: 'Guia de instalacao preparado em dry-run.',
      metadata: { flow: 'install', app, device },
    })
    return { ok: true, dryRun: true, code: 'INSTALL_DRY_RUN', device, app, preview: message }
  }

  const result = await sendText({ phone: input.phone, message, dryRun: false, context: { flow: 'install_auto_reply', app, device, source: 'inbound_webhook' } })
  const ok = Boolean(result.ok)
  await updateClientOperationalState({
    client: input.client,
    status: 'lead',
    metadataPatch: {
      install_sent_at: ok ? now : previousInstallAt || undefined,
      install_failed_at: ok ? undefined : now,
      install_device: device,
      install_last_message_id: input.messageId || metadataString(metadata, 'last_inbound_message_id') || undefined,
      install_status: ok ? 'sent' : 'failed',
      active_flow_type: 'install',
      welcome_flow_status: 'cancelled',
      welcome_flow_cancelled_at: now,
      welcome_cancel_reason: 'install_sent',
      inbound_flow_sent: ok || metadataFlag(metadata, 'inbound_flow_sent'),
      first_auto_flow_sent_at: ok ? metadataString(metadata, 'first_auto_flow_sent_at') || now : metadataString(metadata, 'first_auto_flow_sent_at') || undefined,
      last_auto_flow_type: ok ? 'install' : metadataString(metadata, 'last_auto_flow_type') || undefined,
      last_auto_flow_source: ok ? 'inbound_ads' : metadataString(metadata, 'last_auto_flow_source') || undefined,
      last_auto_flow_message_id: ok ? input.messageId || undefined : metadataString(metadata, 'last_auto_flow_message_id') || undefined,
    },
  }).catch(() => null)
  await recordOperationalEvent(ok ? 'INSTALL_SENT' : 'FLOW_FAILED', ok ? 'success' : 'error', {
    client: input.client,
    phone: input.phone,
    stage: 'contato',
    message: ok ? 'Guia de instalacao enviado.' : 'Falha ao enviar guia de instalacao.',
    metadata: { flow: 'install', app, device, code: result.code },
  })
  return { ...result, device, app, preview: message }
}

function startWelcomeInBackground(input: {
  phone: string
  client: OperationalClient | null
  messageId?: string
  startedAt: string
  followUp?: 'plans_activation'
}) {
  void (async () => {
    try {
      const welcome = await dispatchWelcomeFlow({
        phone: input.phone,
        client: input.client,
        dryRun: undefined,
        startedAt: input.startedAt,
        messageId: input.messageId,
      })
      if ((welcome as { cancelled?: boolean }).cancelled || (welcome as { code?: string }).code === 'WELCOME_CANCELLED') {
        logInbound('WELCOME_CANCELLED', { phone: input.phone, welcome })
        await updateClientOperationalState({
          client: input.client,
          status: 'lead',
          metadataPatch: {
            welcome_flow_status: 'cancelled',
            welcome_flow_cancelled_at: new Date().toISOString(),
            welcome_cancel_reason: (welcome as { cancelReason?: string }).cancelReason || 'cancelled',
            welcome_last_message_id: input.messageId || undefined,
          },
        }).catch(() => null)
        return
      }
      if ((welcome as { skipped?: boolean }).skipped) {
        logInbound('WELCOME_SKIPPED_RECENT_HISTORY', { phone: input.phone, welcome })
        await updateClientOperationalState({
          client: input.client,
          status: 'lead',
          metadataPatch: {
            welcome_status: 'WELCOME_SKIPPED_RECENT_HISTORY',
            welcome_last_message_id: input.messageId || undefined,
          },
        }).catch(() => null)
        await recordOperationalEvent('FLOW_SKIPPED_DUPLICATE', 'info', {
          client: input.client,
          phone: input.phone,
          stage: 'novo_lead',
          message: 'Historico recente bloqueou boas-vindas.',
          metadata: { flow: 'welcome', welcome },
        })
        return
      }

      const code = (welcome as { dryRun?: boolean }).dryRun ? 'WELCOME_DRY_RUN' : 'WELCOME_SENT'
      const now = new Date().toISOString()
      await updateClientOperationalState({
        client: input.client,
        status: 'lead',
        metadataPatch: {
          welcome_started_at: input.startedAt,
          welcome_flow_started_at: input.startedAt,
          welcome_flow_status: 'completed',
          welcome_sent_at: now,
          welcome_last_message_id: input.messageId || undefined,
          welcome_status: code,
          active_flow_type: 'welcome',
          inbound_flow_sent: true,
          first_auto_flow_sent_at: metadataString((input.client?.legacy_metadata && typeof input.client.legacy_metadata === 'object' && !Array.isArray(input.client.legacy_metadata) ? input.client.legacy_metadata : {}) as Record<string, unknown>, 'first_auto_flow_sent_at') || now,
          last_auto_flow_type: 'welcome',
          last_auto_flow_source: 'inbound_ads',
          last_auto_flow_message_id: input.messageId || undefined,
        },
      }).catch(() => null)
      await recordOperationalEvent(code, code === 'WELCOME_SENT' ? 'success' : 'info', {
        client: input.client,
        phone: input.phone,
        stage: 'novo_lead',
        message: 'Fluxo de boas-vindas preparado/enviado.',
        metadata: { flow: 'welcome', code, background: true },
      })
      logInbound(code, { phone: input.phone, welcome })
      if (input.followUp === 'plans_activation') {
        await maybeSendPlansActivation({
          phone: input.phone,
          client: input.client,
          messageId: input.messageId,
        }).catch((error) => logInbound('FLOW_FAILED', { phone: input.phone, flow: 'plans_activation', error: error instanceof Error ? error.message : String(error) }))
      }
    } catch (error) {
      const now = new Date().toISOString()
      const message = error instanceof Error ? error.message : String(error)
      await updateClientOperationalState({
        client: input.client,
        status: 'lead',
        metadataPatch: {
          welcome_failed_at: now,
          welcome_status: 'WELCOME_FAILED',
          welcome_last_message_id: input.messageId || undefined,
        },
      }).catch(() => null)
      await recordOperationalEvent('FLOW_FAILED', 'error', {
        client: input.client,
        phone: input.phone,
        stage: 'novo_lead',
        message: 'Falha no fluxo de boas-vindas em background.',
        metadata: { flow: 'welcome', error: message },
      }).catch(() => null)
      logInbound('FLOW_FAILED', { phone: input.phone, flow: 'welcome', error: message })
    }
  })()
}

export async function handleEvolutionInboundWebhook(payload: unknown): Promise<InboundWebhookResult> {
  const inbound = extractInbound(payload)
  if (!inbound) {
    return { ok: true, code: 'INBOUND_IGNORED', message: 'Payload inbound sem telefone reconhecido.' }
  }

  if (inbound.fromMe) {
    logInbound('INBOUND_IGNORED', { phone: inbound.phone, messageId: inbound.messageId || undefined, reason: 'fromMe', text: inbound.text })
    return { ok: true, code: 'INBOUND_IGNORED', message: 'Mensagem enviada pela propria instancia ignorada.', phone: maskPhone(inbound.phone) }
  }

  if (ownInstanceNumbers().includes(inbound.phone)) {
    logInbound('INBOUND_IGNORED', { phone: inbound.phone, messageId: inbound.messageId || undefined, reason: 'self_target', text: inbound.text })
    return { ok: true, code: 'INBOUND_IGNORED', message: 'Numero da propria instancia ignorado.', phone: maskPhone(inbound.phone) }
  }

  pruneCache(processedMessages, PROCESSED_TTL_MS)
  if (inbound.messageId && processedMessages.has(inbound.messageId)) {
    return { ok: true, code: 'INBOUND_IGNORED', message: 'Mensagem inbound duplicada ignorada.', phone: maskPhone(inbound.phone) }
  }
  if (inbound.messageId) processedMessages.set(inbound.messageId, Date.now())

  const adIntent = classifyInboundAdIntent(inbound.text)
  const isDeviceIntent = looksLikeDeviceAnswer(inbound.text)
  logInbound('INBOUND_CLASSIFIED', {
    phone: inbound.phone,
    messageId: inbound.messageId || undefined,
    text: inbound.text,
    classification: adIntent,
    isDeviceIntent,
  })
  const welcomeEligibility: WelcomeEligibilityResult | null = isDeviceIntent ? null : await shouldSendWelcomeToPhone({
    phone: inbound.phone,
    text: inbound.text,
    messageId: inbound.messageId || undefined,
  }).catch((error) => ({
    checked: false,
    allowWelcome: false,
    code: 'WELCOME_SKIPPED_LOOKUP_UNAVAILABLE' as const,
    phone: inbound.phone,
    reason: error instanceof Error ? error.message : 'Falha ao decidir elegibilidade de boas-vindas.',
    textLooksLikeInitialContact: false,
  }))

  let operationalCaptureError = ''
  const operational = await ensureInboundLead({
    phone: inbound.phone,
    name: inbound.pushName,
    text: inbound.text,
    messageId: inbound.messageId,
    event: inbound.event,
  }).catch((error) => {
    operationalCaptureError = error instanceof Error ? error.message : String(error)
    logInbound('OPERATIONAL_LEAD_CAPTURE_FAILED', { phone: inbound.phone, error: operationalCaptureError })
    return { client: null, duplicate: false, metadata: {}, created: false, existing: false }
  })

  if (operational.duplicate) {
    logInbound('INBOUND_IGNORED', { phone: inbound.phone, messageId: inbound.messageId, source: 'supabase_metadata' })
    await recordOperationalEvent('INBOUND_IGNORED', 'info', {
      client: operational.client,
      phone: inbound.phone,
      stage: 'novo_lead',
      message: 'Inbound duplicado da Evolution ignorado por message_id persistente.',
      metadata: { message_id: inbound.messageId },
    })
    return { ok: true, code: 'INBOUND_IGNORED', message: 'Mensagem inbound duplicada ignorada.', phone: maskPhone(inbound.phone) }
  }

  if (adIntent === 'opt_out') {
    await updateClientOperationalState({
      client: operational.client,
      status: 'lead',
      metadataPatch: {
        opt_out_at: new Date().toISOString(),
        opt_out_reason: 'inbound_not_interested',
        opt_out_message_id: inbound.messageId || undefined,
        inbound_last_classification: adIntent,
        active_flow_type: 'stopped',
      },
    }).catch(() => null)
    await recordOperationalEvent('LEAD_OPT_OUT', 'info', {
      client: operational.client,
      phone: inbound.phone,
      stage: 'novo_lead',
      message: 'Lead informou que nao quer continuar.',
      metadata: { message_id: inbound.messageId || null },
    })
    logInbound('LEAD_OPT_OUT', { phone: inbound.phone, messageId: inbound.messageId || undefined, classification: adIntent })
    return { ok: true, code: 'LEAD_OPT_OUT', message: 'Lead opt-out registrado; nenhum fluxo enviado.', phone: maskPhone(inbound.phone) }
  }

  if (adIntent === 'wrong_number') {
    await updateClientOperationalState({
      client: operational.client,
      status: 'lead',
      metadataPatch: {
        wrong_number_at: new Date().toISOString(),
        wrong_number_message_id: inbound.messageId || undefined,
        inbound_last_classification: adIntent,
        active_flow_type: 'stopped',
      },
    }).catch(() => null)
    await recordOperationalEvent('LEAD_WRONG_NUMBER', 'info', {
      client: operational.client,
      phone: inbound.phone,
      stage: 'novo_lead',
      message: 'Lead informou numero errado; automacao bloqueada.',
      metadata: { message_id: inbound.messageId || null, classification: adIntent },
    })
    logInbound('LEAD_WRONG_NUMBER', { phone: inbound.phone, messageId: inbound.messageId || undefined, classification: adIntent })
    return { ok: true, code: 'LEAD_WRONG_NUMBER', message: 'Wrong number registrado; nenhum fluxo enviado.', phone: maskPhone(inbound.phone) }
  }

  if (isExistingCustomerStatus(operational.client?.status)) {
    logInbound('INBOUND_IGNORED', {
      phone: inbound.phone,
      messageId: inbound.messageId || undefined,
      reason: 'existing_client',
      status: operational.client?.status,
      classification: adIntent,
    })
    await recordOperationalEvent('INBOUND_IGNORED', 'info', {
      client: operational.client,
      phone: inbound.phone,
      stage: 'novo_lead',
      message: 'Cliente existente ignorado para fluxo automatico de lead novo.',
      metadata: { message_id: inbound.messageId || null, classification: adIntent, status: operational.client?.status || null },
    })
    return { ok: true, code: 'INBOUND_IGNORED', message: 'Cliente existente; fluxo automatico de lead novo nao enviado.', phone: maskPhone(inbound.phone) }
  }

  const alreadyFlowSent = metadataFlag(operational.metadata, 'inbound_flow_sent') || Boolean(metadataString(operational.metadata, 'first_auto_flow_sent_at'))
  const optOutAt = metadataString(operational.metadata, 'opt_out_at')
  const wrongNumberAt = metadataString(operational.metadata, 'wrong_number_at')
  if (optOutAt || wrongNumberAt || (alreadyFlowSent && !isDeviceIntent)) {
    const reason = optOutAt ? 'opt_out' : wrongNumberAt ? 'wrong_number' : 'already_flow_sent'
    logInbound('INBOUND_IGNORED', {
      phone: inbound.phone,
      messageId: inbound.messageId || undefined,
      reason,
      classification: adIntent,
      alreadyFlowSent,
    })
    await recordOperationalEvent('INBOUND_IGNORED', 'info', {
      client: operational.client,
      phone: inbound.phone,
      stage: 'novo_lead',
      message: reason === 'already_flow_sent'
        ? 'Fluxo inicial ja marcado como enviado; nova automacao ignorada.'
        : 'Lead bloqueado por opt-out/wrong-number persistente.',
      metadata: { message_id: inbound.messageId || null, classification: adIntent, reason, already_flow_sent: alreadyFlowSent },
    })
    return { ok: true, code: 'INBOUND_IGNORED', message: 'Automacao inbound bloqueada por marca persistente.', phone: maskPhone(inbound.phone) }
  }

  logInbound('INBOUND_MESSAGE_RECEIVED', {
    event: inbound.event,
    phone: inbound.phone,
    hasText: Boolean(inbound.text),
    messageId: inbound.messageId || undefined,
  })
  await recordOperationalEvent('INBOUND_RECEIVED', 'info', {
    client: operational.client,
    phone: inbound.phone,
    stage: 'novo_lead',
    message: 'Inbound real recebido pelo Painel 2.',
    metadata: { event: inbound.event, message_id: inbound.messageId || null, has_text: Boolean(inbound.text) },
  })

  if (isDeviceIntent) {
    const device = normalizeInstallDevice(inbound.text)
    const flowClient = await cancelWelcomeFlow({
      client: operational.client,
      phone: inbound.phone,
      reason: 'device_install_intent',
      messageId: inbound.messageId || undefined,
      device,
    }).catch(() => operational.client)

    const install = await maybeSendInstall({
      phone: inbound.phone,
      text: inbound.text,
      client: flowClient || operational.client,
      messageId: inbound.messageId || undefined,
    })
    if (!install) {
      logInbound('INBOUND_IGNORED', { phone: inbound.phone, reason: 'install_disabled_or_unavailable', device })
      return { ok: true, code: 'INBOUND_IGNORED', message: 'Mensagem de aparelho detectada, mas auto-resposta de instalacao esta desativada.', phone: maskPhone(inbound.phone) }
    }

    const rawInstallCode = String((install as { code?: string }).code || '')
    const installCode = (
      rawInstallCode === 'INSTALL_SKIPPED_RECENT_DUPLICATE'
        ? 'INSTALL_SKIPPED_RECENT_DUPLICATE'
        : (install as { dryRun?: boolean }).dryRun ? 'INSTALL_DRY_RUN' : 'INSTALL_SENT'
    ) as InboundDecisionCode
    logInbound(installCode, { phone: inbound.phone, install })
    return {
      ok: true,
      code: installCode,
      message: rawInstallCode === 'INSTALL_SKIPPED_RECENT_DUPLICATE'
        ? 'Instalacao recente ja registrada para este aparelho; nada reenviado.'
        : 'Resposta de instalacao preparada/enviada.',
      phone: maskPhone(inbound.phone),
      install,
    }
  }

  if (!boolEnv(process.env.INBOUND_WELCOME_ENABLED, true)) {
    return { ok: true, code: 'INBOUND_IGNORED', message: 'Boas-vindas inbound desativada.', phone: maskPhone(inbound.phone), welcomeEligibility: welcomeEligibility || undefined }
  }

  if (operationalCaptureError) {
    const eligibility: WelcomeEligibilityResult = {
      checked: false,
      allowWelcome: false,
      code: 'WELCOME_SKIPPED_LOOKUP_UNAVAILABLE',
      phone: inbound.phone,
      reason: `Falha ao gravar/consultar lead operacional: ${operationalCaptureError}`,
      textLooksLikeInitialContact: welcomeEligibility?.textLooksLikeInitialContact,
    }
    logInbound('WELCOME_SKIPPED_LOOKUP_UNAVAILABLE', { phone: inbound.phone, reason: eligibility.reason })
    await recordWelcomeSkip({ code: 'WELCOME_SKIPPED_LOOKUP_UNAVAILABLE', phone: inbound.phone, client: operational.client, eligibility })
    return { ok: true, code: 'WELCOME_SKIPPED_LOOKUP_UNAVAILABLE', message: welcomeSkipMessage(eligibility), phone: maskPhone(inbound.phone), welcomeEligibility: eligibility }
  }

  if (!welcomeEligibility?.allowWelcome) {
    const code = (welcomeEligibility?.code && welcomeEligibility.code !== 'WELCOME_ALLOWED'
      ? welcomeEligibility.code
      : 'WELCOME_SKIPPED_LOOKUP_UNAVAILABLE') as InboundDecisionCode
    logInbound(code, { phone: inbound.phone, eligibility: welcomeEligibility })
    await recordWelcomeSkip({ code, phone: inbound.phone, client: operational.client, eligibility: welcomeEligibility })
    return { ok: true, code, message: welcomeSkipMessage(welcomeEligibility), phone: maskPhone(inbound.phone), welcomeEligibility: welcomeEligibility || undefined }
  }

  if (!operational.created || !operational.client?.id) {
    const eligibility: WelcomeEligibilityResult = {
      ...welcomeEligibility,
      allowWelcome: false,
      code: operational.existing ? 'WELCOME_SKIPPED_EXISTING_CONTACT' : 'WELCOME_SKIPPED_LOOKUP_UNAVAILABLE',
      reason: operational.existing
        ? 'Telefone passou na pre-checagem, mas ja existia ao gravar inbound; falha fechada.'
        : 'Lead operacional nao foi criado com seguranca; falha fechada.',
    }
    logInbound(eligibility.code, { phone: inbound.phone, eligibility })
    await recordWelcomeSkip({ code: eligibility.code as InboundDecisionCode, phone: inbound.phone, client: operational.client, eligibility })
    return { ok: true, code: eligibility.code as InboundDecisionCode, message: welcomeSkipMessage(eligibility), phone: maskPhone(inbound.phone), welcomeEligibility: eligibility }
  }

  const welcomeAt = metadataString(operational.metadata, 'welcome_sent_at')
  const welcomeStatus = metadataString(operational.metadata, 'welcome_status')
  const welcomeStartedAt = metadataString(operational.metadata, 'welcome_started_at')
  if (welcomeStatus === 'WELCOME_STARTED' && isRecentIso(welcomeStartedAt, WELCOME_TTL_MS)) {
    await recordOperationalEvent('FLOW_SKIPPED_DUPLICATE', 'info', {
      client: operational.client,
      phone: inbound.phone,
      stage: 'novo_lead',
      message: 'Boas-vindas em execucao ignorada por trava persistente.',
      metadata: { flow: 'welcome', welcome_started_at: welcomeStartedAt },
    })
    return { ok: true, code: 'WELCOME_SKIPPED_RECENT_HISTORY', message: 'Boas-vindas ja esta em execucao para este numero.', phone: maskPhone(inbound.phone), welcomeEligibility }
  }
  if (isRecentIso(welcomeAt, WELCOME_TTL_MS) && welcomeStatus !== 'WELCOME_DRY_RUN') {
    await recordOperationalEvent('FLOW_SKIPPED_DUPLICATE', 'info', {
      client: operational.client,
      phone: inbound.phone,
      stage: 'novo_lead',
      message: 'Boas-vindas recente ignorada por trava persistente.',
      metadata: { flow: 'welcome', welcome_sent_at: welcomeAt },
    })
    return { ok: true, code: 'WELCOME_SKIPPED_RECENT_HISTORY', message: 'Boas-vindas recente ja registrada para este numero.', phone: maskPhone(inbound.phone), welcomeEligibility }
  }

  pruneCache(recentWelcomeByPhone, WELCOME_TTL_MS)
  if (recentWelcomeByPhone.has(inbound.phone)) {
    logInbound('WELCOME_SKIPPED_RECENT_HISTORY', { phone: inbound.phone, reason: 'Cache local anti-loop.' })
    return { ok: true, code: 'WELCOME_SKIPPED_RECENT_HISTORY', message: 'Boas-vindas recente ja preparada para este numero.', phone: maskPhone(inbound.phone), welcomeEligibility }
  }

  recentWelcomeByPhone.set(inbound.phone, Date.now())
  const startedAt = new Date().toISOString()
  await updateClientOperationalState({
    client: operational.client,
    status: 'lead',
    metadataPatch: {
      welcome_started_at: startedAt,
      welcome_flow_started_at: startedAt,
      welcome_sent_at: startedAt,
      last_inbound_at: startedAt,
      last_inbound_message_id: inbound.messageId || undefined,
      welcome_last_message_id: inbound.messageId || undefined,
      welcome_status: 'WELCOME_STARTED',
      welcome_flow_status: 'running',
      active_flow_type: 'welcome',
      inbound_flow_sent: true,
      first_auto_flow_sent_at: startedAt,
      last_auto_flow_type: adIntent === 'plans_activation' ? 'welcome_plans_activation' : 'welcome',
      last_auto_flow_source: 'inbound_ads',
      last_auto_flow_message_id: inbound.messageId || undefined,
      inbound_last_classification: adIntent,
    },
  }).catch(() => null)
  await recordOperationalEvent('WELCOME_STARTED', 'info', {
    client: operational.client,
    phone: inbound.phone,
    stage: 'novo_lead',
    message: 'Fluxo de boas-vindas iniciado em background.',
    metadata: { message_id: inbound.messageId || null, classification: adIntent, flow: adIntent === 'plans_activation' ? 'welcome_plans_activation' : 'welcome' },
  })
  startWelcomeInBackground({
    phone: inbound.phone,
    client: operational.client,
    messageId: inbound.messageId || undefined,
    startedAt,
    followUp: adIntent === 'plans_activation' ? 'plans_activation' : undefined,
  })
  logInbound('INBOUND_FLOW_SENT', {
    phone: inbound.phone,
    messageId: inbound.messageId || undefined,
    classification: adIntent,
    flow: adIntent === 'plans_activation' ? 'welcome_plans_activation' : 'welcome',
    reason: 'eligible_new_inbound',
    historyMessageCount: welcomeEligibility.history?.messageCount,
    alreadyFlowSent: false,
  })
  return {
    ok: true,
    code: 'WELCOME_STARTED',
    message: 'Fluxo de boas-vindas iniciado em background.',
    phone: maskPhone(inbound.phone),
    welcomeEligibility,
  }
}
