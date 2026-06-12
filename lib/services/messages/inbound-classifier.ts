import { maskPhone, sanitizeForLog } from '../evolution/mask'
import { buildPhoneCandidates, normalizePhone } from '../evolution/normalize-phone'
import { inboundWelcomeHistoryThreshold, inboundWelcomeHistoryWindowMs, inspectEvolutionConversationHistory, type EvolutionConversationHistory } from './conversation-history'

type CustomerKind = 'active_client' | 'active_test' | 'non_customer' | 'unknown'
type WelcomeEligibilityCode =
  | 'WELCOME_ALLOWED'
  | 'WELCOME_SKIPPED_CLIENT_EXISTS'
  | 'WELCOME_SKIPPED_TEST_EXISTS'
  | 'WELCOME_SKIPPED_EXISTING_CONTACT'
  | 'WELCOME_SKIPPED_RECENT_HISTORY'
  | 'WELCOME_SKIPPED_LOOKUP_UNAVAILABLE'
  | 'WELCOME_SKIPPED_NOT_FIRST_CONTACT'

export interface CustomerLookupResult {
  checked: boolean
  kind: CustomerKind
  phone: string
  reason: string
  client?: { id: string; name?: string; status?: string }
  test?: { id: string; status?: string; expiresAt?: string | null }
}

export interface WelcomeEligibilityResult {
  checked: boolean
  allowWelcome: boolean
  code: WelcomeEligibilityCode
  phone: string
  reason: string
  client?: { id: string; name?: string; status?: string }
  history?: EvolutionConversationHistory
  textLooksLikeInitialContact?: boolean
}

export type InboundAdIntent =
  | 'generic_new_lead'
  | 'welcome_interest'
  | 'device_question'
  | 'plans_activation'
  | 'ad_greeting'
  | 'opt_out'
  | 'wrong_number'
  | 'other'

type SupabaseRow = Record<string, unknown>

function supabaseConfig() {
  return {
    url: String(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, ''),
    key: String(process.env.SUPABASE_SERVICE_ROLE_KEY || ''),
  }
}

function queryValue(value: string) {
  return encodeURIComponent(value)
}

function boolEnv(value: string | undefined, fallback: boolean) {
  if (value == null || value === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

async function supabaseSelect<T extends SupabaseRow>(path: string): Promise<T[]> {
  const config = supabaseConfig()
  if (!config.url || !config.key) throw new Error('Supabase server env ausente.')
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      'Content-Type': 'application/json',
    },
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Supabase HTTP ${response.status}: ${text.slice(0, 160)}`)
  }
  const payload = await response.json().catch(() => [])
  return Array.isArray(payload) ? payload as T[] : []
}

function isActiveClientStatus(status: unknown) {
  return String(status || '').toLowerCase() === 'active'
}

function isTestActiveClientStatus(status: unknown) {
  return String(status || '').toLowerCase() === 'test_active'
}

function isActiveTestStatus(status: unknown) {
  return String(status || '').toLowerCase() === 'active'
}

function isFuture(value: unknown) {
  const text = String(value || '')
  if (!text) return true
  const time = new Date(text).getTime()
  return Number.isNaN(time) || time > Date.now()
}

function metadataHasPriorConversation(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return []
  const record = metadata as Record<string, unknown>
  const reasons: string[] = []
  for (const key of [
    'welcome_sent_at',
    'welcome_started_at',
    'welcome_flow_started_at',
    'inbound_flow_sent',
    'first_auto_flow_sent_at',
    'install_sent_at',
    'opt_out_at',
    'wrong_number_at',
    'last_inbound_at',
    'last_inbound_message_id',
    'last_outbound_at',
    'last_outbound_message_id',
    'welcome_flow_status',
    'active_flow_type',
    'last_device_intent_at',
    'last_device_intent_message_id',
  ]) {
    if (record[key]) reasons.push(`metadata_${key}`)
  }

  for (const key of ['inbound_message_count', 'message_count', 'conversation_message_count', 'outbound_message_count']) {
    const count = Number(record[key])
    if (Number.isFinite(count) && count > 0) reasons.push(`metadata_${key}`)
  }

  return reasons
}

export function looksLikeInitialAdContact(text: string): boolean {
  const normalized = String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[?!.,;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized) return false
  if (/(login|senha|renovar|renovacao|pagamento|pix|suporte|travando|nao funciona)/.test(normalized)) {
    return false
  }

  return /(^|\s)(opa|oi|ola|bom dia|boa tarde|boa noite|tudo bem|e ai)(\s|$)|ola seja bem vindo a central play plus atendimento online|central play plus|tenho interesse|quero saber|quero saber mais|saber mais|gostaria de saber|quero informa[cç]oes|mais informa[cç]oes|pode me explicar|me explica|me fala mais|quero fazer (um )?teste|fazer (um )?teste|teste gratis|tem teste|quero teste|quero conhecer|gostaria de conhecer|vi (o )?anuncio|vim pelo anuncio|vi no instagram|vi no facebook|como funciona|como usa|como funciona para usar|como funciona na minha tv|como uso na tv|funciona na minha tv|quero usar na minha tv|samsung|sansung|lg|roku|android|google tv|tcl|tv box|fire stick|mi stick|iphone|ios|celular|smart stb|smart up|pc|computador|notebook|qual (e )?o valor|valores|valor|preco|planos|quais sao os planos|quais planos|quero os planos|quero conhecer os planos|gostaria de saber os planos|quero assinar|assinar agora|quero ativar|gostaria de ativar|como faco para ativar|como ativar|saber como ativar|me chama|pode me passar/.test(normalized)
}

export function classifyInboundAdIntent(text: string): InboundAdIntent {
  const normalized = String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[?!.,;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!normalized) return 'other'
  if (/(^|\s)(nao quero|não quero|pare|parar|remover|sair|cancela|cancelar|stop|me remove|sem interesse|nao tenho interesse)(\s|$)/i.test(text)) return 'opt_out'
  if (/(numero errado|número errado|aqui nao e|aqui não é|nao sou essa pessoa|não sou essa pessoa|nao conheco|não conheço|enganou|telefone errado)/i.test(text)) return 'wrong_number'
  if (/ola seja bem vindo a central play plus atendimento online/.test(normalized)) return 'ad_greeting'
  if (/(gostaria de conhecer os planos|conhecer os planos|quais planos|quais sao os planos|quero os planos|quero conhecer os planos|gostaria de saber os planos|quero ativar|gostaria de ativar|como faco para ativar|como ativar|saber como ativar|planos e saber como ativar|quanto custa|qual (e )?o valor|valores|valor|preco|planos)/.test(normalized)) return 'plans_activation'
  if (/(como funciona para usar|como funciona na minha tv|como uso na tv|funciona na minha tv|quero usar na minha tv|como funciona|como usa|samsung|sansung|lg|roku|android|google tv|tcl|tv box|fire stick|mi stick|iphone|ios|celular|smart stb|smart up)/.test(normalized)) return 'device_question'
  if (/(quero saber mais|saber mais sobre a central play plus|quero saber mais sobre a central play plus|central play plus|tenho interesse|mais informacoes|quero informacoes|gostaria de saber|quero saber|pode me explicar|me explica|quero conhecer|gostaria de conhecer|vi (o )?anuncio|vim pelo anuncio|vi no instagram|vi no facebook|me fala mais|tem teste|quero teste|teste gratis)/.test(normalized)) return 'welcome_interest'
  if (/(^|\s)(opa|oi|ola|bom dia|boa tarde|boa noite|tudo bem|e ai)(\s|$)/.test(normalized)) return 'generic_new_lead'
  return 'other'
}

export async function shouldSendWelcomeToPhone(input: string | {
  phone: string
  text?: string
  messageId?: string
}): Promise<WelcomeEligibilityResult> {
  const phone = typeof input === 'string' ? input : input.phone
  const text = typeof input === 'string' ? '' : String(input.text || '')
  const messageId = typeof input === 'string' ? '' : String(input.messageId || '')
  const normalized = normalizePhone(phone)
  if (!normalized) {
    return {
      checked: false,
      allowWelcome: false,
      code: 'WELCOME_SKIPPED_LOOKUP_UNAVAILABLE',
      phone: '',
      reason: 'Telefone invalido.',
      textLooksLikeInitialContact: false,
    }
  }

  const initialContact = looksLikeInitialAdContact(text)
  if (!initialContact) {
    return {
      checked: true,
      allowWelcome: false,
      code: 'WELCOME_SKIPPED_NOT_FIRST_CONTACT',
      phone: normalized,
      reason: 'Mensagem nao parece primeiro contato real de anuncio.',
      textLooksLikeInitialContact: false,
    }
  }

  const candidates = buildPhoneCandidates(normalized)
  const phoneFilters = candidates.map((candidate) => `phone_e164.eq.${queryValue(candidate)}`).join(',')
  const onlyNewPhones = boolEnv(process.env.INBOUND_WELCOME_ONLY_FOR_NEW_PHONES, true)

  try {
    const clients = await supabaseSelect<{ id: string; name?: string; status?: string; legacy_metadata?: Record<string, unknown> }>(
      `clients?select=id,name,status,phone_e164,legacy_metadata&or=(${phoneFilters})&limit=10`
    )
    const testActiveClient = clients.find((client) => isTestActiveClientStatus(client.status))
    if (testActiveClient) {
      return {
        checked: true,
        allowWelcome: false,
        code: 'WELCOME_SKIPPED_TEST_EXISTS',
        phone: normalized,
        reason: 'Telefone ja existe em clients com status test_active.',
        client: { id: testActiveClient.id, name: testActiveClient.name, status: testActiveClient.status },
        textLooksLikeInitialContact: true,
      }
    }

    const activeClient = clients.find((client) => isActiveClientStatus(client.status))
    if (activeClient) {
      return {
        checked: true,
        allowWelcome: false,
        code: 'WELCOME_SKIPPED_CLIENT_EXISTS',
        phone: normalized,
        reason: 'Telefone ja existe em clients com status active.',
        client: { id: activeClient.id, name: activeClient.name, status: activeClient.status },
        textLooksLikeInitialContact: true,
      }
    }

    const metadataClient = clients.find((client) => metadataHasPriorConversation(client.legacy_metadata).length > 0)
    if (metadataClient) {
      return {
        checked: true,
        allowWelcome: false,
        code: 'WELCOME_SKIPPED_EXISTING_CONTACT',
        phone: normalized,
        reason: `Telefone ja tem metadata de conversa anterior: ${metadataHasPriorConversation(metadataClient.legacy_metadata).join(', ')}.`,
        client: { id: metadataClient.id, name: metadataClient.name, status: metadataClient.status },
        textLooksLikeInitialContact: true,
      }
    }

    if (onlyNewPhones && clients.length > 0) {
      const client = clients[0]
      return {
        checked: true,
        allowWelcome: false,
        code: 'WELCOME_SKIPPED_EXISTING_CONTACT',
        phone: normalized,
        reason: 'Telefone ja existe em clients; flag INBOUND_WELCOME_ONLY_FOR_NEW_PHONES=true.',
        client: { id: client.id, name: client.name, status: client.status },
        textLooksLikeInitialContact: true,
      }
    }
  } catch (error) {
    console.warn(`[WELCOME_LOOKUP_FAILED] ${JSON.stringify(sanitizeForLog({
      phone: maskPhone(normalized),
      error: error instanceof Error ? error.message : String(error),
    }))}`)
    return {
      checked: false,
      allowWelcome: false,
      code: 'WELCOME_SKIPPED_LOOKUP_UNAVAILABLE',
      phone: normalized,
      reason: error instanceof Error ? error.message : 'Falha ao consultar clients.',
      textLooksLikeInitialContact: true,
    }
  }

  const history = await inspectEvolutionConversationHistory({
    phone: normalized,
    messageId,
    threshold: inboundWelcomeHistoryThreshold(),
    windowMs: inboundWelcomeHistoryWindowMs(),
  }).catch((error) => ({
    checked: false,
    allowWelcome: false,
    messageCount: 0,
    previousMessageCount: 0,
    previousInboundCount: 0,
    outboundCount: 0,
    threshold: inboundWelcomeHistoryThreshold(),
    activeContext: false,
    reasons: [error instanceof Error ? error.message : 'Falha ao consultar historico Evolution.'],
  }))

  if (!history.checked) {
    return {
      checked: false,
      allowWelcome: false,
      code: 'WELCOME_SKIPPED_LOOKUP_UNAVAILABLE',
      phone: normalized,
      reason: history.reasons.join('; ') || 'Historico indisponivel.',
      history,
      textLooksLikeInitialContact: true,
    }
  }

  if (!history.allowWelcome) {
    return {
      checked: true,
      allowWelcome: false,
      code: 'WELCOME_SKIPPED_RECENT_HISTORY',
      phone: normalized,
      reason: history.reasons.join('; ') || 'Historico recente bloqueou boas-vindas.',
      history,
      textLooksLikeInitialContact: true,
    }
  }

  return {
    checked: true,
    allowWelcome: true,
    code: 'WELCOME_ALLOWED',
    phone: normalized,
    reason: 'Telefone novo/elegivel, historico inicial com ate 5 mensagens e mensagem de interesse inicial.',
    history,
    textLooksLikeInitialContact: true,
  }
}

export async function classifyPhoneForWelcome(phone: string): Promise<CustomerLookupResult> {
  const normalized = normalizePhone(phone)
  if (!normalized) {
    return { checked: false, kind: 'unknown', phone: '', reason: 'Telefone invalido.' }
  }

  const candidates = buildPhoneCandidates(normalized)
  const phoneFilters = candidates.map((candidate) => `phone_e164.eq.${queryValue(candidate)}`).join(',')

  try {
    const clients = await supabaseSelect<{ id: string; name?: string; status?: string }>(
      `clients?select=id,name,status,phone_e164&or=(${phoneFilters})&limit=5`
    )
    const activeClient = clients.find((client) => isActiveClientStatus(client.status))
    if (activeClient) {
      return {
        checked: true,
        kind: 'active_client',
        phone: normalized,
        reason: 'Cliente active encontrado pelo telefone.',
        client: { id: activeClient.id, name: activeClient.name, status: activeClient.status },
      }
    }

    const clientIds = clients.map((client) => client.id).filter(Boolean)
    if (clientIds.length > 0) {
      const testFilters = clientIds.map((id) => `client_id.eq.${queryValue(id)}`).join(',')
      const tests = await supabaseSelect<{ id: string; client_id?: string; status?: string; expires_at?: string | null }>(
        `tests?select=id,client_id,status,expires_at&or=(${testFilters})&order=created_at.desc&limit=10`
      )
      const activeTest = tests.find((test) => isActiveTestStatus(test.status) && isFuture(test.expires_at))
      if (activeTest) {
        return {
          checked: true,
          kind: 'active_test',
          phone: normalized,
          reason: 'Teste active encontrado pelo telefone.',
          test: { id: activeTest.id, status: activeTest.status, expiresAt: activeTest.expires_at },
        }
      }
    }

    return {
      checked: true,
      kind: 'non_customer',
      phone: normalized,
      reason: clients.length ? 'Telefone existe no CRM, mas sem cliente/teste ativo.' : 'Telefone nao encontrado como cliente/teste ativo.',
    }
  } catch (error) {
    console.warn(`[WELCOME_LOOKUP_FAILED] ${JSON.stringify(sanitizeForLog({
      phone: maskPhone(normalized),
      error: error instanceof Error ? error.message : String(error),
    }))}`)
    return {
      checked: false,
      kind: 'unknown',
      phone: normalized,
      reason: error instanceof Error ? error.message : 'Falha ao consultar cliente/teste.',
    }
  }
}
