import { buildPhoneCandidates, normalizePhone } from './normalize-phone'
import { maskPhone, sanitizeForLog } from './mask'
import { getEvolutionConfig, isEvolutionConfigured } from './config'
import type { EvolutionConfig, EvolutionLogEntry, EvolutionSendResult } from './types'

interface RequestOptions {
  endpoint: string
  body: Record<string, unknown>
  phone?: string
  action: string
  config?: EvolutionConfig
}

function log(level: EvolutionLogEntry['level'], code: string, message: string, metadata?: Record<string, unknown>): EvolutionLogEntry {
  return { level, code, message, metadata: sanitizeForLog(metadata) as Record<string, unknown> | undefined }
}

function isRetryable(err: unknown): boolean {
  const status = Number((err as { status?: number } | null)?.status)
  const message = String((err as Error | null)?.message || err || '').toLowerCase()
  if ([408, 425, 429, 500, 502, 503, 504].includes(status)) return true
  return ['timeout', 'aborted', 'connection closed', 'socket hang up', 'econnreset', 'etimedout', 'fetch failed', 'terminated'].some((term) => message.includes(term))
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      const timeoutErr = new Error(`Evolution timeout after ${timeoutMs}ms`) as Error & { status?: number; code?: string }
      timeoutErr.status = 408
      timeoutErr.code = 'ETIMEDOUT'
      throw timeoutErr
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text.slice(0, 500)
  }
}

export async function sendEvolutionRequest(options: RequestOptions): Promise<EvolutionSendResult> {
  const config = options.config || getEvolutionConfig()
  const logs: EvolutionLogEntry[] = []
  const normalized = options.phone ? normalizePhone(options.phone) : ''
  if (options.phone && !normalized) {
    return { ok: false, dryRun: true, code: 'INVALID_PHONE', message: 'Telefone invalido.', logs: [log('warn', 'INVALID_PHONE', 'Telefone rejeitado.', { phone: options.phone })] }
  }

  const requestBody = normalized ? { ...options.body, number: normalized } : options.body
  logs.push(log('info', 'EVOLUTION_REQUEST_PREPARED', `${options.action} preparado.`, { endpoint: options.endpoint, phone: normalized }))

  if (!config.enabled || config.dryRun) {
    logs.push(log('info', 'EVOLUTION_DRY_RUN', 'Envio real bloqueado por feature flag.', { enabled: config.enabled, dryRun: config.dryRun }))
    return {
      ok: true,
      dryRun: true,
      code: 'DRY_RUN',
      message: 'Dry-run: nenhuma mensagem real foi enviada.',
      phone: normalized ? maskPhone(normalized) : undefined,
      request: { endpoint: options.endpoint, body: sanitizeForLog(requestBody) as Record<string, unknown> },
      logs,
    }
  }

  if (!isEvolutionConfigured(config)) {
    logs.push(log('error', 'EVOLUTION_NOT_CONFIGURED', 'Configuracao Evolution incompleta.'))
    return { ok: false, dryRun: false, code: 'EVOLUTION_NOT_CONFIGURED', message: 'Configure EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE.', logs }
  }

  const url = `${config.apiUrl}${options.endpoint}`
  const candidates = normalized ? buildPhoneCandidates(normalized) : ['']
  let lastError: unknown = null

  for (const candidate of candidates) {
    const candidateBody = candidate ? { ...options.body, number: candidate } : options.body
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetchWithTimeout(url, {
          method: 'POST',
          headers: {
            apikey: config.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(candidateBody),
        }, config.timeoutMs)
        const responseBody = await parseResponse(response)
        if (response.ok) {
          logs.push(log('info', 'EVOLUTION_SENT', 'Evolution retornou sucesso.', { status: response.status, phone: candidate }))
          return { ok: true, dryRun: false, status: response.status, code: 'SENT', message: 'Mensagem enviada pela Evolution.', phone: maskPhone(candidate), response: sanitizeForLog(responseBody), logs }
        }

        const err = new Error(`Evolution HTTP ${response.status}`) as Error & { status?: number; response?: unknown }
        err.status = response.status
        err.response = responseBody
        throw err
      } catch (err) {
        lastError = err
        logs.push(log('warn', 'EVOLUTION_ATTEMPT_FAILED', `Tentativa ${attempt} falhou.`, { phone: candidate, error: (err as Error).message }))
        if (!isRetryable(err) || attempt === 3) break
        await new Promise((resolve) => setTimeout(resolve, 750 * attempt))
      }
    }
  }

  logs.push(log('error', 'EVOLUTION_FAILED', 'Evolution falhou apos tentativas.', { error: (lastError as Error | null)?.message }))
  return { ok: false, dryRun: false, code: 'EVOLUTION_FAILED', message: (lastError as Error | null)?.message || 'Falha ao enviar pela Evolution.', logs }
}
