import { NextResponse } from 'next/server'
import { getEvolutionConfig } from '@/lib/services/evolution/config'
import { maskPhone } from '@/lib/services/evolution/mask'
import { normalizePhone } from '@/lib/services/evolution/normalize-phone'
import { sendText } from '@/lib/services/evolution/send-text'
import { buildInstallMessage } from '@/lib/services/messages/install-templates'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { phone?: string; client?: { name?: string }; app?: string; device?: string; dryRun?: boolean } | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, code: 'INVALID_JSON', message: 'Envie JSON valido.' }, { status: 400 })
  }
  if (!body.phone) {
    return NextResponse.json({ ok: false, code: 'PHONE_REQUIRED', message: 'Informe phone.' }, { status: 400 })
  }
  if (!body.app) {
    return NextResponse.json({ ok: false, code: 'APP_REQUIRED', message: 'Informe app.' }, { status: 400 })
  }
  if (!body.device) {
    return NextResponse.json({ ok: false, code: 'DEVICE_REQUIRED', message: 'Informe device.' }, { status: 400 })
  }

  const config = getEvolutionConfig()
  const dryRun = Boolean(body.dryRun || config.dryRun || !config.enabled)
  const message = buildInstallMessage(body.app, body.device)

  if (!dryRun) {
    const target = normalizePhone(body.phone)
    const operator = normalizePhone(config.operatorWhatsapp)
    if (!target || !operator || target !== operator) {
      return NextResponse.json({
        ok: false,
        dryRun,
        code: 'OPERATOR_ONLY',
        message: 'Envio real bloqueado: nesta fase apenas OPERATOR_WHATSAPP e permitido.',
        phone: maskPhone(body.phone),
        preview: message,
      }, { status: 400 })
    }
  }

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      code: 'INSTALL_DRY_RUN',
      message: 'Dry-run: guia de instalacao preparado, sem envio real.',
      phone: maskPhone(body.phone),
      preview: message,
    })
  }

  const result = await sendText({ phone: body.phone, message, dryRun: false, context: { flow: 'install', client: body.client || {}, app: body.app, device: body.device } })
  return NextResponse.json({ ...result, preview: message }, { status: result.ok ? 200 : 400 })
}
