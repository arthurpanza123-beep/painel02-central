import { NextResponse } from 'next/server'
import { retryWelcomeStep, type WelcomeStepId } from '@/lib/services/messages/welcome-flow'

const ALLOWED_STEPS: WelcomeStepId[] = ['audio_1', 'audio_2', 'social_image', 'audio_4']

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { phone?: string; step?: WelcomeStepId; client?: { name?: string }; dryRun?: boolean } | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, code: 'INVALID_JSON', message: 'Envie JSON valido.' }, { status: 400 })
  }
  if (!body.phone) {
    return NextResponse.json({ ok: false, code: 'PHONE_REQUIRED', message: 'Informe phone.' }, { status: 400 })
  }
  if (!body.step || !ALLOWED_STEPS.includes(body.step)) {
    return NextResponse.json({ ok: false, code: 'INVALID_STEP', message: 'Etapa invalida.', allowed: ALLOWED_STEPS }, { status: 400 })
  }

  const result = await retryWelcomeStep({ phone: body.phone, step: body.step, client: body.client || {}, dryRun: body.dryRun })
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
