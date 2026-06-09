import { NextResponse } from 'next/server'
import { normalizePhone } from '@/lib/services/evolution/normalize-phone'
import { ensureInboundLead, findClientByPhone, isRecentIso, metadataString, recordOperationalEvent, updateClientOperationalState } from '@/lib/services/messages/operational-store'
import { dispatchWelcomeFlow } from '@/lib/services/messages/welcome-flow'

const WELCOME_TTL_MS = 24 * 60 * 60 * 1000

function listEnv(value: string | undefined) {
  return String(value || '').split(',').map((item) => normalizePhone(item)).filter(Boolean)
}

function prospectionConfig() {
  return {
    instance: String(process.env.PROSPECTION_EVOLUTION_INSTANCE || process.env.EVOLUTION_PROSPECTION_INSTANCE || 'centralplay-leads').trim(),
    connectedPhone: normalizePhone(process.env.PROSPECTION_CONNECTED_INSTANCE_PHONE || ''),
    allowedPhones: Array.from(new Set([
      ...listEnv(process.env.PROSPECTION_REAL_ALLOWED_RECIPIENTS),
      ...listEnv(process.env.PROSPECTION_REAL_ALLOWED_PHONES),
      ...listEnv(process.env.OPERATOR_WHATSAPP_LIST),
      normalizePhone(process.env.OPERATOR_WHATSAPP || ''),
    ].filter(Boolean))),
    dryRun: ['1', 'true', 'yes', 'on'].includes(String(process.env.PANEL2_DRY_RUN_FOR_PROSPECTION || '').toLowerCase()),
  }
}

function resolveProspectionTarget(body: { phone?: string; customerPhone?: string; to?: string; recipient?: string; client?: { phone?: string } }) {
  const entries = [
    ['phone', body.phone],
    ['customerPhone', body.customerPhone],
    ['to', body.to],
    ['recipient', body.recipient],
    ['client.phone', body.client?.phone],
  ] as const
  const normalized = entries
    .map(([field, value]) => ({ field, value: normalizePhone(value || '') }))
    .filter((item) => item.value)
  const unique = Array.from(new Set(normalized.map((item) => item.value)))
  return { phone: unique[0] || '', unique, normalized }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { phone?: string; customerPhone?: string; to?: string; recipient?: string; name?: string; source?: string; idempotencyKey?: string; idempotency_key?: string; client?: { name?: string; phone?: string }; dryRun?: boolean; force?: boolean } | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, code: 'INVALID_JSON', message: 'Envie JSON valido.' }, { status: 400 })
  }
  const source = String(body.source || '').trim()
  const prospection = prospectionConfig()
  const target = source === 'prospection' ? resolveProspectionTarget(body) : { phone: normalizePhone(body.phone || body.customerPhone || body.client?.phone || ''), unique: [], normalized: [] }
  const phone = target.phone
  if (!phone) {
    return NextResponse.json({ ok: false, code: 'PHONE_REQUIRED', message: 'Informe phone.' }, { status: 400 })
  }

  const idempotencyKey = String(body.idempotencyKey || body.idempotency_key || '').trim()
  if (source === 'prospection') {
    const logBase = {
      source,
      flow: 'welcome',
      requestedPhone: body.phone || body.customerPhone || body.to || body.recipient || body.client?.phone || null,
      finalRecipientPhone: phone,
      operatorOnly: false,
      allowed: prospection.allowedPhones.includes(phone),
      idempotencyKey,
      instance: prospection.instance,
      fields: target.normalized,
    }
    console.log(`[PANEL2_FLOW_TARGET_RESOLVED] ${JSON.stringify(logBase)}`)
    if (target.unique.length > 1) {
      await recordOperationalEvent('PANEL2_BLOCKED_TARGET_REWRITE', 'error', { phone, stage: 'novo_lead', message: 'Campos de destino divergentes em flow de prospeccao.', metadata: logBase }).catch(() => null)
      return NextResponse.json({ ok: false, code: 'PANEL2_BLOCKED_TARGET_REWRITE', message: 'Campos de destino divergentes.', ...logBase }, { status: 400 })
    }
    if (prospection.connectedPhone && phone === prospection.connectedPhone) {
      await recordOperationalEvent('PANEL2_BLOCKED_SELF_TARGET', 'error', { phone, stage: 'novo_lead', message: 'Destino e o numero conectado da prospeccao.', metadata: logBase }).catch(() => null)
      return NextResponse.json({ ok: false, code: 'PANEL2_BLOCKED_SELF_TARGET', message: 'Destino bloqueado: self-target.', ...logBase }, { status: 400 })
    }
    if (!prospection.allowedPhones.includes(phone)) {
      await recordOperationalEvent('PANEL2_BLOCKED_NOT_ALLOWLISTED', 'error', { phone, stage: 'novo_lead', message: 'Destino de prospeccao fora da allowlist.', metadata: logBase }).catch(() => null)
      return NextResponse.json({ ok: false, code: 'PANEL2_BLOCKED_NOT_ALLOWLISTED', message: 'Destino fora da allowlist.', ...logBase }, { status: 400 })
    }
  }
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
  const result = await dispatchWelcomeFlow({ phone, client: client || body.client || {}, dryRun: Boolean(body.dryRun || (source === 'prospection' && prospection.dryRun)), force: body.force, startedAt, instance: source === 'prospection' ? prospection.instance : undefined })
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
