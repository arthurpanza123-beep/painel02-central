export function normalizePhone(value: unknown): string {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 15) return ''
  if (digits.startsWith('55')) return digits
  return `55${digits}`
}

export function buildPhoneCandidates(value: unknown): string[] {
  const normalized = normalizePhone(value)
  if (!normalized) return []
  const candidates: string[] = []
  const add = (candidate: string) => {
    const clean = candidate.replace(/\D/g, '')
    if (clean && !candidates.includes(clean)) candidates.push(clean)
  }

  add(normalized)

  if (normalized.startsWith('55') && normalized.length === 12) {
    add(`55${normalized.slice(2, 4)}9${normalized.slice(4)}`)
  }

  if (normalized.startsWith('55') && normalized.length === 13 && normalized.slice(4, 5) === '9') {
    add(`55${normalized.slice(2, 4)}${normalized.slice(5)}`)
  }

  return candidates
}
