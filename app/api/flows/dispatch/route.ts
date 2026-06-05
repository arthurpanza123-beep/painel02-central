import { NextResponse } from 'next/server'
import { dispatchFlow } from '@/lib/services/messages/dispatch-flow'
import { ALLOWED_FLOWS, type FlowKey, type MessageContext } from '@/lib/services/messages/templates'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    flow?: FlowKey
    phone?: string
    context?: MessageContext
    client?: { name?: string; phone?: string }
    test?: Record<string, unknown>
    activation?: Record<string, unknown>
  } | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, code: 'INVALID_JSON', message: 'Envie JSON valido.' }, { status: 400 })
  }
  if (!body.flow || !ALLOWED_FLOWS.includes(body.flow)) {
    return NextResponse.json({ ok: false, code: 'INVALID_FLOW', message: 'Fluxo invalido.', allowed: ALLOWED_FLOWS }, { status: 400 })
  }

  const test = body.test || {}
  const activation = body.activation || {}
  const context: MessageContext = {
    ...(body.context || {}),
    phone: body.phone || body.client?.phone || body.context?.phone,
    id: String(test.id || body.context?.id || ''),
    testId: String(test.id || body.context?.testId || body.context?.test_id || ''),
    clientName: body.client?.name || body.context?.clientName,
    app: String(test.app || activation.app || body.context?.app || ''),
    panel: String(test.panel || activation.panel || body.context?.panel || ''),
    pedido: String(test.pedido || test.order_id || test.orderId || body.context?.pedido || body.context?.order_id || body.context?.orderId || ''),
    orderId: String(test.order_id || test.orderId || body.context?.orderId || body.context?.order_id || ''),
    host: String(test.host || body.context?.host || ''),
    username: String(test.username || body.context?.username || ''),
    password: String(test.password || body.context?.password || ''),
    plan: String(activation.plan || body.context?.plan || ''),
    amount: String(activation.amount || body.context?.amount || ''),
    dueAt: String(activation.dueAt || body.context?.dueAt || ''),
  }

  const result = await dispatchFlow({ flow: body.flow, phone: body.phone, context })
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
