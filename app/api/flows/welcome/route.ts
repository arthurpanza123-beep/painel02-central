import { NextResponse } from 'next/server'
import { dispatchWelcomeFlow } from '@/lib/services/messages/welcome-flow'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { phone?: string; client?: { name?: string }; dryRun?: boolean } | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, code: 'INVALID_JSON', message: 'Envie JSON valido.' }, { status: 400 })
  }
  if (!body.phone) {
    return NextResponse.json({ ok: false, code: 'PHONE_REQUIRED', message: 'Informe phone.' }, { status: 400 })
  }

  const result = await dispatchWelcomeFlow({ phone: body.phone, client: body.client || {}, dryRun: body.dryRun })
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
