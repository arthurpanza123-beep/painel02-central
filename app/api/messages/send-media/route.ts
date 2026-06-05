import { NextResponse } from 'next/server'
import { sendMedia } from '@/lib/services/evolution/send-media'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { phone?: string; caption?: string; mediaUrl?: string; mediaPath?: string; type?: 'image' | 'video' | 'document'; mimetype?: string; fileName?: string; context?: Record<string, unknown> } | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, code: 'INVALID_JSON', message: 'Envie JSON valido.' }, { status: 400 })
  }
  if (!body.phone) {
    return NextResponse.json({ ok: false, code: 'PHONE_REQUIRED', message: 'Informe phone.' }, { status: 400 })
  }
  if (!body.mediaUrl && !body.mediaPath) {
    return NextResponse.json({ ok: false, code: 'MEDIA_REQUIRED', message: 'Informe mediaUrl ou mediaPath.' }, { status: 400 })
  }

  const result = await sendMedia({
    phone: body.phone,
    caption: body.caption || '',
    mediaUrl: body.mediaUrl,
    mediaPath: body.mediaPath,
    type: body.type || 'image',
    mimetype: body.mimetype,
    fileName: body.fileName,
    context: body.context || {},
  })
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
