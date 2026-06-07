import { getEvolutionConfig } from '../evolution/config'
import { maskPhone, sanitizeForLog } from '../evolution/mask'
import { normalizePhone } from '../evolution/normalize-phone'
import { buildInstallMessage, normalizeInstallDevice } from './install-templates'
import { classifyPhoneForWelcome, type CustomerLookupResult } from './inbound-classifier'
import {
  cancelWelcomeFlow,
  ensureInboundLead,
  inspectWelcomeOperationalHistory,
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
  | 'WELCOME_SKIPPED_LOOKUP_UNAVAILABLE'
  | 'WELCOME_SKIPPED_RECENT_HISTORY'
  | 'WELCOME_STARTED'
  | 'WELCOME_SENT'
  | 'WELCOME_DRY_RUN'
  | 'INSTALL_SENT'
  | 'INSTALL_DRY_RUN'
  | 'INSTALL_SKIPPED_RECENT_DUPLICATE'
  | 'FLOW_SKIPPED_DUPLICATE'
  | 'FLOW_FAILED'

export interface InboundWebhookResult {
  ok: boolean
  code: InboundDecisionCode
  message: string
  phone?: string
  customer?: CustomerLookupResult
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

function looksLikeDeviceAnswer(text: string) {
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  return /(samsung|sansung|lg|roku|android|google tv|tcl|tv box|box|fire|stick|iphone|ios|celular|telefone|smart stb|smart up|tv antiga|pc|computador|notebook)/.test(normalized)
}

function welcomeHistoryThreshold(): number {
  const parsed = Number(process.env.WELCOME_HISTORY_MESSAGE_THRESHOLD || 5)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5
}

function welcomeHistoryWindowMs(): number {
  const hours = Number(process.env.WELCOME_HISTORY_WINDOW_HOURS || 72)
  return (Number.isFinite(hours) && hours > 0 ? hours : 72) * 60 * 60 * 1000
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
          active_flow_type: null,
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
    return { ok: true, code: 'INBOUND_IGNORED', message: 'Mensagem enviada pela propria instancia ignorada.', phone: maskPhone(inbound.phone) }
  }

  pruneCache(processedMessages, PROCESSED_TTL_MS)
  if (inbound.messageId && processedMessages.has(inbound.messageId)) {
    return { ok: true, code: 'INBOUND_IGNORED', message: 'Mensagem inbound duplicada ignorada.', phone: maskPhone(inbound.phone) }
  }
  if (inbound.messageId) processedMessages.set(inbound.messageId, Date.now())

  const operational = await ensureInboundLead({
    phone: inbound.phone,
    name: inbound.pushName,
    text: inbound.text,
    messageId: inbound.messageId,
    event: inbound.event,
  }).catch((error) => {
    logInbound('OPERATIONAL_LEAD_CAPTURE_FAILED', { phone: inbound.phone, error: error instanceof Error ? error.message : String(error) })
    return { client: null, duplicate: false, metadata: {} }
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

  const isDeviceIntent = looksLikeDeviceAnswer(inbound.text)
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

  const customer = await classifyPhoneForWelcome(inbound.phone)
  if (customer.kind === 'active_client') {
    logInbound('WELCOME_SKIPPED_CLIENT_EXISTS', { phone: inbound.phone, reason: customer.reason, client: customer.client })
    await recordOperationalEvent('FLOW_SKIPPED_CLIENT_ACTIVE', 'info', {
      client: operational.client,
      phone: inbound.phone,
      message: 'Cliente active encontrado; boas-vindas nao enviada.',
      metadata: { reason: customer.reason, active_client_id: customer.client?.id },
    })
    return { ok: true, code: 'WELCOME_SKIPPED_CLIENT_EXISTS', message: 'Cliente active encontrado; boas-vindas nao enviada.', phone: maskPhone(inbound.phone), customer }
  }
  if (customer.kind === 'active_test') {
    logInbound('WELCOME_SKIPPED_TEST_EXISTS', { phone: inbound.phone, reason: customer.reason, test: customer.test })
    await recordOperationalEvent('FLOW_SKIPPED_TEST_ACTIVE', 'info', {
      client: operational.client,
      phone: inbound.phone,
      stage: 'teste_gerado',
      message: 'Teste active encontrado; boas-vindas nao enviada.',
      metadata: { reason: customer.reason, active_test_id: customer.test?.id },
    })
    return { ok: true, code: 'WELCOME_SKIPPED_TEST_EXISTS', message: 'Teste active encontrado; boas-vindas nao enviada.', phone: maskPhone(inbound.phone), customer }
  }
  if (!customer.checked) {
    logInbound('WELCOME_SKIPPED_LOOKUP_UNAVAILABLE', { phone: inbound.phone, reason: customer.reason })
    await recordOperationalEvent('FLOW_FAILED', 'warning', {
      client: operational.client,
      phone: inbound.phone,
      stage: 'novo_lead',
      message: 'Consulta cliente/teste indisponivel; boas-vindas bloqueada.',
      metadata: { reason: customer.reason },
    })
    return { ok: true, code: 'WELCOME_SKIPPED_LOOKUP_UNAVAILABLE', message: 'Consulta cliente/teste indisponivel; falha fechada sem boas-vindas.', phone: maskPhone(inbound.phone), customer }
  }

  if (!boolEnv(process.env.INBOUND_WELCOME_ENABLED, true)) {
    return { ok: true, code: 'INBOUND_IGNORED', message: 'Boas-vindas inbound desativada.', phone: maskPhone(inbound.phone), customer }
  }

  const operationalHistory = await inspectWelcomeOperationalHistory({
    phone: inbound.phone,
    client: operational.client,
    metadata: operational.metadata,
    windowMs: welcomeHistoryWindowMs(),
    threshold: welcomeHistoryThreshold(),
  }).catch((error) => ({
    checked: false,
    allowWelcome: false,
    messageCount: 0,
    threshold: welcomeHistoryThreshold(),
    reasons: [error instanceof Error ? error.message : 'Falha ao consultar historico operacional.'],
  }))

  if (!operationalHistory.checked) {
    logInbound('WELCOME_SKIPPED_LOOKUP_UNAVAILABLE', { phone: inbound.phone, reason: operationalHistory.reasons.join('; ') })
    await recordOperationalEvent('FLOW_FAILED', 'warning', {
      client: operational.client,
      phone: inbound.phone,
      stage: 'novo_lead',
      message: 'Historico operacional indisponivel; boas-vindas bloqueada.',
      metadata: { flow: 'welcome', reasons: operationalHistory.reasons },
    })
    return { ok: true, code: 'WELCOME_SKIPPED_LOOKUP_UNAVAILABLE', message: 'Historico operacional indisponivel; falha fechada sem boas-vindas.', phone: maskPhone(inbound.phone), customer }
  }

  if (!operationalHistory.allowWelcome) {
    logInbound('WELCOME_SKIPPED_RECENT_HISTORY', { phone: inbound.phone, operationalHistory })
    await recordOperationalEvent('FLOW_SKIPPED_DUPLICATE', 'info', {
      client: operational.client,
      phone: inbound.phone,
      stage: 'novo_lead',
      message: 'Historico operacional bloqueou boas-vindas.',
      metadata: { flow: 'welcome', operational_history: operationalHistory },
    })
    return { ok: true, code: 'WELCOME_SKIPPED_RECENT_HISTORY', message: 'Historico operacional existente; boas-vindas nao enviada.', phone: maskPhone(inbound.phone), customer }
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
    return { ok: true, code: 'WELCOME_SKIPPED_RECENT_HISTORY', message: 'Boas-vindas ja esta em execucao para este numero.', phone: maskPhone(inbound.phone), customer }
  }
  if (isRecentIso(welcomeAt, WELCOME_TTL_MS) && welcomeStatus !== 'WELCOME_DRY_RUN') {
    await recordOperationalEvent('FLOW_SKIPPED_DUPLICATE', 'info', {
      client: operational.client,
      phone: inbound.phone,
      stage: 'novo_lead',
      message: 'Boas-vindas recente ignorada por trava persistente.',
      metadata: { flow: 'welcome', welcome_sent_at: welcomeAt },
    })
    return { ok: true, code: 'WELCOME_SKIPPED_RECENT_HISTORY', message: 'Boas-vindas recente ja registrada para este numero.', phone: maskPhone(inbound.phone), customer }
  }

  pruneCache(recentWelcomeByPhone, WELCOME_TTL_MS)
  if (recentWelcomeByPhone.has(inbound.phone)) {
    logInbound('WELCOME_SKIPPED_RECENT_HISTORY', { phone: inbound.phone, reason: 'Cache local anti-loop.' })
    return { ok: true, code: 'WELCOME_SKIPPED_RECENT_HISTORY', message: 'Boas-vindas recente ja preparada para este numero.', phone: maskPhone(inbound.phone), customer }
  }

  recentWelcomeByPhone.set(inbound.phone, Date.now())
  const startedAt = new Date().toISOString()
  await updateClientOperationalState({
    client: operational.client,
    status: 'lead',
    metadataPatch: {
      welcome_started_at: startedAt,
      welcome_flow_started_at: startedAt,
      welcome_last_message_id: inbound.messageId || undefined,
      welcome_status: 'WELCOME_STARTED',
      welcome_flow_status: 'running',
      active_flow_type: 'welcome',
    },
  }).catch(() => null)
  await recordOperationalEvent('WELCOME_STARTED', 'info', {
    client: operational.client,
    phone: inbound.phone,
    stage: 'novo_lead',
    message: 'Fluxo de boas-vindas iniciado em background.',
    metadata: { message_id: inbound.messageId || null },
  })
  startWelcomeInBackground({
    phone: inbound.phone,
    client: operational.client,
    messageId: inbound.messageId || undefined,
    startedAt,
  })
  logInbound('WELCOME_STARTED', { phone: inbound.phone, background: true })
  return {
    ok: true,
    code: 'WELCOME_STARTED',
    message: 'Fluxo de boas-vindas iniciado em background.',
    phone: maskPhone(inbound.phone),
    customer,
  }
}
