import { NextResponse } from 'next/server'
import { normalizePhone } from '@/lib/services/evolution/normalize-phone'
import { ensureInboundLead, findClientByPhone, isRecentIso, metadataString, recordOperationalEvent, updateClientOperationalState } from '@/lib/services/messages/operational-store'
import { dispatchWelcomeFlow } from '@/lib/services/messages/welcome-flow'

const WELCOME_TTL_MS = 24 * 60 * 60 * 1000

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { phone?: string; customerPhone?: string; name?: string; source?: string; idempotencyKey?: string; idempotency_key?: string; client?: { name?: string; phone?: string }; dryRun?: boolean; force?: boolean } | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, code: 'INVALID_JSON', message: 'Envie JSON valido.' }, { status: 400 })
  }
  const phone = normalizePhone(body.phone || body.customerPhone || body.client?.phone || '')
  if (!phone) {
    return NextResponse.json({ ok: false, code: 'PHONE_REQUIRED', message: 'Informe phone.' }, { status: 400 })
  }

  const idempotencyKey = String(body.idempotencyKey || body.idempotency_key || '').trim()
  const source = String(body.source || '').trim()
  const ensured = source === 'prospection'
    ? await ensureInboundLead({ phone, name: body.name || body.client?.name, event: 'PROSPECTION_WELCOME_REQUEST' }).catch(() => null)
    : null
  const client = ensured?.client || await findClientByPhone(phone).catch(() => null)
  const metadata = client?.legacy_metadata && typeof client.legacy_metadata === 'object' ? client.legacy_metadata : {}
  if (
    idempotencyKey &&
    metadataString(metadata, 'welcome_idempotency_key') === idempotencyKey &&
    (isRecentIso(metadata.welcome_sent_at, WELCOME_TTL_MS) || isRecentIso(metadata.welcome_flow_started_at, WELCOME_TTL_MS))
  ) {
    await recordOperationalEvent('WELCOME_SKIPPED_ALREADY_SENT', 'info', {
      client,
      phone,
      stage: 'novo_lead',
      message: 'Welcome duplicado ignorado por idempotencyKey.',
      metadata: { flow: 'welcome', source, idempotencyKey },
    }).catch(() => null)
    return NextResponse.json({ ok: true, already_sent: true, skipped: true, code: 'WELCOME_SKIPPED_ALREADY_SENT', phone })
  }

  const startedAt = new Date().toISOString()
  if (idempotencyKey) {
    await updateClientOperationalState({
      client,
      status: 'lead',
      metadataPatch: {
        welcome_idempotency_key: idempotencyKey,
        welcome_source: source || undefined,
        welcome_flow_started_at: startedAt,
        welcome_flow_status: 'running',
      },
    }).catch(() => null)
  }
  const result = await dispatchWelcomeFlow({ phone, client: client || body.client || {}, dryRun: body.dryRun, force: body.force, startedAt })
  if (result.ok && !(result as { skipped?: boolean }).skipped && !(result as { cancelled?: boolean }).cancelled) {
    const code = (result as { dryRun?: boolean }).dryRun ? 'WELCOME_DRY_RUN' : 'WELCOME_SENT'
    await updateClientOperationalState({
      client,
      status: 'lead',
      metadataPatch: {
        welcome_flow_started_at: startedAt,
        welcome_flow_status: (result as { cancelled?: boolean }).cancelled ? 'cancelled' : 'completed',
        welcome_flow_completed_at: (result as { cancelled?: boolean }).cancelled ? undefined : new Date().toISOString(),
        welcome_sent_at: new Date().toISOString(),
        welcome_status: code,
        welcome_idempotency_key: idempotencyKey || undefined,
        welcome_source: source || undefined,
        welcome_forced_at: body.force ? new Date().toISOString() : undefined,
      },
    }).catch(() => null)
    await recordOperationalEvent(code, code === 'WELCOME_SENT' ? 'success' : 'info', {
      client,
      phone,
      stage: 'novo_lead',
      message: body.force ? 'Fluxo de boas-vindas enviado por validacao controlada.' : 'Fluxo de boas-vindas enviado pelo endpoint.',
      metadata: { flow: 'welcome', code, force: Boolean(body.force), source, idempotencyKey: idempotencyKey || undefined },
    }).catch(() => null)
  }
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
