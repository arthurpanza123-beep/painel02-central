import type { EvolutionConfig } from './types'

function boolEnv(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

function numberEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1000) return fallback
  return Math.floor(parsed)
}

function listEnv(value: string | undefined): string[] {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function getEvolutionConfig(): EvolutionConfig {
  const operatorWhatsapp = String(process.env.OPERATOR_WHATSAPP || '')
  const operatorWhatsappList = listEnv(process.env.OPERATOR_WHATSAPP_LIST)
  if (operatorWhatsapp && !operatorWhatsappList.includes(operatorWhatsapp)) {
    operatorWhatsappList.push(operatorWhatsapp)
  }

  return {
    enabled: boolEnv(process.env.EVOLUTION_ENABLED, false),
    dryRun: boolEnv(process.env.EVOLUTION_DRY_RUN, true),
    apiUrl: String(process.env.EVOLUTION_API_URL || '').replace(/\/+$/, ''),
    apiKey: String(process.env.EVOLUTION_API_KEY || ''),
    instance: String(process.env.EVOLUTION_INSTANCE || ''),
    timeoutMs: numberEnv(process.env.EVOLUTION_TIMEOUT_MS, 30000),
    operatorWhatsapp,
    operatorWhatsappList,
  }
}

export function isEvolutionConfigured(config = getEvolutionConfig()): boolean {
  return Boolean(config.apiUrl && config.apiKey && config.instance)
}
