import { NextResponse } from 'next/server'
import { dispatchFlow } from '@/lib/services/messages/dispatch-flow'
import { ALLOWED_FLOWS, type FlowKey, type MessageContext } from '@/lib/services/messages/templates'

function isLoopbackIp(value: string) {
  const ip = value.replace(/^::ffff:/, '').trim()
  return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost'
}

function isTrustedInternalRequest(request: Request) {
  const realIp = request.headers.get('x-real-ip') || ''
  const forwardedFor = request.headers.get('x-forwarded-for') || ''
  const firstForwarded = forwardedFor.split(',')[0]?.trim() || ''
  if (!realIp && !firstForwarded) return true
  return Boolean((realIp && isLoopbackIp(realIp)) || (firstForwarded && isLoopbackIp(firstForwarded)))
}

function booleanField(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'boolean') return value
    const text = String(value ?? '').trim().toLowerCase()
    if (text === 'true') return true
    if (text === 'false') return false
  }
  return false
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    flow?: FlowKey
    phone?: string
    dryRun?: boolean
    idempotency_key?: string
    context?: MessageContext
    client?: { name?: string; phone?: string }
    test?: Record<string, unknown>
    activation?: Record<string, unknown>
  } | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, code: 'INVALID_JSON', message: 'Envie JSON valido.' }, { status: 400 })
  }
  if (!body.flow || !ALLOWED_FLOWS.includes(body.flow)) {
    return NextResponse.json({ ok: false, code: 'INVALID_FLOW', message: 'Fluxo invalido.', allowed: ALLOWED_FLOWS }, { status: 400 })
  }

  const test = body.test || {}
  const activation = body.activation || {}
    const context: MessageContext = {
      ...(body.context || {}),
      phone: body.phone || body.client?.phone || body.context?.phone,
      id: String(test.id || body.context?.id || ''),
      testId: String(test.id || body.context?.testId || body.context?.test_id || ''),
      test_id: String(test.id || body.context?.test_id || body.context?.testId || ''),
      client_id: String(test.client_id || body.context?.client_id || ''),
      clientName: body.client?.name || body.context?.clientName,
      cliente: String(body.client?.name || body.context?.cliente || body.context?.clientName || ''),
      clientPhone: String(body.client?.phone || test.client_phone || body.context?.clientPhone || body.context?.client_phone || ''),
      app: String(test.app || activation.app || body.context?.app || ''),
      panel: String(test.panel || activation.panel || body.context?.panel || body.context?.painel || ''),
      painel: String(test.panel || activation.panel || body.context?.painel || body.context?.panel || ''),
    provider: String(test.provider || activation.provider || body.context?.provider || body.context?.painel || body.context?.panel || ''),
    pedido: String(test.pedido || test.order_id || test.orderId || body.context?.pedido || body.context?.order_id || body.context?.orderId || ''),
    orderId: String(test.order_id || test.orderId || body.context?.orderId || body.context?.order_id || ''),
    codigo: String(test.codigo || test.code || activation.codigo || activation.code || body.context?.codigo || body.context?.code || ''),
    code: String(test.code || test.codigo || activation.code || activation.codigo || body.context?.code || body.context?.codigo || ''),
    host: String(test.host || activation.host || body.context?.host || ''),
    dns: String(test.dns || activation.dns || body.context?.dns || ''),
    username: String(test.username || test.usuario || activation.username || activation.usuario || body.context?.username || body.context?.usuario || ''),
    usuario: String(test.usuario || test.username || activation.usuario || activation.username || body.context?.usuario || body.context?.username || ''),
    password: String(test.password || test.senha || activation.password || activation.senha || body.context?.password || body.context?.senha || ''),
    senha: String(test.senha || test.password || activation.senha || activation.password || body.context?.senha || body.context?.password || ''),
      plan: String(activation.plan || body.context?.plan || ''),
      amount: String(activation.amount || body.context?.amount || ''),
      dueAt: String(activation.dueAt || activation.vencimento || body.context?.dueAt || body.context?.vencimento || ''),
      vencimento: String(activation.vencimento || activation.dueAt || body.context?.vencimento || body.context?.dueAt || ''),
      expiredAt: String(test.expired_at || test.expiredAt || body.context?.expiredAt || body.context?.expired_at || ''),
      expiresAt: String(test.expires_at || test.expiresAt || body.context?.expiresAt || body.context?.expires_at || ''),
      link: String(test.link || body.context?.link || ''),
      idempotency_key: String(body.idempotency_key || body.context?.idempotency_key || ''),
      provider_url: String(test.provider_url || test.providerUrl || body.context?.provider_url || body.context?.providerUrl || ''),
      providerUrl: String(test.providerUrl || test.provider_url || body.context?.providerUrl || body.context?.provider_url || ''),
      xcloud_remove_status: String(test.xcloud_remove_status || test.xcloudRemoveStatus || body.context?.xcloud_remove_status || body.context?.xcloudRemoveStatus || ''),
      xcloudRemoveStatus: String(test.xcloudRemoveStatus || test.xcloud_remove_status || body.context?.xcloudRemoveStatus || body.context?.xcloud_remove_status || ''),
      device_key: String(test.device_key || test.deviceKey || body.context?.device_key || body.context?.deviceKey || ''),
      deviceKey: String(test.deviceKey || test.device_key || body.context?.deviceKey || body.context?.device_key || ''),
      manual_close_required: booleanField(test.manual_close_required, test.manualCloseRequired, body.context?.manual_close_required, body.context?.manualCloseRequired),
      manualCloseRequired: booleanField(test.manualCloseRequired, test.manual_close_required, body.context?.manualCloseRequired, body.context?.manual_close_required),
    }

  const result = await dispatchFlow({
    flow: body.flow,
    phone: body.phone,
    context,
    idempotency_key: body.idempotency_key || String(body.context?.idempotency_key || ''),
    dryRun: body.dryRun,
    trusted: isTrustedInternalRequest(request),
  })
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
