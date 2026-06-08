import { getEvolutionConfig } from '../evolution/config'
import { normalizePhone } from '../evolution/normalize-phone'
import { sendMedia } from '../evolution/send-media'
import { sendSticker } from '../evolution/send-sticker'
import { sendText } from '../evolution/send-text'
import { findClientByPhone, recordOperationalEvent, type PipelineStage } from './operational-store'
import { buildFlowMessage, validateFlowContext, ALLOWED_FLOWS, type FlowKey, type FlowMessage, type FlowMessagePart, type MessageContext } from './templates'

export interface DispatchFlowInput {
  flow: FlowKey
  phone?: string
  context?: MessageContext
  idempotency_key?: string
  dryRun?: boolean
  trusted?: boolean
}

const dispatchIdempotency = new Map<string, { sentAt: number; result: Record<string, unknown> }>()
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000

function safeDispatchContext(context: Record<string, unknown>): Record<string, unknown> {
  const blocked = new Set(['password', 'senha', 'username', 'usuario', 'host', 'dns', 'token', 'apiKey', 'api_key'])
  return Object.fromEntries(Object.entries(context).filter(([key]) => !blocked.has(key)))
}

function previewPart(flow: FlowKey, message: FlowMessagePart) {
  return typeof message === 'string'
    ? message
    : {
        mediaUrl: message.mediaUrl,
        caption: message.caption,
        flow,
        app: message.context.app,
        type: message.type,
        fileName: message.fileName,
        mediaKind: message.context.mediaKind,
        fallbackText: message.fallbackText,
      }
}

function previewMessage(flow: FlowKey, message: FlowMessage) {
  return Array.isArray(message)
    ? message.map((part) => previewPart(flow, part))
    : previewPart(flow, message)
}

async function sendMessagePart(input: {
  flow: FlowKey
  phone: string
  part: FlowMessagePart
  dryRun: boolean
  context: MessageContext
}) {
  const { flow, phone, part, dryRun, context } = input

  if (typeof part === 'string') {
    return sendText({ phone, message: part, dryRun, context: safeDispatchContext({ flow, ...context }) })
  }

  const result = part.type === 'sticker'
    ? await sendSticker({
        phone,
        stickerUrl: part.mediaUrl,
        dryRun,
        context: part.context,
      })
    : await sendMedia({
        phone,
        mediaUrl: part.mediaUrl,
        caption: part.caption,
        type: part.type,
        mimetype: part.mimetype,
        fileName: part.fileName,
        dryRun,
        context: part.context,
      })

  if (flow === 'test_expired' && part.type === 'sticker') {
    console.log(`[${result.ok ? 'TEST_EXPIRED_STICKER_SENT' : 'TEST_EXPIRED_STICKER_FAILED'}] ${JSON.stringify({ ok: result.ok, dryRun: result.dryRun, code: result.code, phone: result.phone })}`)
  }

  if (!result.ok && !result.dryRun && part.fallbackText) {
    const fallback = await sendText({
      phone,
      message: part.fallbackText,
      dryRun,
      context: safeDispatchContext({ flow, fallbackFrom: part.type, ...context }),
    })
    if (flow === 'test_expired') {
      console.log(`[TEST_EXPIRED_STICKER_FAILED] fallback=${fallback.code} ${JSON.stringify({ ok: fallback.ok, dryRun: fallback.dryRun, phone: fallback.phone })}`)
    }
    return { ...fallback, mediaResult: result }
  }

  return result
}

function assertOperatorOnly(phone: string, dryRun: boolean, operatorPhones: string[]) {
  if (dryRun) return { ok: true as const }

  const target = normalizePhone(phone)
  const operators = operatorPhones.map((operator) => normalizePhone(operator)).filter(Boolean)
  if (!target || !operators.includes(target)) {
    return {
      ok: false as const,
      code: 'OPERATOR_ONLY',
      message: 'Envio real bloqueado: apenas OPERATOR_WHATSAPP/OPERATOR_WHATSAPP_LIST e permitido.',
    }
  }

  return { ok: true as const }
}

function pruneIdempotencyCache() {
  const cutoff = Date.now() - IDEMPOTENCY_TTL_MS
  for (const [key, entry] of dispatchIdempotency.entries()) {
    if (entry.sentAt < cutoff) dispatchIdempotency.delete(key)
  }
}

function stageForFlow(flow: FlowKey): PipelineStage | undefined {
  if (flow === 'test_created') return 'teste_gerado'
  if (flow === 'test_expired' || flow === 'operator_test_expired') return 'testando'
  if (flow === 'access_activated' || flow === 'access_updated' || flow === 'renewal_created') return 'pagou'
  if (flow === 'install_requested') return 'contato'
  return undefined
}

async function recordFlowExecution(flow: FlowKey, status: 'executando' | 'concluido' | 'ignorado' | 'erro', input: {
  phone?: string
  context: MessageContext
  idempotencyKey?: string
  code?: string
  message?: string
}) {
  const phone = input.phone || input.context.phone || input.context.clientPhone || input.context.client_phone || ''
  const client = phone ? await findClientByPhone(phone).catch(() => null) : null
  const event = status === 'executando'
    ? `${flow.toUpperCase()}_STARTED`
    : status === 'concluido'
      ? `${flow.toUpperCase()}_SENT`
      : status === 'ignorado'
        ? 'FLOW_SKIPPED_DUPLICATE'
        : 'FLOW_FAILED'
  await recordOperationalEvent(event, status === 'erro' ? 'error' : status === 'concluido' ? 'success' : 'info', {
    client,
    phone,
    stage: stageForFlow(flow),
    message: input.message || `Flow ${flow} ${status}.`,
    metadata: {
      flow,
      status,
      idempotency_key: input.idempotencyKey || undefined,
      code: input.code || undefined,
      test_id: input.context.test_id || input.context.testId || input.context.id || undefined,
      client_id: input.context.client_id || undefined,
      app: input.context.app || undefined,
      panel: input.context.panel || input.context.painel || undefined,
    },
  })
}

export async function dispatchFlow(input: DispatchFlowInput) {
  if (!ALLOWED_FLOWS.includes(input.flow)) {
    return { ok: false, code: 'INVALID_FLOW', message: 'Fluxo invalido.', allowed: ALLOWED_FLOWS }
  }

  const config = getEvolutionConfig()
  const dryRun = Boolean(input.dryRun || config.dryRun || !config.enabled)
  const context = input.context || {}
  const idempotencyKey = input.idempotency_key || (typeof context.idempotency_key === 'string' ? context.idempotency_key : '')
  if (idempotencyKey) {
    pruneIdempotencyCache()
    const existing = dispatchIdempotency.get(idempotencyKey)
    if (existing) {
      console.log(`[FLOW_DISPATCH_SKIPPED_ALREADY_SENT] ${JSON.stringify({ flow: input.flow, idempotency_key: idempotencyKey })}`)
      await recordFlowExecution(input.flow, 'ignorado', { phone: input.phone, context, idempotencyKey, code: 'ALREADY_SENT', message: 'Flow duplicado ignorado por idempotency_key.' })
      return { ...existing.result, ok: true, already_sent: true, idempotency_key: idempotencyKey }
    }
  }

  const operatorRecipients = input.flow === 'operator_test_expired' ? config.operatorWhatsappList : []
  const phone = input.flow === 'operator_test_expired'
    ? ''
    : input.phone || context.phone || (input.flow === 'test_expired' ? config.operatorWhatsapp : '')
  const validation = validateFlowContext(input.flow, context)
  if (!validation.ok) {
    const result = {
      ok: false,
      dryRun,
      code: validation.code,
      message: validation.message,
      missing_fields: validation.missing_fields,
    }
    console.warn(`[FLOW_DISPATCH_BLOCKED] ${input.flow} ${JSON.stringify({ code: validation.code, missing_fields: validation.missing_fields })}`)
    await recordFlowExecution(input.flow, 'erro', { phone: phone || context.clientPhone || context.client_phone, context, idempotencyKey, code: validation.code, message: validation.message })
    return result
  }
  const message = buildFlowMessage(input.flow, context)
  console.log(`[FLOW_DISPATCH_REQUESTED] ${input.flow} ${JSON.stringify({ phone: phone ? 'present' : 'missing', recipients: operatorRecipients.length || undefined, dryRun, enabled: config.enabled, idempotency_key: idempotencyKey || undefined })}`)
  await recordFlowExecution(input.flow, 'executando', { phone: phone || context.clientPhone || context.client_phone, context, idempotencyKey, code: 'FLOW_DISPATCH_REQUESTED' })
  const preview = previewMessage(input.flow, message)

  if (input.flow === 'operator_test_expired') {
    if (typeof message !== 'string') {
      return { ok: false, code: 'INVALID_OPERATOR_MESSAGE', message: 'Flow operacional precisa ser texto.', preview }
    }

    if (operatorRecipients.length === 0) {
      const result = {
        ok: true,
        dryRun: true,
        code: 'MESSAGE_PREPARED',
        message: 'Mensagem operacional preparada. Nenhum operador configurado.',
        recipients: [],
        preview,
      }
      if (idempotencyKey) dispatchIdempotency.set(idempotencyKey, { sentAt: Date.now(), result })
      return result
    }

    const results = []
    for (const recipient of operatorRecipients) {
      const guard = assertOperatorOnly(recipient, dryRun, config.operatorWhatsappList)
      if (!guard.ok) {
        results.push({ ok: false, dryRun: false, code: guard.code, message: guard.message, phone: recipient })
        continue
      }
      const sent = await sendText({ phone: recipient, message, dryRun, context: safeDispatchContext({ flow: input.flow, ...context }) })
      results.push(sent)
    }

    const ok = results.every((result) => result.ok || result.dryRun)
    const allDryRun = results.every((result) => result.dryRun)
    const result = {
      ok,
      dryRun: allDryRun,
      code: ok ? 'OPERATOR_TEST_EXPIRED_SENT' : 'OPERATOR_TEST_EXPIRED_FAILED',
      message: ok ? 'Aviso operacional de teste expirado processado.' : 'Falha em um ou mais envios operacionais.',
      recipients: operatorRecipients,
      results,
      preview,
    }
    if (ok && idempotencyKey) dispatchIdempotency.set(idempotencyKey, { sentAt: Date.now(), result })
    await recordFlowExecution(input.flow, ok ? 'concluido' : 'erro', { phone: context.clientPhone || context.client_phone, context, idempotencyKey, code: result.code, message: result.message })
    return result
  }

  if (!phone) {
    const result = {
      ok: true,
      dryRun: true,
      code: 'MESSAGE_PREPARED',
      message: 'Mensagem preparada. Nenhum telefone informado para envio.',
      preview,
    }
    if (idempotencyKey) dispatchIdempotency.set(idempotencyKey, { sentAt: Date.now(), result })
    await recordFlowExecution(input.flow, 'concluido', { phone, context, idempotencyKey, code: result.code, message: result.message })
    return result
  }

  const guard = assertOperatorOnly(phone, dryRun, config.operatorWhatsappList)
  if (!guard.ok && !input.trusted) {
    return { ok: false, dryRun: false, code: guard.code, message: guard.message, preview }
  }

  if (Array.isArray(message)) {
    const results = []
    for (const [index, part] of message.entries()) {
      const result = await sendMessagePart({ flow: input.flow, phone, part, dryRun, context })
      results.push({ index, ...result })
      if (!result.ok && !result.dryRun) break
    }

    const ok = results.every((result) => result.ok || result.dryRun)
    const allDryRun = results.every((result) => result.dryRun)
    const sequenceResult = {
      ok,
      dryRun: allDryRun,
      code: ok ? 'FLOW_SEQUENCE_SENT' : 'FLOW_SEQUENCE_FAILED',
      message: ok ? 'Sequencia de mensagens processada.' : 'Falha em uma ou mais mensagens da sequencia.',
      results,
      preview,
    }
    if (ok && idempotencyKey) dispatchIdempotency.set(idempotencyKey, { sentAt: Date.now(), result: sequenceResult })
    await recordFlowExecution(input.flow, ok ? 'concluido' : 'erro', { phone, context, idempotencyKey, code: sequenceResult.code, message: sequenceResult.message })
    return sequenceResult
  }

  if (typeof message !== 'string') {
    const result = await sendMessagePart({ flow: input.flow, phone, part: message, dryRun, context })

    if (!result.ok && !result.dryRun && message.fallbackText) {
      const fallbackResult = { ...result, preview }
      if (fallbackResult.ok && idempotencyKey) dispatchIdempotency.set(idempotencyKey, { sentAt: Date.now(), result: fallbackResult })
      await recordFlowExecution(input.flow, fallbackResult.ok ? 'concluido' : 'erro', { phone, context, idempotencyKey, code: fallbackResult.code, message: fallbackResult.message })
      return fallbackResult
    }

    const mediaResult = { ...result, preview }
    if (mediaResult.ok && idempotencyKey) dispatchIdempotency.set(idempotencyKey, { sentAt: Date.now(), result: mediaResult })
    await recordFlowExecution(input.flow, mediaResult.ok ? 'concluido' : 'erro', { phone, context, idempotencyKey, code: mediaResult.code, message: mediaResult.message })
    return mediaResult
  }

  const result = await sendText({ phone, message, dryRun, context: safeDispatchContext({ flow: input.flow, ...context }) })
  const textResult = { ...result, preview }
  if (textResult.ok && idempotencyKey) dispatchIdempotency.set(idempotencyKey, { sentAt: Date.now(), result: textResult })
  await recordFlowExecution(input.flow, textResult.ok ? 'concluido' : 'erro', { phone, context, idempotencyKey, code: textResult.code, message: textResult.message })
  return textResult
}
