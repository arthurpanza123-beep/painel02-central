import { sendPresence } from '../evolution/send-presence'
import type { EvolutionSendResult, PresenceType } from '../evolution/types'

export interface HumanizedDeliveryResult {
  ok: boolean
  dryRun: boolean
  presence: PresenceType
  delayMs: number
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

export async function waitHumanizedDelivery(input: {
  phone: string
  presence: PresenceType
  dryRun: boolean
  context?: Record<string, unknown>
}): Promise<HumanizedDeliveryResult> {
  const delayMs = randomDelayMs()
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

  await sleep(delayMs)

  return {
    ok: presenceResult.ok,
    dryRun: false,
    presence: input.presence,
    delayMs,
    presenceResult,
    presenceError: presenceResult.ok ? undefined : presenceResult.message,
  }
}
