import { getEvolutionConfig } from '../evolution/config'
import { maskPhone } from '../evolution/mask'
import { sendAudio } from '../evolution/send-audio'
import { sendMedia } from '../evolution/send-media'
import { sendText } from '../evolution/send-text'
import type { EvolutionSendResult } from '../evolution/types'
import { inspectEvolutionConversationHistory } from './conversation-history'
import { waitHumanizedDelivery, type HumanizedDeliveryResult } from './humanized-delivery'
import { inspectWelcomeCancellation, recordOperationalEvent, updateClientOperationalState, type OperationalClient } from './operational-store'

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
  client?: { id?: string; name?: string } | OperationalClient | null
  dryRun?: boolean
  force?: boolean
  startedAt?: string
  messageId?: string
  instance?: string
}

export interface WelcomeStepResult {
  step: WelcomeStepId
  label: string
  ok: boolean
  dryRun: boolean
  fallbackUsed?: boolean
  code: string
  message: string
  humanized?: HumanizedDeliveryResult
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

export function getWelcomeStep(step: string): WelcomeStep | null {
  return buildWelcomeFlow().find((item) => item.step === step) || null
}

async function welcomeCancelReason(input: WelcomeFlowInput, step?: WelcomeStep): Promise<string | false> {
  if (input.force || input.dryRun) return false
  const client = input.client && 'id' in input.client ? input.client as OperationalClient : null
  const check = await inspectWelcomeCancellation({
    client,
    phone: input.phone,
    startedAt: input.startedAt,
    messageId: input.messageId,
  })
  if (!check.cancelled) return false
  if (client?.id) {
    await updateClientOperationalState({
      client,
      metadataPatch: {
        welcome_flow_status: 'cancelled',
        welcome_flow_cancelled_at: new Date().toISOString(),
        welcome_cancel_reason: check.reason || 'cancelled',
        welcome_cancelled_step: step?.step || null,
      },
    }).catch(() => null)
    await recordOperationalEvent('WELCOME_CANCELLED', 'info', {
      client,
      phone: input.phone,
      stage: 'novo_lead',
      message: 'Fluxo de boas-vindas cancelado antes de enviar proxima etapa.',
      metadata: { flow: 'welcome', reason: check.reason || 'cancelled', step: step?.step || null },
    }).catch(() => null)
  }
  return check.reason || 'cancelled'
}

async function executeStep(input: WelcomeFlowInput, step: WelcomeStep, dryRun: boolean, context: Record<string, unknown>): Promise<WelcomeStepResult> {
  const humanized = await waitHumanizedDelivery({
    phone: input.phone,
    presence: step.type === 'audio' ? 'recording' : 'composing',
    dryRun,
    instance: input.instance,
    context: { ...context, delivery: 'humanized' },
    shouldContinue: () => welcomeCancelReason(input, step),
  })
  if (humanized.cancelled) {
    return {
      step: step.step,
      label: step.label,
      ok: false,
      dryRun,
      code: 'WELCOME_CANCELLED',
      message: `Fluxo cancelado: ${humanized.cancelReason || 'cancelled'}.`,
      humanized,
    }
  }
  const result = step.type === 'audio'
    ? await sendAudio({ phone: input.phone, audioUrl: step.url, dryRun, instance: input.instance, context })
    : await sendMedia({ phone: input.phone, mediaUrl: step.url, caption: step.caption || '', type: 'image', mimetype: 'image/png', fileName: 'prova-social.png', dryRun, instance: input.instance, context })

  if (result.ok) {
    return { step: step.step, label: step.label, ok: true, dryRun: result.dryRun, code: result.code, message: result.message, humanized, result }
  }

  const fallback = await sendText({ phone: input.phone, message: step.fallbackText, dryRun, instance: input.instance, context: { ...context, fallback_for: step.step } })
  return {
    step: step.step,
    label: step.label,
    ok: fallback.ok,
    dryRun: fallback.dryRun,
    fallbackUsed: true,
    code: fallback.ok ? 'FALLBACK_TEXT_SENT' : result.code,
    message: fallback.ok ? 'Midia falhou; fallback de texto executado.' : result.message,
    humanized,
    result: fallback.ok ? fallback : result,
  }
}

export async function dispatchWelcomeFlow(input: WelcomeFlowInput) {
  const dryRun = resolveDryRun(input.dryRun)
  const history = input.force ? { checked: false, allowWelcome: true, messageCount: 0, reason: 'Forcado pelo operador.' } : await inspectEvolutionConversationHistory({
    phone: input.phone,
    messageId: input.messageId,
  }).catch((error) => ({
    checked: false,
    allowWelcome: false,
    messageCount: 0,
    reason: error instanceof Error ? error.message : 'Falha ao consultar historico.',
  }))
  if (!history.allowWelcome) {
    return {
      ok: true,
      dryRun,
      skipped: true,
      code: 'WELCOME_SKIPPED_RECENT_HISTORY',
      message: 'Boas-vindas nao enviadas para evitar reiniciar conversa ativa.',
      phone: maskPhone(input.phone),
      history,
      steps: buildWelcomeFlow(),
    }
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
    const cancelReason = await welcomeCancelReason(input, step)
    if (cancelReason) {
      return {
        ok: true,
        dryRun: false,
        cancelled: true,
        code: 'WELCOME_CANCELLED',
        message: `Fluxo de boas-vindas cancelado: ${cancelReason}.`,
        phone: maskPhone(input.phone),
        status: 'cancelled',
        cancelReason,
        results,
      }
    }
    const result = await executeStep(input, step, false, { flow: 'welcome', step: step.step, client: input.client || {} })
    results.push(result)
    if (result.code === 'WELCOME_CANCELLED') {
      return {
        ok: true,
        dryRun: false,
        cancelled: true,
        code: 'WELCOME_CANCELLED',
        message: result.message,
        phone: maskPhone(input.phone),
        status: 'cancelled',
        results,
      }
    }
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

  if (input.client && 'id' in input.client && input.client.id) {
    await updateClientOperationalState({
      client: input.client as OperationalClient,
      metadataPatch: {
        welcome_flow_status: 'completed',
        welcome_flow_completed_at: new Date().toISOString(),
        active_flow_type: 'welcome',
      },
    }).catch(() => null)
  }

  return { ok: true, dryRun: false, code: 'WELCOME_SENT', message: 'Fluxo de boas-vindas enviado.', phone: maskPhone(input.phone), status: 'aguardando_aparelho', results }
}

export async function retryWelcomeStep(input: WelcomeFlowInput & { step: WelcomeStepId }) {
  const step = getWelcomeStep(input.step)
  if (!step) {
    return { ok: false, code: 'INVALID_STEP', message: 'Etapa invalida.', allowed: buildWelcomeFlow().map((item) => item.step) }
  }

  const dryRun = resolveDryRun(input.dryRun)
  if (dryRun) {
    return { ok: true, dryRun: true, code: 'WELCOME_RETRY_DRY_RUN', message: 'Dry-run: retry preparado, sem envio real.', phone: maskPhone(input.phone), step }
  }

  const result = await executeStep(input, step, false, { flow: 'welcome_retry', step: step.step, client: input.client || {} })
  return { ...result, phone: maskPhone(input.phone) }
}
