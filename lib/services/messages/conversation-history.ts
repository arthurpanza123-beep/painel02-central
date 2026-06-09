import { getEvolutionConfig } from '../evolution/config'
import { normalizePhone } from '../evolution/normalize-phone'

export interface EvolutionConversationHistory {
  checked: boolean
  allowWelcome: boolean
  messageCount: number
  previousMessageCount: number
  previousInboundCount: number
  outboundCount: number
  threshold: number
  activeContext: boolean
  reasons: string[]
}

export function inboundWelcomeHistoryThreshold(): number {
  const parsed = Number(process.env.INBOUND_WELCOME_MIN_HISTORY_BLOCK_COUNT || process.env.WELCOME_HISTORY_MESSAGE_THRESHOLD || 5)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5
}

export function inboundWelcomeHistoryWindowMs(): number {
  const hours = Number(process.env.WELCOME_HISTORY_WINDOW_HOURS || 72)
  return (Number.isFinite(hours) && hours > 0 ? hours : 72) * 60 * 60 * 1000
}

function extractMessages(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []
  const record = payload as Record<string, unknown>
  for (const key of ['messages', 'data', 'records', 'items']) {
    const value = record[key]
    if (Array.isArray(value)) return value
    if (value && typeof value === 'object' && Array.isArray((value as Record<string, unknown>).messages)) {
      return (value as Record<string, unknown>).messages as unknown[]
    }
  }
  return []
}

function nestedRecord(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = record[key]
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function messageIdOf(message: unknown): string {
  if (!message || typeof message !== 'object') return ''
  const record = message as Record<string, unknown>
  const key = nestedRecord(record, 'key')
  return String(key.id || record.id || record.messageId || record.message_id || '')
}

function isFromMe(message: unknown): boolean {
  if (!message || typeof message !== 'object') return false
  const record = message as Record<string, unknown>
  const key = nestedRecord(record, 'key')
  return Boolean(key.fromMe || record.fromMe || record.from_me)
}

function messageTimestamp(message: unknown): number {
  if (!message || typeof message !== 'object') return 0
  const record = message as Record<string, unknown>
  const raw = record.messageTimestamp || record.timestamp || record.createdAt || record.created_at
  if (typeof raw === 'number') return raw < 10_000_000_000 ? raw * 1000 : raw
  if (typeof raw === 'string') {
    const parsed = new Date(raw).getTime()
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}

function hasActiveCustomerContext(messages: unknown[]): boolean {
  const joined = messages.map((message) => JSON.stringify(message).toLowerCase()).join('\n')
  return /renova|renovacao|renova[cç][aã]o|pagou|pagamento|cliente ativo|vencimento|suporte|login|senha|reload|recarregar|instala[cç][aã]o|aplicativo/.test(joined)
}

export async function inspectEvolutionConversationHistory(input: {
  phone: string
  messageId?: string
  threshold?: number
  windowMs?: number
}): Promise<EvolutionConversationHistory> {
  const config = getEvolutionConfig()
  const normalized = normalizePhone(input.phone)
  const threshold = input.threshold || inboundWelcomeHistoryThreshold()
  if (!normalized || !config.apiUrl || !config.apiKey || !config.instance) {
    return {
      checked: false,
      allowWelcome: false,
      messageCount: 0,
      previousMessageCount: 0,
      previousInboundCount: 0,
      outboundCount: 0,
      threshold,
      activeContext: false,
      reasons: ['Historico indisponivel: Evolution incompleta.'],
    }
  }

  const remoteJid = `${normalized}@s.whatsapp.net`
  const response = await fetch(`${config.apiUrl.replace(/\/+$/, '')}/chat/findMessages/${config.instance}`, {
    method: 'POST',
    headers: { apikey: config.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      where: { key: { remoteJid } },
      limit: Math.max(20, threshold + 1),
    }),
  })
  if (!response.ok) {
    return {
      checked: false,
      allowWelcome: false,
      messageCount: 0,
      previousMessageCount: 0,
      previousInboundCount: 0,
      outboundCount: 0,
      threshold,
      activeContext: false,
      reasons: [`Historico indisponivel: Evolution HTTP ${response.status}.`],
    }
  }

  const payload = await response.json().catch(() => null)
  const cutoff = Date.now() - (input.windowMs || inboundWelcomeHistoryWindowMs())
  const recent = extractMessages(payload).filter((message) => {
    const ts = messageTimestamp(message)
    return !ts || ts >= cutoff
  })
  const currentMessageId = String(input.messageId || '')
  const previous = currentMessageId
    ? recent.filter((message) => messageIdOf(message) !== currentMessageId)
    : recent.slice(0, Math.max(0, recent.length - 1))
  const outboundCount = previous.filter(isFromMe).length
  const previousInboundCount = previous.filter((message) => !isFromMe(message)).length
  const activeContext = hasActiveCustomerContext(recent)
  const reasons: string[] = []

  if (recent.length >= threshold) reasons.push('recent_history_threshold')
  if (previousInboundCount > 0) reasons.push('previous_inbound_history')
  if (outboundCount > 0) reasons.push('previous_outbound_history')
  if (activeContext) reasons.push('active_customer_context')

  return {
    checked: true,
    allowWelcome: reasons.length === 0,
    messageCount: recent.length,
    previousMessageCount: previous.length,
    previousInboundCount,
    outboundCount,
    threshold,
    activeContext,
    reasons,
  }
}
