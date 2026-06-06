export type EvolutionMediaType = 'image' | 'video' | 'document'
export type PresenceType = 'recording' | 'composing'

export interface EvolutionConfig {
  enabled: boolean
  dryRun: boolean
  apiUrl: string
  apiKey: string
  instance: string
  timeoutMs: number
  operatorWhatsapp: string
  operatorWhatsappList: string[]
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

export interface SendStickerInput {
  phone: string
  stickerUrl?: string
  stickerPath?: string
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

export interface SendPresenceInput {
  phone: string
  presence: PresenceType
  delayMs: number
  context?: Record<string, unknown>
  dryRun?: boolean
}
