import { NextResponse } from 'next/server'
import { dispatchFlow } from '@/lib/services/messages/dispatch-flow'
import { ALLOWED_FLOWS, type FlowKey, type MessageContext } from '@/lib/services/messages/templates'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { flow?: FlowKey; phone?: string; context?: MessageContext } | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, code: 'INVALID_JSON', message: 'Envie JSON valido.' }, { status: 400 })
  }
  if (!body.flow || !ALLOWED_FLOWS.includes(body.flow)) {
    return NextResponse.json({ ok: false, code: 'INVALID_FLOW', message: 'Fluxo invalido.', allowed: ALLOWED_FLOWS }, { status: 400 })
  }

  const result = await dispatchFlow({ flow: body.flow, phone: body.phone, context: body.context || {} })
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
