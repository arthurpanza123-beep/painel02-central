import { NextResponse } from 'next/server'
import { sendAudio } from '@/lib/services/evolution/send-audio'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { phone?: string; audioUrl?: string; audioPath?: string; context?: Record<string, unknown> } | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, code: 'INVALID_JSON', message: 'Envie JSON valido.' }, { status: 400 })
  }
  if (!body.phone) {
    return NextResponse.json({ ok: false, code: 'PHONE_REQUIRED', message: 'Informe phone.' }, { status: 400 })
  }
  if (!body.audioUrl && !body.audioPath) {
    return NextResponse.json({ ok: false, code: 'AUDIO_REQUIRED', message: 'Informe audioUrl ou audioPath.' }, { status: 400 })
  }

  const result = await sendAudio({ phone: body.phone, audioUrl: body.audioUrl, audioPath: body.audioPath, context: body.context || {} })
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
