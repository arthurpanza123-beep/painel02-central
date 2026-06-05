import { getEvolutionConfig } from './config'
import { sendEvolutionRequest } from './client'
import type { SendTextInput } from './types'

export async function sendText(input: SendTextInput) {
  const config = getEvolutionConfig()
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
