import { buildInstallMessage as buildInstallTemplate } from './install-templates'
import { buildProviderCredentials, type BuiltCredentials } from '@/lib/config/provider-catalog'

export type FlowKey =
  | 'test_created'
  | 'test_expired'
  | 'operator_test_expired'
  | 'access_activated'
  | 'access_updated'
  | 'renewal_created'
  | 'install_requested'
  | 'app_swap'
  | 'second_screen'
  | 'problem_created'

export interface MessageContext {
  phone?: string
  id?: string
  testId?: string
  test_id?: string
  client_id?: string
  cliente?: string
  clientName?: string
  clientPhone?: string
  client_phone?: string
  app?: string
  pedido?: string
  orderId?: string
  order_id?: string
  providerOrderId?: string
  provider_order_id?: string
  codigo?: string
  code?: string
  provider_code?: string
  providerCode?: string
  usuario?: string
  username?: string
  senha?: string
  password?: string
  host?: string
  dns?: string
  provider?: string
  painel?: string
  panel?: string
  link?: string
  valor?: string
  vencimento?: string
  device?: string
  plan?: string
  problem?: string
  amount?: string
  dueAt?: string
  expiredAt?: string
  expired_at?: string
  expiresAt?: string
  expires_at?: string
  idempotency_key?: string
  audience?: 'operator' | 'customer' | string
  provider_url?: string
  providerUrl?: string
  xcloud_remove_status?: string
  xcloudRemoveStatus?: string
  device_key?: string
  deviceKey?: string
  manual_close_required?: boolean | string
  manualCloseRequired?: boolean | string
}

export interface FlowMediaMessage {
  kind: 'media'
  mediaUrl: string
  caption: string
  type: 'image' | 'sticker'
  mimetype: string
  fileName: string
  context: Record<string, unknown>
  fallbackText?: string
}

export type FlowMessagePart = string | FlowMediaMessage
export type FlowMessage = FlowMessagePart | FlowMessagePart[]

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

function boldField(label: string, value: unknown): string | null {
  const text = pick(value)
  return text ? `*${label}:* ${text}` : null
}

function boldCredentialLine(line: string): string {
  const [label, ...rest] = line.split(':')
  const value = rest.join(':').trim()
  const normalizedLabel = label.trim()
  const displayLabel = normalizedLabel === 'Usuario' ? 'Usuário' : normalizedLabel === 'Codigo' || normalizedLabel === 'Código' ? 'Code' : normalizedLabel
  return value ? `*${displayLabel}:* ${value}` : line
}

function joinMessage(lines: Array<string | null | undefined>): string {
  return lines.filter((line): line is string => line !== null && line !== undefined).join('\n')
}

function isXcloudApp(value: unknown): boolean {
  return /x\s*cloud|xcloud/i.test(pick(value))
}

function isBlessedApp(value: unknown): boolean {
  return /blessed/i.test(pick(value))
}

function isSmartTvApp(value: unknown): boolean {
  return /smart\s*(stb|up)|stb|smart\s*tv/i.test(pick(value))
}

const ACCESS_CREDENTIALS_NOT_FOUND_MESSAGE = 'Usuário e senha não foram encontrados no texto colado. Cole novamente os dados completos do painel antes de enviar ao cliente.'
const MASKED_CREDENTIAL_RE = /^(?:\*+|x{3,}|X{3,}|-+|_+|•+|●+)$/

function cleanCredential(value: unknown): string {
  return String(value || '')
    .trim()
    .replace(/^[*_`"'\s]+/g, '')
    .replace(/[*_`"',.;\s]+$/g, '')
    .trim()
}

function invalidCredential(value: unknown): boolean {
  const text = cleanCredential(value)
  return !text || /^(?:null|undefined)$/i.test(text) || MASKED_CREDENTIAL_RE.test(text)
}

function formatDateBR(value: unknown): string {
  const text = pick(value)
  if (!text) return ''
  const br = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (br) return `${br[1]}/${br[2]}/${br[3]}`
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return text
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(date)
}

function parseAmount(value: string): number | null {
  const cleaned = value.replace(/[^\d,.-]/g, '').trim()
  if (!cleaned) return null
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function formatCurrencyBRL(value: unknown): string {
  const text = pick(value)
  if (!text) return ''
  const amount = typeof value === 'number' ? value : parseAmount(text)
  if (amount === null) return text
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount).replace(/\u00a0/g, ' ')
}

function catalogCredentials(ctx: MessageContext): BuiltCredentials | null {
  const provider = pick(ctx.provider, ctx.painel, ctx.panel)
  const app = pick(ctx.app)
  if (!provider || !app) return null
  try {
    return buildProviderCredentials({
      provider,
      app,
      username: pick(ctx.usuario, ctx.username),
      password: pick(ctx.senha, ctx.password),
      host: pick(ctx.host, ctx.dns),
    })
  } catch {
    return null
  }
}

function credentialHeader(credentials: BuiltCredentials | null, ctx: MessageContext): string {
  if (credentials?.fields.includes('provider') && credentials.providerCode) return `Provider: ${credentials.providerCode}`
  if (credentials?.fields.includes('code') && credentials.code) return `Code: ${credentials.code}`
  if (credentials?.fields.includes('dns') && credentials.dns) return `DNS: ${credentials.dns}`
  if (credentials?.fields.includes('url') && credentials.url) return `URL: ${credentials.url}`
  const code = pick(ctx.codigo, ctx.code)
  if (code) return `Code: ${code}`
  const dns = pick(ctx.dns)
  if (dns) return `DNS: ${dns}`
  return ''
}

function blessedProviderCode(ctx: MessageContext): string {
  const credentials = catalogCredentials(ctx)
  return pick(ctx.provider_code, ctx.providerCode, credentials?.providerCode, credentials?.code, ctx.codigo, ctx.code, '1105')
}

function blessedCredentialLines(ctx: MessageContext): string[] {
  const credentials = catalogCredentials(ctx)
  return [
    optional('Provider', blessedProviderCode(ctx)),
    optional('Usuario', pick(ctx.usuario, ctx.username, credentials?.username)),
    optional('Senha', pick(ctx.senha, ctx.password, credentials?.password)),
  ].filter((line): line is string => Boolean(line))
}

function credentialLines(ctx: MessageContext): string[] {
  if (isBlessedApp(ctx.app)) {
    return blessedCredentialLines(ctx)
  }

  if (isXcloudApp(ctx.app)) {
    return [
      optional('Host', pick(ctx.host, ctx.dns)),
      optional('Usuario', pick(ctx.usuario, ctx.username)),
      optional('Senha', pick(ctx.senha, ctx.password)),
    ].filter((line): line is string => Boolean(line))
  }

  const credentials = catalogCredentials(ctx)
  const fields = credentials?.fields || []
  const header = credentialHeader(credentials, ctx)
  return [
    header || null,
    fields.includes('name') ? optional('Nome', pick(ctx.cliente, ctx.clientName, credentials?.providerName)) : null,
    fields.includes('url') && !header ? optional('URL', pick(credentials?.url, ctx.host)) : null,
    fields.includes('dns') && !header ? optional('DNS', pick(ctx.dns, credentials?.dns)) : null,
    fields.includes('host') ? optional('Host', pick(ctx.host, credentials?.host)) : null,
    optional('Usuario', pick(ctx.usuario, ctx.username, credentials?.username)),
    optional('Senha', pick(ctx.senha, ctx.password, credentials?.password)),
  ].filter((line): line is string => Boolean(line))
}

export type FlowValidationResult =
  | { ok: true }
  | { ok: false; code: string; message: string; missing_fields: string[] }

function accessCredentialRequirements(ctx: MessageContext): Array<{ key: string; label: string; value: string }> {
  const credentials = catalogCredentials(ctx)
  const app = pick(ctx.app).toLowerCase()
  const common = [
    { key: 'username', label: 'Usuário', value: pick(ctx.usuario, ctx.username, credentials?.username) },
    { key: 'password', label: 'Senha', value: pick(ctx.senha, ctx.password, credentials?.password) },
  ]

  if (isXcloudApp(ctx.app)) {
    return [{ key: 'host', label: 'Host', value: pick(ctx.host, ctx.dns, credentials?.host) }, ...common]
  }
  if (/blessed/.test(app)) {
    return [{ key: 'provider', label: 'Provider', value: blessedProviderCode(ctx) }, ...common]
  }
  if (credentials?.fields.includes('provider')) {
    return [{ key: 'provider', label: 'Provider', value: pick(ctx.provider_code, ctx.providerCode, credentials?.providerCode) }, ...common]
  }
  if (/playsim|play sim|assist/.test(app) || credentials?.fields.includes('code')) {
    return [{ key: 'code', label: 'Code', value: pick(ctx.codigo, ctx.code, credentials?.code) }, ...common]
  }
  if (isSmartTvApp(ctx.app) || credentials?.fields.includes('dns')) {
    return [{ key: 'dns', label: 'DNS', value: pick(ctx.dns, credentials?.dns, ctx.host) }, ...common]
  }

  return common
}

export function validateFlowContext(flow: FlowKey, ctx: MessageContext = {}): FlowValidationResult {
  if (flow !== 'access_activated' && flow !== 'access_updated') return { ok: true }
  const missing = accessCredentialRequirements(ctx).filter((item) => invalidCredential(item.value))
  if (!missing.length) return { ok: true }
  return {
    ok: false,
    code: 'ACCESS_CREDENTIALS_INCOMPLETE',
    message: ACCESS_CREDENTIALS_NOT_FOUND_MESSAGE,
    missing_fields: missing.map((item) => item.label),
  }
}

function smartTvLines(ctx: MessageContext): string[] {
  const credentials = catalogCredentials(ctx)
  return [
    optional('DNS Smart TV', pick(ctx.dns, credentials?.dns, credentials?.smartStbDns?.[0]?.value)),
    optional('Usuario', pick(ctx.usuario, ctx.username, credentials?.username)),
    optional('Senha', pick(ctx.senha, ctx.password, credentials?.password)),
    pick(ctx.host, credentials?.host) ? ['', 'Se a TV pedir servidor/portal, use:', pick(ctx.host, credentials?.host)].join('\n') : null,
  ].filter((line): line is string => Boolean(line))
}

function shortTestPedido(ctx: MessageContext): string {
  const order = pick(ctx.pedido, ctx.orderId, ctx.order_id, ctx.providerOrderId, ctx.provider_order_id)
  if (order && !/^null$/i.test(order)) return order.startsWith('#') ? order : `#${order}`

  const id = pick(ctx.testId, ctx.test_id, ctx.id)
  const safe = id.replace(/[^a-z0-9]/gi, '').slice(0, 4).toUpperCase()
  if (safe) return `#${safe}`
  return 'teste ativo'
}

export const TEST_VALUES_IMAGE_URL = 'https://raw.githubusercontent.com/arthurpanza123-beep/public/main/c94afca7-0531-4e2a-bb30-f171a87b6bf5.png'
export const TEST_EXPIRED_STICKER_URL = process.env.TEST_EXPIRED_STICKER_URL || 'https://raw.githubusercontent.com/arthurpanza123-beep/public/main/figu.webp'
export const ACCESS_ACTIVATED_IMAGE_URL = process.env.ACCESS_ACTIVATED_IMAGE_URL || 'https://raw.githubusercontent.com/arthurpanza123-beep/public/main/ativado.png'

function buildValuesImageMedia(ctx: MessageContext, flow: FlowKey, caption = ''): FlowMediaMessage {
  return {
    kind: 'media',
    mediaUrl: TEST_VALUES_IMAGE_URL,
    caption,
    type: 'image',
    mimetype: 'image/png',
    fileName: 'valores-central-play-plus.png',
    context: {
      flow,
      app: pick(ctx.app) || undefined,
      clientName: pick(ctx.cliente, ctx.clientName) || undefined,
      mediaKind: 'values_image',
      test_id: pick(ctx.testId, ctx.test_id, ctx.id) || undefined,
    },
  }
}

function buildBlessedPremiumMedia(ctx: MessageContext = {}, flow: 'test_created' | 'access_activated' | 'access_updated'): FlowMediaMessage[] {
  const app = pick(ctx.app, 'Blessed Player')
  const clientName = pick(ctx.cliente, ctx.clientName, 'Cliente')
  const credentials = blessedCredentialLines(ctx).map(boldCredentialLine)
  const title = flow === 'test_created'
    ? '*Teste ativado com sucesso!* ✅'
    : flow === 'access_updated'
      ? '*Acesso atualizado com sucesso!* ✅'
      : '*Acesso ativado com sucesso!* ✅'
  const fields = [
    boldField('Cliente', clientName),
    boldField('Aplicativo', app),
    flow === 'test_created' ? boldField('Pedido', shortTestPedido(ctx)) : null,
    flow !== 'test_created' ? boldField('Plano', ctx.plan) : null,
    flow !== 'test_created' ? boldField('Valor', formatCurrencyBRL(pick(ctx.valor, ctx.amount))) : null,
    flow !== 'test_created' ? boldField('Vencimento', formatDateBR(pick(ctx.vencimento, ctx.dueAt))) : null,
  ].filter((line): line is string => Boolean(line))
  const caption = joinMessage([
    title,
    '',
    ...fields,
    credentials.length ? ['', '*Dados de acesso:*', ...credentials].join('\n') : null,
    '',
    flow === 'access_updated' ? 'Seu acesso foi atualizado.' : 'Seu acesso já está liberado.',
    'Agora é só abrir o aplicativo e entrar com os dados acima.',
    '',
    'Se precisar, eu te ajudo na configuração. 🚀',
  ])
  const valuesCaption = flow === 'test_created'
    ? 'Gostando da qualidade, é só escolher um dos planos da arte que eu ativo no mesmo atendimento. 🍿'
    : 'Segue também a arte de valores da Central Play Plus para consulta de planos e renovações.'

  return [
    {
      kind: 'media',
      mediaUrl: ACCESS_ACTIVATED_IMAGE_URL,
      caption,
      type: 'image',
      mimetype: 'image/png',
      fileName: flow === 'test_created' ? 'teste-ativado.png' : 'acesso-ativado.png',
      fallbackText: caption,
      context: {
        flow,
        app,
        clientName,
        provider: blessedProviderCode(ctx),
        mediaKind: 'main_image',
      },
    },
    buildValuesImageMedia(ctx, flow, valuesCaption),
  ]
}

export function buildXcloudTestCreatedMedia(ctx: MessageContext = {}): FlowMediaMessage {
  const clientName = pick(ctx.cliente, ctx.clientName, 'Cliente')
  const pedido = shortTestPedido(ctx)
  const caption = [
    'Teste ativado com sucesso!',
    '',
    `Cliente: ${clientName}`,
    `Pedido: ${pedido}`,
    '',
    'Abra o app e clique em *RELOAD* ou *RECARREGAR*.',
    '',
    'Gostando da qualidade, é só escolher um dos planos acima que eu renovo no mesmo login, sem precisar configurar tudo de novo.',
    '',
    'Qual plano você vai querer ativar depois do teste? 🍿',
  ].join('\n')

  return {
    kind: 'media',
    mediaUrl: TEST_VALUES_IMAGE_URL,
    caption,
    type: 'image',
    mimetype: 'image/png',
    fileName: 'valores-central-play-plus.png',
    context: {
      flow: 'test_created',
      app: pick(ctx.app, 'XCloud'),
      clientName,
      pedido,
      test_id: pick(ctx.testId, ctx.test_id, ctx.id) || undefined,
      source: pick((ctx as Record<string, unknown>).source) || undefined,
      operator_ref: pick((ctx as Record<string, unknown>).operator_ref) || undefined,
    },
  }
}

export function buildTestCreatedMessage(ctx: MessageContext = {}) {
  const app = pick(ctx.app, 'Aplicativo')
  const isXcloud = isXcloudApp(app)
  if (isXcloud) return buildXcloudTestCreatedMedia(ctx)
  if (isBlessedApp(app)) return buildBlessedPremiumMedia(ctx, 'test_created')
  const credentials = credentialLines(ctx)

  return [
    'Teste ativado com sucesso!',
    '',
    optional('Cliente', pick(ctx.cliente, ctx.clientName)),
    optional('App', app),
    credentials.length ? ['Dados de acesso:', '', ...credentials].join('\n') : optional('Host/DNS', pick(ctx.host, ctx.dns)),
    '',
    'Abra o aplicativo e entre com os dados acima.',
  ].filter(Boolean).join('\n')
}

export function buildTestExpiredOperatorMessage(ctx: MessageContext = {}) {
  const manualCloseRequired = ctx.manual_close_required === true ||
    ctx.manualCloseRequired === true ||
    pick(ctx.manual_close_required, ctx.manualCloseRequired).toLowerCase() === 'true'
  const providerUrl = pick(ctx.provider_url, ctx.providerUrl)
  const xcloudStatus = pick(ctx.xcloud_remove_status, ctx.xcloudRemoveStatus)
  const panel = pick(ctx.painel, ctx.panel)
  const username = pick(ctx.usuario, ctx.username)
  const app = pick(ctx.app, 'Aplicativo')
  const clientName = pick(ctx.cliente, ctx.clientName, 'Cliente')
  const deviceKey = pick(ctx.device_key, ctx.deviceKey)
  const xcloudStatusLower = xcloudStatus.toLowerCase()
  const xcloudOk = isXcloudApp(app) && !manualCloseRequired && (
    xcloudStatusLower.includes('removido') ||
    xcloudStatusLower.includes('corretamente') ||
    xcloudStatusLower.includes('already') ||
    xcloudStatusLower.includes('sucesso') ||
    xcloudStatusLower.includes('success')
  )
  const xcloudFailed = isXcloudApp(app) && !manualCloseRequired && !xcloudOk

  if (xcloudOk) {
    return joinMessage([
      '⚠️ *Teste expirado*',
      '',
      boldField('Cliente', clientName),
      boldField('App', app),
      '*Remoção XCloud:* *removido corretamente*',
      '',
      'Figurinha enviada ao cliente.',
      'Não precisa fazer nada no Yellow Box.',
    ])
  }

  if (xcloudFailed) {
    return joinMessage([
      '⚠️ *Teste expirado — ação necessária*',
      '',
      boldField('Cliente', clientName),
      boldField('App', app),
      '*Remoção XCloud:* *falhou*',
      '',
      'Não consegui remover a device automaticamente.',
      '',
      'Remova manualmente:',
      boldField('Device key', deviceKey || '-'),
      boldField('Usuário', username || '-'),
      boldField('Painel', panel || '-'),
      '',
      'Abrir XCloud:',
      providerUrl || '-',
      '',
      'Figurinha já foi enviada ao cliente.',
    ])
  }

  return joinMessage([
    '⚠️ *Teste expirado — encerrar no painel*',
    '',
    boldField('Cliente', clientName),
    boldField('App', app),
    boldField('Usuário', username || '-'),
    boldField('Painel', panel || '-'),
    '',
    'Figurinha enviada ao cliente.',
    'Encerre esse usuário no painel do provedor.',
    '',
    'Abrir painel:',
    providerUrl || '-',
  ])
}

export function buildTestExpiredCustomerMessage(ctx: MessageContext = {}): FlowMediaMessage | string {
  const clientName = pick(ctx.cliente, ctx.clientName, 'cliente')
  const fallbackText = [
    'Teste encerrado. Se quiser ativar, me chama aqui.',
  ].join('\n')

  if (!TEST_EXPIRED_STICKER_URL) return fallbackText

  return {
    kind: 'media',
    mediaUrl: TEST_EXPIRED_STICKER_URL,
    caption: '',
    type: 'sticker',
    mimetype: 'image/webp',
    fileName: 'teste-encerrado.webp',
    fallbackText,
    context: {
      flow: 'test_expired',
      app: pick(ctx.app) || undefined,
      clientName,
      test_id: pick(ctx.testId, ctx.test_id, ctx.id) || undefined,
      mediaKind: 'sticker',
    },
  }
}

export function buildRenewalMessage(ctx: MessageContext = {}) {
  const fields = [
    boldField('Cliente', pick(ctx.cliente, ctx.clientName)),
    boldField('Plano', pick(ctx.plan, ctx.app)),
    boldField('Valor', formatCurrencyBRL(pick(ctx.valor, ctx.amount))),
    boldField('Novo vencimento', formatDateBR(pick(ctx.vencimento, ctx.dueAt))),
  ].filter((line): line is string => Boolean(line))

  return joinMessage([
    '*Renovação confirmada!* 🔄✅',
    '',
    ...fields,
    '',
    'Seu acesso segue ativo normalmente.',
    'Não precisa configurar tudo de novo.',
    '',
    'Qualquer coisa, é só me chamar. 🚀',
  ])
}

export function buildAccessActivatedMessage(ctx: MessageContext = {}) {
  const app = pick(ctx.app, 'Aplicativo')
  if (isBlessedApp(app)) return buildBlessedPremiumMedia(ctx, 'access_activated')

  const isXcloud = isXcloudApp(app)
  const credentials = credentialLines(ctx).map(boldCredentialLine)
  const fields = [
    boldField('Cliente', pick(ctx.cliente, ctx.clientName)),
    boldField('Aplicativo', app),
    boldField('Plano', ctx.plan),
    boldField('Valor', formatCurrencyBRL(pick(ctx.valor, ctx.amount))),
    boldField('Vencimento', formatDateBR(pick(ctx.vencimento, ctx.dueAt))),
    boldField('Painel', pick(ctx.painel, ctx.panel, ctx.provider)),
  ].filter((line): line is string => Boolean(line))

  const baseCaption = [
    '*Acesso ativado com sucesso!* ✅',
    '',
    ...fields,
    credentials.length ? ['', '*Dados de acesso:*', ...credentials].join('\n') : null,
    '',
    'Seu acesso já está liberado.',
    isXcloud ? 'Agora é só abrir o aplicativo e entrar com suas credenciais.' : 'Agora é só abrir o aplicativo e entrar com seus dados.',
    '',
    isXcloud ? 'Depois de entrar, clique em *RELOAD* ou *RECARREGAR* para atualizar a lista.' : null,
    isXcloud ? '' : null,
    'Se precisar, eu te ajudo na configuração. 🚀',
  ]

  const caption = joinMessage(baseCaption)

  return {
    kind: 'media',
    mediaUrl: ACCESS_ACTIVATED_IMAGE_URL,
    caption,
    type: 'image',
    mimetype: 'image/png',
    fileName: 'acesso-ativado.png',
    fallbackText: caption,
    context: {
      flow: 'access_activated',
      app,
      clientName: pick(ctx.cliente, ctx.clientName) || undefined,
      panel: pick(ctx.painel, ctx.panel, ctx.provider) || undefined,
      plan: pick(ctx.plan) || undefined,
      dueAt: formatDateBR(pick(ctx.vencimento, ctx.dueAt)) || undefined,
    },
  } satisfies FlowMediaMessage
}

export function buildAccessUpdatedMessage(ctx: MessageContext = {}) {
  const app = pick(ctx.app, 'Aplicativo')
  if (isBlessedApp(app)) return buildBlessedPremiumMedia(ctx, 'access_updated')

  const isXcloud = isXcloudApp(app)
  const credentials = credentialLines(ctx).map(boldCredentialLine)

  return joinMessage([
    '*Acesso atualizado com sucesso!* ✅',
    '',
    boldField('Cliente', pick(ctx.cliente, ctx.clientName)),
    boldField('Aplicativo', app),
    boldField('Painel', pick(ctx.painel, ctx.panel, ctx.provider)),
    '',
    credentials.length ? ['*Dados de acesso:*', ...credentials].join('\n') : null,
    '',
    'Seu acesso foi atualizado.',
    'Agora é só abrir o aplicativo e entrar com os novos dados.',
    '',
    isXcloud ? 'Se precisar, clique em *RELOAD* ou *RECARREGAR* para atualizar a lista.' : null,
    isXcloud ? '' : null,
    'Se precisar, eu te ajudo na configuração. 🚀',
  ])
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
  return buildInstallTemplate(pick(ctx.app, 'XCloud'), pick(ctx.device, 'Android TV / Google TV / TCL'))
}

export function buildAppSwapMessage(ctx: MessageContext = {}) {
  const credentials = credentialLines(ctx)
  return [
    `Troca de aplicativo: ${pick(ctx.cliente, ctx.clientName, 'cliente')}`,
    optional('Novo app', ctx.app),
    optional('Painel', pick(ctx.painel, ctx.panel, ctx.provider)),
    credentials.length ? ['', 'Dados do novo app:', '', ...credentials].join('\n') : null,
    '',
    'Prepare o novo aplicativo e confirme com o cliente antes de orientar a troca.',
  ].filter(Boolean).join('\n')
}

export function buildSecondScreenMessage(ctx: MessageContext = {}) {
  const credentials = (isSmartTvApp(ctx.app) ? smartTvLines(ctx) : credentialLines(ctx)).map(boldCredentialLine)
  const isXcloud = isXcloudApp(ctx.app)
  const audience = pick(ctx.audience).toLowerCase() === 'customer' ? 'customer' : 'operator'

  if (audience === 'customer') {
    return joinMessage([
      '*Segunda tela liberada!* 📺✅',
      '',
      boldField('Aplicativo', ctx.app),
      ...credentials,
      '',
      'Abra o aplicativo na segunda TV e entre com os dados acima.',
      null,
      '',
      'Se precisar, eu te ajudo na configuração. 🚀',
    ])
  }

  return joinMessage([
    '*Segunda tela preparada* 📺',
    '',
    boldField('Cliente', pick(ctx.cliente, ctx.clientName, 'cliente')),
    boldField('Aplicativo', ctx.app),
    boldField('Painel', pick(ctx.painel, ctx.panel, ctx.provider)),
    '',
    credentials.length ? ['*Credencial que será usada:*', ...credentials].join('\n') : null,
    '',
    isXcloud ? 'Confira a liberação da segunda tela antes de orientar o cliente.' : null,
    isXcloud ? '' : null,
    'Confira a tela e os dados antes de orientar o cliente.',
  ])
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

export function buildFlowMessage(flow: FlowKey, ctx: MessageContext = {}): FlowMessage {
  switch (flow) {
    case 'test_created': return buildTestCreatedMessage(ctx)
    case 'test_expired': return pick(ctx.phone) ? buildTestExpiredCustomerMessage(ctx) : buildTestExpiredOperatorMessage(ctx)
    case 'operator_test_expired': return buildTestExpiredOperatorMessage(ctx)
    case 'access_activated': return buildAccessActivatedMessage(ctx)
    case 'access_updated': return buildAccessUpdatedMessage(ctx)
    case 'renewal_created': return buildRenewalMessage(ctx)
    case 'install_requested': return buildInstallMessage(ctx)
    case 'app_swap': return buildAppSwapMessage(ctx)
    case 'second_screen': return buildSecondScreenMessage(ctx)
    case 'problem_created': return buildProblemMessage(ctx)
  }
}

export const ALLOWED_FLOWS: FlowKey[] = ['test_created', 'test_expired', 'operator_test_expired', 'access_activated', 'access_updated', 'renewal_created', 'install_requested', 'app_swap', 'second_screen', 'problem_created']
