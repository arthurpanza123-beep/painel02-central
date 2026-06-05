export type EvolutionMediaType = 'image' | 'video' | 'document'

export interface EvolutionConfig {
  enabled: boolean
  dryRun: boolean
  apiUrl: string
  apiKey: string
  instance: string
  timeoutMs: number
  operatorWhatsapp: string
}

export interface EvolutionLogEntry {
  level: 'info' | 'warn' | 'error'
  code: string
  message: string
  metadata?: Record<string, unknown>
}

export interface EvolutionSendResult {
  ok: boolean
  dryRun: boolean
  status?: number
  code: string
  message: string
  phone?: string
  request?: {
    endpoint: string
    body: Record<string, unknown>
  }
  response?: unknown
  logs: EvolutionLogEntry[]
}

export interface SendTextInput {
  phone: string
  message: string
  context?: Record<string, unknown>
  dryRun?: boolean
}

export interface SendMediaInput {
  phone: string
  caption?: string
  mediaUrl?: string
  mediaPath?: string
  type?: EvolutionMediaType
  mimetype?: string
  fileName?: string
  context?: Record<string, unknown>
  dryRun?: boolean
}

export interface SendAudioInput {
  phone: string
  audioUrl?: string
  audioPath?: string
  context?: Record<string, unknown>
  dryRun?: boolean
}
