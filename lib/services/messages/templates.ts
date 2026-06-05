export type FlowKey =
  | 'test_created'
  | 'test_expired'
  | 'renewal_created'
  | 'install_requested'
  | 'app_swap'
  | 'second_screen'
  | 'problem_created'

export interface MessageContext {
  phone?: string
  cliente?: string
  clientName?: string
  app?: string
  codigo?: string
  code?: string
  usuario?: string
  username?: string
  senha?: string
  password?: string
  host?: string
  dns?: string
  painel?: string
  panel?: string
  link?: string
  valor?: string
  vencimento?: string
  device?: string
  plan?: string
  problem?: string
}

function pick(...values: Array<unknown>): string {
  for (const value of values) {
    const text = String(value || '').trim()
    if (text) return text
  }
  return ''
}

function optional(label: string, value: unknown): string | null {
  const text = pick(value)
  return text ? `${label}: ${text}` : null
}

export function buildTestCreatedMessage(ctx: MessageContext = {}) {
  const app = pick(ctx.app, 'Aplicativo')
  const isXcloud = /x\s*cloud|xcloud/i.test(app)
  return [
    'Teste ativado com sucesso!',
    '',
    optional('Cliente', pick(ctx.cliente, ctx.clientName)),
    optional('App', app),
    optional('Codigo', pick(ctx.codigo, ctx.code)),
    optional('Usuario', pick(ctx.usuario, ctx.username)),
    optional('Senha', pick(ctx.senha, ctx.password)),
    optional('Host/DNS', pick(ctx.host, ctx.dns)),
    '',
    isXcloud
      ? 'Abra o aplicativo e clique em RELOAD ou RECARREGAR para carregar a lista.'
      : 'Abra o aplicativo e entre com os dados acima.',
  ].filter(Boolean).join('\n')
}

export function buildTestExpiredOperatorMessage(ctx: MessageContext = {}) {
  return [
    `Teste encerrado: ${pick(ctx.cliente, ctx.clientName, 'Cliente')}`,
    optional('App', ctx.app),
    optional('Painel', pick(ctx.painel, ctx.panel)),
    optional('Abrir cliente', ctx.link),
  ].filter(Boolean).join('\n')
}

export function buildRenewalMessage(ctx: MessageContext = {}) {
  return [
    `Ola, ${pick(ctx.cliente, ctx.clientName, 'cliente')}.`,
    '',
    'Sua renovacao da Central Play Plus esta disponivel.',
    optional('Plano', pick(ctx.plan, ctx.app)),
    optional('Valor', ctx.valor),
    optional('Vencimento', ctx.vencimento),
  ].filter(Boolean).join('\n')
}

export const INSTALL_TEMPLATES: Record<string, string> = {
  lg: [
    'Perfeito. Para instalar XCloud TV na TV LG:',
    '',
    'Abra a loja de aplicativos da TV e pesquise por XCloud TV.',
    'Pode aparecer tambem como IPTV XCloud Pro.',
    'Instale o aplicativo e abra.',
  ].join('\n'),
  samsung: [
    'Perfeito. Para instalar XCloud TV na TV Samsung:',
    '',
    'Abra a loja de aplicativos da TV e pesquise por XCloud TV.',
    'Instale o aplicativo e abra.',
  ].join('\n'),
  roku: [
    'Perfeito. Para instalar XCloud TV no Roku:',
    '',
    'Abra a loja de canais/apps do Roku e pesquise por XCloud TV.',
    'Instale o aplicativo e abra.',
  ].join('\n'),
  android_tv: [
    'Perfeito. Para instalar XCloud TV no Android TV / Google TV / TCL:',
    '',
    'Abra o aplicativo Downloader no aparelho.',
    'Digite o codigo 4866905.',
    'Clique em ir e instale o aplicativo.',
  ].join('\n'),
  tv_box: [
    'Perfeito. Para instalar XCloud TV na TV Box:',
    '',
    'Abra o aplicativo Downloader no aparelho.',
    'Digite o codigo 4866905.',
    'Clique em ir e instale o aplicativo.',
  ].join('\n'),
  fire_stick: [
    'Perfeito. Para instalar XCloud TV no Fire Stick / Mi Stick:',
    '',
    'Abra o aplicativo Downloader no aparelho.',
    'Digite o codigo 4866905.',
    'Clique em ir e instale o aplicativo.',
  ].join('\n'),
  celular_android: [
    'Perfeito. Para instalar XCloud TV no celular Android:',
    '',
    'Use este link para instalar:',
    'https://apk.centralplayplus.com.br/app/xcloudcelular.apk',
    '',
    'Depois de instalar, abra o aplicativo.',
  ].join('\n'),
  iphone: [
    'Perfeito. Para instalar XCloud TV no iPhone:',
    '',
    'Use este link para instalar pela App Store:',
    'https://apps.apple.com/pt/iphone/search?term=xcloud',
    '',
    'Depois de instalar, abra o aplicativo.',
  ].join('\n'),
  pc: [
    'Perfeito. Para entrar pelo PC:',
    '',
    'Use um player IPTV compativel com Xtream/M3U.',
    'Depois entre com os dados do teste enviados.',
  ].join('\n'),
}

export const FLOW_MEDIA = {
  testValuesImageUrl: process.env.TEST_VALUES_IMAGE_URL || '',
  paymentConfirmedImageUrl: process.env.PAYMENT_CONFIRMED_IMAGE_URL || '',
  welcomeAudioUrl: process.env.WELCOME_AUDIO_URL || 'https://raw.githubusercontent.com/arthurpanza123-beep/public/main/boasvindas.ogg',
  explanationAudioUrl: process.env.EXPLANATION_AUDIO_URL || 'https://raw.githubusercontent.com/arthurpanza123-beep/public/main/explica%C3%A7%C3%A3o.ogg',
  socialProofImageUrl: process.env.SOCIAL_PROOF_IMAGE_URL || 'https://raw.githubusercontent.com/arthurpanza123-beep/public/main/artefeedbacks.png',
  deviceQuestionAudioUrl: process.env.DEVICE_QUESTION_AUDIO_URL || 'https://raw.githubusercontent.com/arthurpanza123-beep/public/main/qualasuatv.ogg',
}

function normalizeDeviceKey(device: string): string {
  const value = device.toLowerCase()
  if (value.includes('samsung')) return 'samsung'
  if (value.includes('lg')) return 'lg'
  if (value.includes('roku')) return 'roku'
  if (value.includes('box')) return 'tv_box'
  if (value.includes('fire') || value.includes('stick')) return 'fire_stick'
  if (value.includes('iphone') || value.includes('ios')) return 'iphone'
  if (value.includes('celular') || value.includes('android celular')) return 'celular_android'
  if (value.includes('pc') || value.includes('computador') || value.includes('notebook')) return 'pc'
  return 'android_tv'
}

export function buildInstallMessage(ctx: MessageContext = {}) {
  const key = normalizeDeviceKey(pick(ctx.device, 'Android TV / Google TV / TCL'))
  return INSTALL_TEMPLATES[key] || INSTALL_TEMPLATES.android_tv
}

export function buildAppSwapMessage(ctx: MessageContext = {}) {
  return [
    `Troca de aplicativo: ${pick(ctx.cliente, ctx.clientName, 'cliente')}`,
    optional('Novo app', ctx.app),
    '',
    'Prepare o novo aplicativo e confirme com o cliente antes de orientar a troca.',
  ].filter(Boolean).join('\n')
}

export function buildSecondScreenMessage(ctx: MessageContext = {}) {
  return [
    `Segunda tela solicitada: ${pick(ctx.cliente, ctx.clientName, 'cliente')}`,
    optional('App', ctx.app),
    '',
    'Confirme disponibilidade de tela e dados antes de enviar qualquer orientacao ao cliente.',
  ].filter(Boolean).join('\n')
}

export function buildProblemMessage(ctx: MessageContext = {}) {
  return [
    `Problema registrado: ${pick(ctx.cliente, ctx.clientName, 'cliente')}`,
    optional('App', ctx.app),
    optional('Ocorrencia', ctx.problem),
    '',
    'Prompt operacional pronto para triagem no Painel 2.',
  ].filter(Boolean).join('\n')
}

export function buildFlowMessage(flow: FlowKey, ctx: MessageContext = {}) {
  switch (flow) {
    case 'test_created': return buildTestCreatedMessage(ctx)
    case 'test_expired': return buildTestExpiredOperatorMessage(ctx)
    case 'renewal_created': return buildRenewalMessage(ctx)
    case 'install_requested': return buildInstallMessage(ctx)
    case 'app_swap': return buildAppSwapMessage(ctx)
    case 'second_screen': return buildSecondScreenMessage(ctx)
    case 'problem_created': return buildProblemMessage(ctx)
  }
}

export const ALLOWED_FLOWS: FlowKey[] = ['test_created', 'test_expired', 'renewal_created', 'install_requested', 'app_swap', 'second_screen', 'problem_created']
