import { normalizePhone } from '../evolution/normalize-phone'

function boolEnv(value: string | undefined) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase())
}

function listEnv(value: string | undefined) {
  return String(value || '').split(',').map((item) => normalizePhone(item)).filter(Boolean)
}

export function prospectionRecipientConfig() {
  return {
    instance: String(process.env.PROSPECTION_EVOLUTION_INSTANCE || process.env.EVOLUTION_PROSPECTION_INSTANCE || 'centralplay-leads').trim(),
    connectedPhone: normalizePhone(process.env.PROSPECTION_CONNECTED_INSTANCE_PHONE || ''),
    allowedPhones: Array.from(new Set([
      ...listEnv(process.env.PROSPECTION_REAL_ALLOWED_RECIPIENTS),
      ...listEnv(process.env.PROSPECTION_REAL_ALLOWED_PHONES),
      ...listEnv(process.env.OPERATOR_WHATSAPP_LIST),
      normalizePhone(process.env.OPERATOR_WHATSAPP || ''),
    ].filter(Boolean))),
    allowImportedRealRecipients: boolEnv(process.env.PROSPECTION_ALLOW_IMPORTED_REAL_RECIPIENTS),
    dryRun: boolEnv(process.env.PANEL2_DRY_RUN_FOR_PROSPECTION),
    prospectionApiBaseUrl: String(process.env.PROSPECTION_API_BASE_URL || 'http://127.0.0.1:3003').replace(/\/+$/, ''),
  }
}

export async function authorizeProspectionRecipient(phone: string, flow: 'welcome' | 'install') {
  const config = prospectionRecipientConfig()
  const normalized = normalizePhone(phone)
  if (!normalized) return { allowed: false, code: 'PHONE_REQUIRED', reason: 'Telefone invalido.' }
  if (config.connectedPhone && normalized === config.connectedPhone) {
    return { allowed: false, code: 'PANEL2_BLOCKED_SELF_TARGET', reason: 'Destino e o numero conectado da prospeccao.' }
  }
  if (config.allowedPhones.includes(normalized)) {
    return { allowed: true, code: 'PANEL2_RECIPIENT_ALLOWLISTED', reason: 'Telefone na allowlist fixa.' }
  }
  if (!config.allowImportedRealRecipients) {
    return { allowed: false, code: 'PANEL2_BLOCKED_NOT_ALLOWLISTED', reason: 'Destino fora da allowlist fixa.' }
  }
  try {
    const response = await fetch(`${config.prospectionApiBaseUrl}/api/prospection/recipients/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: normalized, flow, source: 'prospection' }),
    })
    const payload = await response.json().catch(() => null) as { allowed?: boolean; code?: string; reason?: string } | null
    return {
      allowed: Boolean(response.ok && payload?.allowed),
      code: payload?.code || (response.ok ? 'PROSPECTION_RECIPIENT_AUTHORIZED' : 'PANEL2_PROSPECTION_AUTH_FAILED'),
      reason: payload?.reason || null,
    }
  } catch (error) {
    return {
      allowed: false,
      code: 'PANEL2_PROSPECTION_AUTH_UNAVAILABLE',
      reason: error instanceof Error ? error.message : String(error),
    }
  }
}
