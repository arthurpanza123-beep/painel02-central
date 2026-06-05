import { getEvolutionConfig } from './config'
import { sendEvolutionRequest } from './client'
import type { SendStickerInput } from './types'

export async function sendSticker(input: SendStickerInput) {
  const baseConfig = getEvolutionConfig()
  const config = { ...baseConfig, dryRun: Boolean(baseConfig.dryRun || !baseConfig.enabled || input.dryRun) }
  const sticker = input.stickerUrl || input.stickerPath || ''
  return sendEvolutionRequest({
    action: 'send_sticker',
    endpoint: `/message/sendSticker/${config.instance}`,
    phone: input.phone,
    body: {
      sticker,
      media: sticker,
      delay: 1200,
      context: input.context || {},
    },
    config,
  })
}
