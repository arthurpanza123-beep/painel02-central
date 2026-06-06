import { NextResponse } from 'next/server'
import { handleEvolutionInboundWebhook } from '@/lib/services/messages/inbound-webhook'

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: '/api/evolution/webhook',
    message: 'Webhook Evolution ativo. Use POST para eventos inbound.',
  })
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null)
  const result = await handleEvolutionInboundWebhook(payload)
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
