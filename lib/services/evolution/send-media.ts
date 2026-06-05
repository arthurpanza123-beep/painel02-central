import { getEvolutionConfig } from './config'
import { sendEvolutionRequest } from './client'
import type { SendMediaInput } from './types'

export async function sendMedia(input: SendMediaInput) {
  const config = getEvolutionConfig()
  const media = input.mediaUrl || input.mediaPath || ''
  return sendEvolutionRequest({
    action: 'send_media',
    endpoint: `/message/sendMedia/${config.instance}`,
    phone: input.phone,
    body: {
      mediatype: input.type || 'image',
      mimetype: input.mimetype || 'image/png',
      caption: input.caption || '',
      media,
      fileName: input.fileName || 'media',
      delay: 1200,
      context: input.context || {},
    },
    config,
  })
}
