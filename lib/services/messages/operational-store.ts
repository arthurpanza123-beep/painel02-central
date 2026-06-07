import { maskPhone, sanitizeForLog } from '../evolution/mask'
import { normalizePhone } from '../evolution/normalize-phone'

type JsonRecord = Record<string, unknown>

export type PipelineStage = 'novo_lead' | 'contato' | 'teste_gerado' | 'testando' | 'pagou'

export interface OperationalClient {
  id: string
  name?: string | null
  phone_e164?: string | null
  status?: string | null
  legacy_metadata?: JsonRecord | null
}

export interface WelcomeOperationalHistory {
  checked: boolean
  allowWelcome: boolean
  messageCount: number
  threshold: number
  reasons: string[]
}

export interface WelcomeCancellationCheck {
  cancelled: boolean
  reason?: string
  client?: OperationalClient | null
  metadata?: JsonRecord
}

function config() {
  return {
    url: String(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, ''),
    key: String(process.env.SUPABASE_SERVICE_ROLE_KEY || ''),
  }
}

function enabled() {
  const cfg = config()
  return Boolean(cfg.url && cfg.key)
}

function headers() {
  const cfg = config()
  return {
    apikey: cfg.key,
    Authorization: `Bearer ${cfg.key}`,
    'Content-Type': 'application/json',
  }
}

function queryValue(value: string) {
  return encodeURIComponent(value)
}

function safeMetadata(value: JsonRecord): JsonRecord {
  return JSON.parse(JSON.stringify(sanitizeForLog(value))) as JsonRecord
}

function metadataOf(client?: OperationalClient | null): JsonRecord {
  const metadata = client?.legacy_metadata
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {}
}

export function metadataString(metadata: JsonRecord, key: string): string {
  const value = metadata[key]
  return typeof value === 'string' ? value : ''
}

export function isRecentIso(value: unknown, windowMs: number, now = Date.now()) {
  const text = String(value || '')
  if (!text) return false
  const time = new Date(text).getTime()
  return Number.isFinite(time) && now - time < windowMs
}

function numberFromMetadata(metadata: JsonRecord, key: string): number {
  const value = Number(metadata[key])
  return Number.isFinite(value) ? value : 0
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const cfg = config()
  if (!cfg.url || !cfg.key) throw new Error('Supabase server env ausente.')
  const response = await fetch(`${cfg.url}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers || {}) },
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Supabase HTTP ${response.status}: ${text.slice(0, 240)}`)
  }
  if (response.status === 204) return null as T
  const payload = await response.json().catch(() => null)
  return payload as T
}

export async function findClientByPhone(phone: string): Promise<OperationalClient | null> {
  if (!enabled()) return null
  const normalized = normalizePhone(phone)
  if (!normalized) return null
  const rows = await request<OperationalClient[]>(
    `clients?select=id,name,phone_e164,status,legacy_metadata,created_at&phone_e164=eq.${queryValue(normalized)}&order=created_at.desc&limit=1`
  )
  return rows[0] || null
}

export async function findClientById(id: string): Promise<OperationalClient | null> {
  if (!enabled() || !id) return null
  const rows = await request<OperationalClient[]>(
    `clients?select=id,name,phone_e164,status,legacy_metadata,created_at&id=eq.${queryValue(id)}&limit=1`
  )
  return rows[0] || null
}

async function listOperationalRows(path: string): Promise<Array<Record<string, unknown>>> {
  return request<Array<Record<string, unknown>>>(path).catch(() => {
    throw new Error('Falha ao consultar historico operacional.')
  })
}

export async function inspectWelcomeOperationalHistory(input: {
  phone: string
  client: OperationalClient | null
  metadata?: JsonRecord
  windowMs: number
  threshold: number
}): Promise<WelcomeOperationalHistory> {
  if (!enabled()) {
    return {
      checked: false,
      allowWelcome: false,
      messageCount: 0,
      threshold: input.threshold,
      reasons: ['Supabase server env ausente.'],
    }
  }

  const normalized = normalizePhone(input.phone)
  if (!normalized || !input.client?.id) {
    return {
      checked: false,
      allowWelcome: false,
      messageCount: 0,
      threshold: input.threshold,
      reasons: ['Cliente operacional nao encontrado para consulta persistente.'],
    }
  }

  const metadata = {
    ...metadataOf(input.client),
    ...(input.metadata || {}),
  }
  const status = String(input.client.status || metadata.status || metadata.client_status || '').toLowerCase()
  const reasons: string[] = []
  if (['active', 'test_active', 'paid', 'cliente_active'].includes(status)) {
    reasons.push(`status_${status}`)
  }
  if (String(metadata.customer_status || metadata.test_status || '').toLowerCase().includes('active')) {
    reasons.push('metadata_active_status')
  }
  if (isRecentIso(metadata.welcome_sent_at, input.windowMs) || isRecentIso(metadata.welcome_started_at, input.windowMs)) {
    reasons.push('welcome_recent_24h')
  }
  if (isRecentIso(metadata.install_sent_at, input.windowMs)) {
    reasons.push('install_recent_24h')
  }
  const activeFlowType = metadataString(metadata, 'active_flow_type')
  if (activeFlowType) {
    reasons.push(`active_flow_${activeFlowType}`)
  }
  const welcomeFlowStatus = metadataString(metadata, 'welcome_flow_status')
  if (welcomeFlowStatus === 'running') {
    reasons.push('welcome_flow_running')
  }

  const cutoffIso = new Date(Date.now() - input.windowMs).toISOString()
  const [logs, pipelineEvents] = await Promise.all([
    listOperationalRows(`logs?select=id,event,created_at&client_id=eq.${queryValue(input.client.id)}&created_at=gte.${queryValue(cutoffIso)}&order=created_at.desc&limit=30`),
    listOperationalRows(`pipeline_events?select=id,event_type,created_at&entity_id=eq.${queryValue(input.client.id)}&created_at=gte.${queryValue(cutoffIso)}&order=created_at.desc&limit=30`),
  ])

  const metadataCount = Math.max(
    numberFromMetadata(metadata, 'inbound_message_count'),
    numberFromMetadata(metadata, 'message_count'),
    numberFromMetadata(metadata, 'conversation_message_count')
  )
  const messageCount = Math.max(metadataCount, logs.length + pipelineEvents.length)
  if (messageCount >= input.threshold) {
    reasons.push('recent_history_threshold')
  }

  return {
    checked: true,
    allowWelcome: reasons.length === 0,
    messageCount,
    threshold: input.threshold,
    reasons,
  }
}

export async function inspectWelcomeCancellation(input: {
  client: OperationalClient | null
  phone: string
  startedAt?: string
  messageId?: string
}): Promise<WelcomeCancellationCheck> {
  if (!enabled()) return { cancelled: false, client: input.client, metadata: metadataOf(input.client) }

  const latest = input.client?.id
    ? await findClientById(input.client.id).catch(() => input.client)
    : await findClientByPhone(input.phone).catch(() => input.client)
  const metadata = metadataOf(latest || input.client)
  const status = String(latest?.status || input.client?.status || '').toLowerCase()
  const startedMs = new Date(input.startedAt || metadataString(metadata, 'welcome_flow_started_at') || metadataString(metadata, 'welcome_started_at') || 0).getTime()

  const happenedAfterStart = (value: unknown) => {
    const time = new Date(String(value || '')).getTime()
    if (!Number.isFinite(time)) return false
    return !Number.isFinite(startedMs) || startedMs <= 0 || time >= startedMs
  }

  if (status === 'active' || status === 'test_active') {
    return { cancelled: true, reason: `status_${status}`, client: latest || input.client, metadata }
  }
  if (metadataString(metadata, 'welcome_flow_status') === 'cancelled') {
    return { cancelled: true, reason: metadataString(metadata, 'welcome_cancel_reason') || 'welcome_cancelled', client: latest || input.client, metadata }
  }
  if (metadataString(metadata, 'active_flow_type') === 'install') {
    return { cancelled: true, reason: 'active_flow_install', client: latest || input.client, metadata }
  }
  if (metadata.install_sent_at && happenedAfterStart(metadata.install_sent_at)) {
    return { cancelled: true, reason: 'install_sent', client: latest || input.client, metadata }
  }
  if (metadata.last_device_intent_at && happenedAfterStart(metadata.last_device_intent_at)) {
    return { cancelled: true, reason: 'device_intent_received', client: latest || input.client, metadata }
  }
  if (input.messageId && metadataString(metadata, 'last_inbound_message_id') && metadataString(metadata, 'last_inbound_message_id') !== input.messageId && metadata.last_inbound_at && happenedAfterStart(metadata.last_inbound_at)) {
    return { cancelled: true, reason: 'new_inbound_received', client: latest || input.client, metadata }
  }

  return { cancelled: false, client: latest || input.client, metadata }
}

export async function ensureInboundLead(input: {
  phone: string
  name?: string
  text?: string
  messageId?: string
  event?: string
}): Promise<{ client: OperationalClient | null; duplicate: boolean; metadata: JsonRecord }> {
  const normalized = normalizePhone(input.phone)
  if (!enabled() || !normalized) return { client: null, duplicate: false, metadata: {} }

  const now = new Date().toISOString()
  const existing = await findClientByPhone(normalized)
  const previousMetadata = metadataOf(existing)
  const duplicate = Boolean(input.messageId && metadataString(previousMetadata, 'last_inbound_message_id') === input.messageId)
  const previousInboundCount = numberFromMetadata(previousMetadata, 'inbound_message_count')
  const nextMetadata = {
    ...previousMetadata,
    last_inbound_message_id: input.messageId || metadataString(previousMetadata, 'last_inbound_message_id') || undefined,
    last_inbound_at: now,
    last_inbound_text: String(input.text || '').slice(0, 500),
    last_inbound_event: input.event || null,
    inbound_message_count: previousInboundCount + (duplicate ? 0 : 1),
    inbound_source: 'painel2_evolution_webhook',
  }

  if (existing) {
    const update: JsonRecord = {
      legacy_metadata: safeMetadata(nextMetadata),
      updated_at: now,
    }
    if (!existing.name && input.name) update.name = input.name
    await request<OperationalClient[]>(
      `clients?id=eq.${queryValue(existing.id)}&select=id,name,phone_e164,status,legacy_metadata`,
      { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(update) }
    )
    return { client: { ...existing, name: existing.name || input.name || existing.name, legacy_metadata: nextMetadata }, duplicate, metadata: nextMetadata }
  }

  const inserted = await request<OperationalClient[]>(
    'clients?select=id,name,phone_e164,status,legacy_metadata',
    {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        name: input.name || `Lead ${maskPhone(normalized)}`,
        phone_e164: normalized,
        phone_raw: input.phone,
        status: 'lead',
        source: 'whatsapp_inbound',
        legacy_metadata: safeMetadata({
          ...nextMetadata,
          lead_created_at: now,
        }),
        created_at: now,
        updated_at: now,
      }),
    }
  )
  const client = inserted[0] || null
  return { client, duplicate: false, metadata: metadataOf(client) }
}

export async function updateClientOperationalState(input: {
  client: OperationalClient | null
  metadataPatch?: JsonRecord
  status?: string
}): Promise<OperationalClient | null> {
  if (!enabled() || !input.client?.id) return input.client || null
  const now = new Date().toISOString()
  const latest = await findClientById(input.client.id).catch(() => input.client)
  const metadata = {
    ...metadataOf(latest || input.client),
    ...(input.metadataPatch || {}),
  }
  const patch: JsonRecord = {
    legacy_metadata: safeMetadata(metadata),
    updated_at: now,
  }
  if (input.status && (latest || input.client).status !== 'active') patch.status = input.status
  const rows = await request<OperationalClient[]>(
    `clients?id=eq.${queryValue(input.client.id)}&select=id,name,phone_e164,status,legacy_metadata`,
    { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(patch) }
  )
  return rows[0] || { ...(latest || input.client), legacy_metadata: metadata }
}

export async function cancelWelcomeFlow(input: {
  client: OperationalClient | null
  phone: string
  reason: string
  messageId?: string
  device?: string
}): Promise<OperationalClient | null> {
  const now = new Date().toISOString()
  return updateClientOperationalState({
    client: input.client,
    status: 'lead',
    metadataPatch: {
      welcome_flow_status: 'cancelled',
      welcome_flow_cancelled_at: now,
      welcome_cancel_reason: input.reason,
      active_flow_type: 'install',
      last_device_intent_at: now,
      last_device_intent_message_id: input.messageId || undefined,
      last_device_intent_device: input.device || undefined,
    },
  })
}

export async function writeOperationalLog(event: string, level: 'info' | 'warning' | 'error' | 'success', payload: {
  client?: OperationalClient | null
  phone?: string
  message: string
  metadata?: JsonRecord
}) {
  if (!enabled()) return
  await request('logs', {
    method: 'POST',
    body: JSON.stringify({
      scope: 'painel2_inbound',
      level,
      event,
      client_id: payload.client?.id || null,
      message: payload.message.slice(0, 800),
      metadata: safeMetadata({
        phone: payload.phone ? maskPhone(payload.phone) : undefined,
        ...(payload.metadata || {}),
      }),
    }),
  })
}

export async function writePipelineEvent(eventType: string, input: {
  client: OperationalClient | null
  stage?: PipelineStage
  fromStatus?: string | null
  payload?: JsonRecord
}) {
  if (!enabled() || !input.client?.id) return
  await request('pipeline_events', {
    method: 'POST',
    body: JSON.stringify({
      entity_type: 'client',
      entity_id: input.client.id,
      event_type: eventType,
      from_status: input.fromStatus || null,
      to_status: input.stage || null,
      operator_ref: 'painel2_inbound',
      payload: safeMetadata({
        client_id: input.client.id,
        phone: input.client.phone_e164 ? maskPhone(input.client.phone_e164) : undefined,
        stage: input.stage || null,
        ...(input.payload || {}),
      }),
    }),
  })
}

export async function recordOperationalEvent(eventType: string, level: 'info' | 'warning' | 'error' | 'success', input: {
  client?: OperationalClient | null
  phone?: string
  stage?: PipelineStage
  message: string
  metadata?: JsonRecord
}) {
  try {
    await writeOperationalLog(eventType, level, {
      client: input.client || null,
      phone: input.phone,
      message: input.message,
      metadata: input.metadata,
    })
    await writePipelineEvent(eventType, {
      client: input.client || null,
      stage: input.stage,
      payload: input.metadata,
    })
  } catch (error) {
    console.warn(`[OPERATIONAL_EVENT_WRITE_FAILED] ${JSON.stringify(sanitizeForLog({
      eventType,
      phone: input.phone ? maskPhone(input.phone) : undefined,
      error: error instanceof Error ? error.message : String(error),
    }))}`)
  }
}
