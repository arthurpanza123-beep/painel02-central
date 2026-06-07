import { sendPresence } from '../evolution/send-presence'
import type { EvolutionSendResult, PresenceType } from '../evolution/types'

export interface HumanizedDeliveryResult {
  ok: boolean
  dryRun: boolean
  presence: PresenceType
  delayMs: number
  cancelled?: boolean
  cancelReason?: string
  presenceResult?: EvolutionSendResult
  presenceError?: string
}

function numberEnv(name: string, fallback: number): number {
  const parsed = Number(process.env[name])
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback
}

function delayRange() {
  const min = numberEnv('WELCOME_HUMAN_DELAY_MIN_MS', 5000)
  const max = numberEnv('WELCOME_HUMAN_DELAY_MAX_MS', 15000)
  return min <= max ? { min, max } : { min: max, max: min }
}

function randomDelayMs() {
  const { min, max } = delayRange()
  if (max <= min) return min
  return Math.floor(min + Math.random() * (max - min + 1))
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function cancellationReason(check?: () => Promise<string | false> | string | false): Promise<string | false> {
  if (!check) return false
  return check()
}

async function sleepInterruptibly(ms: number, check?: () => Promise<string | false> | string | false): Promise<string | false> {
  const stepMs = 1000
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    const reason = await cancellationReason(check)
    if (reason) return reason
    await sleep(Math.min(stepMs, Math.max(0, deadline - Date.now())))
  }
  return cancellationReason(check)
}

export async function waitHumanizedDelivery(input: {
  phone: string
  presence: PresenceType
  dryRun: boolean
  context?: Record<string, unknown>
  shouldContinue?: () => Promise<string | false> | string | false
}): Promise<HumanizedDeliveryResult> {
  const delayMs = randomDelayMs()
  const beforeReason = await cancellationReason(input.shouldContinue)
  if (beforeReason) {
    return { ok: false, dryRun: input.dryRun, presence: input.presence, delayMs, cancelled: true, cancelReason: beforeReason }
  }
  if (input.dryRun || delayMs <= 0) {
    return { ok: true, dryRun: input.dryRun, presence: input.presence, delayMs }
  }

  const presenceResult = await sendPresence({
    phone: input.phone,
    presence: input.presence,
    delayMs,
    context: input.context,
  }).catch((error) => ({
    ok: false,
    dryRun: false,
    code: 'PRESENCE_FAILED',
    message: error instanceof Error ? error.message : String(error),
    logs: [],
  } as EvolutionSendResult))

  const cancelReason = await sleepInterruptibly(delayMs, input.shouldContinue)
  if (cancelReason) {
    return {
      ok: false,
      dryRun: false,
      presence: input.presence,
      delayMs,
      cancelled: true,
      cancelReason,
      presenceResult,
      presenceError: presenceResult.ok ? undefined : presenceResult.message,
    }
  }

  return {
    ok: presenceResult.ok,
    dryRun: false,
    presence: input.presence,
    delayMs,
    presenceResult,
    presenceError: presenceResult.ok ? undefined : presenceResult.message,
  }
}
