import { NextResponse } from 'next/server'
import { findClientByPhone, recordOperationalEvent, updateClientOperationalState } from '@/lib/services/messages/operational-store'
import { dispatchWelcomeFlow } from '@/lib/services/messages/welcome-flow'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { phone?: string; client?: { name?: string }; dryRun?: boolean; force?: boolean } | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, code: 'INVALID_JSON', message: 'Envie JSON valido.' }, { status: 400 })
  }
  if (!body.phone) {
    return NextResponse.json({ ok: false, code: 'PHONE_REQUIRED', message: 'Informe phone.' }, { status: 400 })
  }

  const client = await findClientByPhone(body.phone).catch(() => null)
  const startedAt = new Date().toISOString()
  const result = await dispatchWelcomeFlow({ phone: body.phone, client: client || body.client || {}, dryRun: body.dryRun, force: body.force, startedAt })
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
        welcome_forced_at: body.force ? new Date().toISOString() : undefined,
      },
    }).catch(() => null)
    await recordOperationalEvent(code, code === 'WELCOME_SENT' ? 'success' : 'info', {
      client,
      phone: body.phone,
      stage: 'novo_lead',
      message: body.force ? 'Fluxo de boas-vindas enviado por validacao controlada.' : 'Fluxo de boas-vindas enviado pelo endpoint.',
      metadata: { flow: 'welcome', code, force: Boolean(body.force) },
    }).catch(() => null)
  }
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
