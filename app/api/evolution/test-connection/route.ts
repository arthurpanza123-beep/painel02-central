import { NextResponse } from 'next/server'
import { getEvolutionConfig, isEvolutionConfigured } from '@/lib/services/evolution/config'
import { maskPhone, maskToken } from '@/lib/services/evolution/mask'

export async function POST() {
  const config = getEvolutionConfig()
  const configured = isEvolutionConfigured(config)
  const realBlocked = !config.enabled || config.dryRun

  return NextResponse.json({
    ok: configured || realBlocked,
    code: realBlocked ? 'DRY_RUN_CONNECTION_CHECK' : (configured ? 'EVOLUTION_CONFIGURED' : 'EVOLUTION_NOT_CONFIGURED'),
    message: realBlocked
      ? 'Dry-run ativo: conexao real nao foi chamada.'
      : (configured ? 'Configuracao Evolution presente.' : 'Configuracao Evolution incompleta.'),
    flags: {
      enabled: config.enabled,
      dryRun: config.dryRun,
      configured,
      apiUrlConfigured: Boolean(config.apiUrl),
      apiKey: maskToken(config.apiKey),
      instanceConfigured: Boolean(config.instance),
      timeoutMs: config.timeoutMs,
      operatorWhatsapp: maskPhone(config.operatorWhatsapp),
    },
  })
}
