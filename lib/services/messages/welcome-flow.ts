import { getEvolutionConfig } from '../evolution/config'
import { maskPhone } from '../evolution/mask'
import { normalizePhone } from '../evolution/normalize-phone'
import { sendAudio } from '../evolution/send-audio'
import { sendMedia } from '../evolution/send-media'
import { sendText } from '../evolution/send-text'
import type { EvolutionSendResult } from '../evolution/types'

export type WelcomeStepId = 'audio_1' | 'audio_2' | 'social_image' | 'audio_4'

export interface WelcomeStep {
  step: WelcomeStepId
  type: 'audio' | 'image'
  label: string
  url: string
  caption?: string
  fallbackText: string
}

export interface WelcomeFlowInput {
  phone: string
  client?: { name?: string }
  dryRun?: boolean
}

export interface WelcomeStepResult {
  step: WelcomeStepId
  label: string
  ok: boolean
  dryRun: boolean
  fallbackUsed?: boolean
  code: string
  message: string
  result?: EvolutionSendResult
}

const SOCIAL_CAPTION = '👆🏼 Esses são alguns dos nossos 800 clientes que fizeram o teste do nosso servidor e se tornaram clientes fiéis, pela qualidade, suporte e diferença absurda de qualquer outro servidor do mercado!'

const FALLBACK_TEXTS = {
  welcome: 'Olá! Obrigado pelo contato. Vou te explicar rapidinho como funciona nosso teste e nosso atendimento.',
  explanation: 'A Central Play Plus trabalha com acesso estável, suporte rápido e aplicativos compatíveis com vários aparelhos. A qualidade depende bastante da internet e do aplicativo instalado, mas eu te ajudo na configuração.',
  device: 'Informe o aparelho do cliente para enviar o guia correto.',
}

export function buildWelcomeFlow(): WelcomeStep[] {
  return [
    {
      step: 'audio_1',
      type: 'audio',
      label: 'Audio de boas-vindas',
      url: process.env.WELCOME_AUDIO_URL || 'https://raw.githubusercontent.com/arthurpanza123-beep/public/main/boasvindas.ogg',
      fallbackText: FALLBACK_TEXTS.welcome,
    },
    {
      step: 'audio_2',
      type: 'audio',
      label: 'Audio de explicacao',
      url: process.env.EXPLANATION_AUDIO_URL || 'https://raw.githubusercontent.com/arthurpanza123-beep/public/main/explica%C3%A7%C3%A3o.ogg',
      fallbackText: FALLBACK_TEXTS.explanation,
    },
    {
      step: 'social_image',
      type: 'image',
      label: 'Imagem de prova social',
      url: process.env.SOCIAL_PROOF_IMAGE_URL || 'https://raw.githubusercontent.com/arthurpanza123-beep/public/main/artefeedbacks.png',
      caption: SOCIAL_CAPTION,
      fallbackText: SOCIAL_CAPTION,
    },
    {
      step: 'audio_4',
      type: 'audio',
      label: 'Audio perguntando aparelho',
      url: process.env.DEVICE_QUESTION_AUDIO_URL || 'https://raw.githubusercontent.com/arthurpanza123-beep/public/main/qualasuatv.ogg',
      fallbackText: FALLBACK_TEXTS.device,
    },
  ]
}

function resolveDryRun(inputDryRun?: boolean): boolean {
  const config = getEvolutionConfig()
  return Boolean(inputDryRun || config.dryRun || !config.enabled)
}

function assertOperatorOnly(phone: string, dryRun: boolean): { ok: true } | { ok: false; message: string } {
  if (dryRun) return { ok: true }
  const config = getEvolutionConfig()
  const target = normalizePhone(phone)
  const operator = normalizePhone(config.operatorWhatsapp)
  if (!target || !operator || target !== operator) {
    return { ok: false, message: 'Envio real bloqueado: nesta fase apenas OPERATOR_WHATSAPP e permitido.' }
  }
  return { ok: true }
}

export function getWelcomeStep(step: string): WelcomeStep | null {
  return buildWelcomeFlow().find((item) => item.step === step) || null
}

async function executeStep(phone: string, step: WelcomeStep, dryRun: boolean, context: Record<string, unknown>): Promise<WelcomeStepResult> {
  const result = step.type === 'audio'
    ? await sendAudio({ phone, audioUrl: step.url, dryRun, context })
    : await sendMedia({ phone, mediaUrl: step.url, caption: step.caption || '', type: 'image', mimetype: 'image/png', fileName: 'prova-social.png', dryRun, context })

  if (result.ok) {
    return { step: step.step, label: step.label, ok: true, dryRun: result.dryRun, code: result.code, message: result.message, result }
  }

  const fallback = await sendText({ phone, message: step.fallbackText, dryRun, context: { ...context, fallback_for: step.step } })
  return {
    step: step.step,
    label: step.label,
    ok: fallback.ok,
    dryRun: fallback.dryRun,
    fallbackUsed: true,
    code: fallback.ok ? 'FALLBACK_TEXT_SENT' : result.code,
    message: fallback.ok ? 'Midia falhou; fallback de texto executado.' : result.message,
    result: fallback.ok ? fallback : result,
  }
}

export async function dispatchWelcomeFlow(input: WelcomeFlowInput) {
  const dryRun = resolveDryRun(input.dryRun)
  const guard = assertOperatorOnly(input.phone, dryRun)
  if (!guard.ok) {
    return { ok: false, dryRun, code: 'OPERATOR_ONLY', message: guard.message, phone: maskPhone(input.phone), steps: buildWelcomeFlow() }
  }

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      code: 'WELCOME_DRY_RUN',
      message: 'Dry-run: nenhuma etapa real foi enviada.',
      phone: maskPhone(input.phone),
      status: 'aguardando_aparelho',
      steps: buildWelcomeFlow(),
    }
  }

  const results: WelcomeStepResult[] = []
  for (const step of buildWelcomeFlow()) {
    const result = await executeStep(input.phone, step, false, { flow: 'welcome', step: step.step, client: input.client || {} })
    results.push(result)
    if (!result.ok) {
      return {
        ok: false,
        dryRun: false,
        code: 'WELCOME_STEP_FAILED',
        message: `Falha na etapa ${step.step}.`,
        failedStep: step.step,
        phone: maskPhone(input.phone),
        results,
      }
    }
  }

  return { ok: true, dryRun: false, code: 'WELCOME_SENT', message: 'Fluxo de boas-vindas enviado.', phone: maskPhone(input.phone), status: 'aguardando_aparelho', results }
}

export async function retryWelcomeStep(input: WelcomeFlowInput & { step: WelcomeStepId }) {
  const step = getWelcomeStep(input.step)
  if (!step) {
    return { ok: false, code: 'INVALID_STEP', message: 'Etapa invalida.', allowed: buildWelcomeFlow().map((item) => item.step) }
  }

  const dryRun = resolveDryRun(input.dryRun)
  const guard = assertOperatorOnly(input.phone, dryRun)
  if (!guard.ok) {
    return { ok: false, dryRun, code: 'OPERATOR_ONLY', message: guard.message, phone: maskPhone(input.phone), step }
  }

  if (dryRun) {
    return { ok: true, dryRun: true, code: 'WELCOME_RETRY_DRY_RUN', message: 'Dry-run: retry preparado, sem envio real.', phone: maskPhone(input.phone), step }
  }

  const result = await executeStep(input.phone, step, false, { flow: 'welcome_retry', step: step.step, client: input.client || {} })
  return { ...result, phone: maskPhone(input.phone) }
}
