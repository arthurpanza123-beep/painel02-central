import { getEvolutionConfig } from './config'
import { sendEvolutionRequest } from './client'
import type { SendTextInput } from './types'

export async function sendText(input: SendTextInput) {
  const baseConfig = getEvolutionConfig()
  const config = { ...baseConfig, instance: input.instance || baseConfig.instance, dryRun: Boolean(baseConfig.dryRun || !baseConfig.enabled || input.dryRun) }
  return sendEvolutionRequest({
    action: 'send_text',
    endpoint: `/message/sendText/${config.instance}`,
    phone: input.phone,
    body: {
      text: input.message,
      delay: 1200,
      linkPreview: false,
      context: input.context || {},
    },
    config,
  })
}
