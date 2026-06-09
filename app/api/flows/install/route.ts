import { NextResponse } from 'next/server'
import { getEvolutionConfig } from '@/lib/services/evolution/config'
import { maskPhone } from '@/lib/services/evolution/mask'
import { normalizePhone } from '@/lib/services/evolution/normalize-phone'
import { sendText } from '@/lib/services/evolution/send-text'
import { ensureInboundLead, isRecentIso, metadataString, recordOperationalEvent, updateClientOperationalState } from '@/lib/services/messages/operational-store'
import { buildInstallMessage } from '@/lib/services/messages/install-templates'

const INSTALL_TTL_MS = 24 * 60 * 60 * 1000

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { phone?: string; customerPhone?: string; name?: string; source?: string; idempotencyKey?: string; idempotency_key?: string; client?: { name?: string; phone?: string }; app?: string; device?: string; dryRun?: boolean } | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, code: 'INVALID_JSON', message: 'Envie JSON valido.' }, { status: 400 })
  }
  const phone = normalizePhone(body.phone || body.customerPhone || body.client?.phone || '')
  if (!phone) {
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
  const idempotencyKey = String(body.idempotencyKey || body.idempotency_key || '').trim()
  const source = String(body.source || '').trim()
  const ensured = source === 'prospection'
    ? await ensureInboundLead({ phone, name: body.name || body.client?.name, event: 'PROSPECTION_INSTALL_REQUEST' }).catch(() => null)
    : null
  const client = ensured?.client || null
  const metadata = client?.legacy_metadata && typeof client.legacy_metadata === 'object' ? client.legacy_metadata : {}
  if (
    idempotencyKey &&
    metadataString(metadata, 'install_idempotency_key') === idempotencyKey &&
    metadataString(metadata, 'install_device') === body.device &&
    isRecentIso(metadata.install_sent_at, INSTALL_TTL_MS)
  ) {
    await recordOperationalEvent('INSTALL_SKIPPED_ALREADY_SENT', 'info', {
      client,
      phone,
      stage: 'contato',
      message: 'Install duplicado ignorado por idempotencyKey.',
      metadata: { flow: 'install', source, idempotencyKey, device: body.device },
    }).catch(() => null)
    return NextResponse.json({ ok: true, already_sent: true, skipped: true, code: 'INSTALL_SKIPPED_ALREADY_SENT', phone: maskPhone(phone), preview: message })
  }

  if (idempotencyKey) {
    const now = new Date().toISOString()
    await updateClientOperationalState({
      client,
      status: 'lead',
      metadataPatch: {
        install_idempotency_key: idempotencyKey,
        install_source: source || undefined,
        install_sent_at: now,
        install_device: body.device,
        install_status: 'pending',
        active_flow_type: 'install',
        welcome_flow_status: 'cancelled',
        welcome_flow_cancelled_at: now,
        welcome_cancel_reason: 'install_requested',
      },
    }).catch(() => null)
  }

  if (!dryRun) {
    const target = normalizePhone(phone)
    const operator = normalizePhone(config.operatorWhatsapp)
    if (!target || !operator || target !== operator) {
      return NextResponse.json({
        ok: false,
        dryRun,
        code: 'OPERATOR_ONLY',
        message: 'Envio real bloqueado: nesta fase apenas OPERATOR_WHATSAPP e permitido.',
        phone: maskPhone(phone),
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
      phone: maskPhone(phone),
      preview: message,
    })
  }

  const result = await sendText({ phone, message, dryRun: false, context: { flow: 'install', client: body.client || {}, app: body.app, device: body.device, source, idempotencyKey: idempotencyKey || undefined } })
  if (idempotencyKey) {
    await updateClientOperationalState({
      client,
      status: 'lead',
      metadataPatch: {
        install_status: result.ok ? 'sent' : 'error',
        install_idempotency_key: idempotencyKey,
        install_source: source || undefined,
      },
    }).catch(() => null)
  }
  return NextResponse.json({ ...result, preview: message }, { status: result.ok ? 200 : 400 })
}
