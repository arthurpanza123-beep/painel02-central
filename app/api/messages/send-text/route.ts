import { NextResponse } from 'next/server'
import { sendText } from '@/lib/services/evolution/send-text'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { phone?: string; message?: string; context?: Record<string, unknown> } | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, code: 'INVALID_JSON', message: 'Envie JSON valido.' }, { status: 400 })
  }
  if (!body.phone) {
    return NextResponse.json({ ok: false, code: 'PHONE_REQUIRED', message: 'Informe phone.' }, { status: 400 })
  }
  if (!body.message || !String(body.message).trim()) {
    return NextResponse.json({ ok: false, code: 'MESSAGE_REQUIRED', message: 'Informe message.' }, { status: 400 })
  }

  const result = await sendText({ phone: body.phone, message: String(body.message), context: body.context || {} })
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
