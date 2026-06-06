import { getEvolutionConfig } from './config'
import { sendEvolutionRequest } from './client'
import type { SendPresenceInput } from './types'

export async function sendPresence(input: SendPresenceInput) {
  const baseConfig = getEvolutionConfig()
  const config = { ...baseConfig, dryRun: Boolean(baseConfig.dryRun || !baseConfig.enabled || input.dryRun) }
  return sendEvolutionRequest({
    action: 'send_presence',
    endpoint: `/chat/sendPresence/${config.instance}`,
    phone: input.phone,
    body: {
      presence: input.presence,
      delay: input.delayMs,
      context: input.context || {},
    },
    config,
  })
}
