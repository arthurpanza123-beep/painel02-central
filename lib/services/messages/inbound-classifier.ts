import { maskPhone, sanitizeForLog } from '../evolution/mask'
import { buildPhoneCandidates, normalizePhone } from '../evolution/normalize-phone'

type CustomerKind = 'active_client' | 'active_test' | 'non_customer' | 'unknown'

export interface CustomerLookupResult {
  checked: boolean
  kind: CustomerKind
  phone: string
  reason: string
  client?: { id: string; name?: string; status?: string }
  test?: { id: string; status?: string; expiresAt?: string | null }
}

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

function isActiveTestStatus(status: unknown) {
  return String(status || '').toLowerCase() === 'active'
}

function isFuture(value: unknown) {
  const text = String(value || '')
  if (!text) return true
  const time = new Date(text).getTime()
  return Number.isNaN(time) || time > Date.now()
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

