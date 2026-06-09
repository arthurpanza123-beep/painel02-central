import { getEvolutionConfig } from './config'
import { sendEvolutionRequest } from './client'
import type { SendAudioInput } from './types'

export async function sendAudio(input: SendAudioInput) {
  const baseConfig = getEvolutionConfig()
  const config = { ...baseConfig, instance: input.instance || baseConfig.instance, dryRun: Boolean(baseConfig.dryRun || !baseConfig.enabled || input.dryRun) }
  const audio = input.audioUrl || input.audioPath || ''
  return sendEvolutionRequest({
    action: 'send_audio',
    endpoint: `/message/sendWhatsAppAudio/${config.instance}`,
    phone: input.phone,
    body: {
      audio,
      delay: 1200,
      linkPreview: false,
      context: input.context || {},
    },
    config,
  })
}
