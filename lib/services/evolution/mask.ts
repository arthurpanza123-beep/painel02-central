export function maskPhone(value: unknown): string {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length <= 4) return '*'.repeat(digits.length)
  return `${digits.slice(0, 4)}***${digits.slice(-2)}`
}

export function maskToken(value: unknown): string {
  const raw = String(value || '')
  if (!raw) return ''
  if (raw.length <= 8) return '***'
  return `${raw.slice(0, 4)}***${raw.slice(-4)}`
}

export function sanitizeForLog(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(sanitizeForLog)

  const out: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const lower = key.toLowerCase()
    if (lower.includes('key') || lower.includes('token') || lower.includes('secret') || lower.includes('authorization')) {
      out[key] = maskToken(item)
    } else if (lower.includes('phone') || lower.includes('number') || lower.includes('whatsapp')) {
      out[key] = maskPhone(item)
    } else {
      out[key] = sanitizeForLog(item)
    }
  }
  return out
}
