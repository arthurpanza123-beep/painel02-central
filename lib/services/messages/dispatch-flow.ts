import { getEvolutionConfig } from '../evolution/config'
import { sendMedia } from '../evolution/send-media'
import { sendText } from '../evolution/send-text'
import { buildFlowMessage, ALLOWED_FLOWS, type FlowKey, type MessageContext } from './templates'

export interface DispatchFlowInput {
  flow: FlowKey
  phone?: string
  context?: MessageContext
}

function safeDispatchContext(context: Record<string, unknown>): Record<string, unknown> {
  const blocked = new Set(['password', 'senha', 'username', 'usuario', 'host', 'dns', 'token', 'apiKey', 'api_key'])
  return Object.fromEntries(Object.entries(context).filter(([key]) => !blocked.has(key)))
}

export async function dispatchFlow(input: DispatchFlowInput) {
  if (!ALLOWED_FLOWS.includes(input.flow)) {
    return { ok: false, code: 'INVALID_FLOW', message: 'Fluxo invalido.', allowed: ALLOWED_FLOWS }
  }

  const config = getEvolutionConfig()
  const context = input.context || {}
  const phone = input.phone || context.phone || (input.flow === 'test_expired' ? config.operatorWhatsapp : '')
  const message = buildFlowMessage(input.flow, context)
  const preview = typeof message === 'string'
    ? message
    : {
        mediaUrl: message.mediaUrl,
        caption: message.caption,
        flow: input.flow,
        app: message.context.app,
      }

  if (!phone) {
    return {
      ok: true,
      dryRun: true,
      code: 'MESSAGE_PREPARED',
      message: 'Mensagem preparada. Nenhum telefone informado para envio.',
      preview,
    }
  }

  if (typeof message !== 'string') {
    const result = await sendMedia({
      phone,
      mediaUrl: message.mediaUrl,
      caption: message.caption,
      type: message.type,
      mimetype: message.mimetype,
      fileName: message.fileName,
      context: message.context,
    })
    return { ...result, preview }
  }

  const result = await sendText({ phone, message, context: safeDispatchContext({ flow: input.flow, ...context }) })
  return { ...result, preview }
}
