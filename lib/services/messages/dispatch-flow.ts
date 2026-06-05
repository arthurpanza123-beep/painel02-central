import { getEvolutionConfig } from '../evolution/config'
import { sendText } from '../evolution/send-text'
import { buildFlowMessage, ALLOWED_FLOWS, type FlowKey, type MessageContext } from './templates'

export interface DispatchFlowInput {
  flow: FlowKey
  phone?: string
  context?: MessageContext
}

export async function dispatchFlow(input: DispatchFlowInput) {
  if (!ALLOWED_FLOWS.includes(input.flow)) {
    return { ok: false, code: 'INVALID_FLOW', message: 'Fluxo invalido.', allowed: ALLOWED_FLOWS }
  }

  const config = getEvolutionConfig()
  const context = input.context || {}
  const phone = input.phone || context.phone || (input.flow === 'test_expired' ? config.operatorWhatsapp : '')
  const message = buildFlowMessage(input.flow, context)

  if (!phone) {
    return {
      ok: true,
      dryRun: true,
      code: 'MESSAGE_PREPARED',
      message: 'Mensagem preparada. Nenhum telefone informado para envio.',
      preview: message,
    }
  }

  const result = await sendText({ phone, message, context: { flow: input.flow, ...context } })
  return { ...result, preview: message }
}
