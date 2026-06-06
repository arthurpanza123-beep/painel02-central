export type InstallDevice =
  | 'Samsung'
  | 'LG'
  | 'Roku'
  | 'Android TV / Google TV / TCL'
  | 'TV Box'
  | 'Fire Stick / Mi Stick'
  | 'Celular Android'
  | 'iPhone / iOS'
  | 'Smart UP / Smart STB / Smart TV antiga'
  | 'PC'

export interface InstallApp {
  id: string
  name: string
  downloader?: string
  providerCode?: string
  devices: InstallDevice[]
}

export const INSTALL_DEVICES: InstallDevice[] = ['Samsung', 'LG', 'Roku', 'Android TV / Google TV / TCL', 'TV Box', 'Fire Stick / Mi Stick', 'Celular Android', 'iPhone / iOS', 'Smart UP / Smart STB / Smart TV antiga', 'PC']

export const INSTALL_APPS: InstallApp[] = [
  { id: 'xcloud', name: 'XCloud', downloader: '4866905', devices: INSTALL_DEVICES },
  { id: 'blessed', name: 'Blessed Player', downloader: '6552503', providerCode: '1105', devices: ['LG', 'Samsung', 'Roku', 'Android TV / Google TV / TCL', 'TV Box', 'Fire Stick / Mi Stick', 'Celular Android'] },
  { id: 'playsim', name: 'PlaySim', downloader: '7275096', providerCode: 'brtv', devices: ['LG', 'Samsung', 'Roku', 'Android TV / Google TV / TCL', 'TV Box', 'Fire Stick / Mi Stick', 'Celular Android'] },
  { id: 'funplay', name: 'FunPlay', downloader: '257286', providerCode: '00112', devices: ['LG', 'Samsung', 'Roku', 'Android TV / Google TV / TCL', 'TV Box', 'Fire Stick / Mi Stick', 'Celular Android'] },
  { id: 'smart-stb', name: 'Smart STB', devices: ['Samsung', 'LG', 'Android TV / Google TV / TCL', 'TV Box', 'Fire Stick / Mi Stick'] },
  { id: 'manual', name: 'Manual', devices: INSTALL_DEVICES },
]

const DOWNLOADER_VIDEO_URL = 'https://www.youtube.com/watch?v=ZCKnfzt1qaU'
const XCLOUD_ANDROID_URL = 'https://apk.centralplayplus.com.br/app/xcloudcelular.apk'
const XCLOUD_IOS_SEARCH_URL = 'https://apps.apple.com/pt/iphone/search?term=xcloud'
const PC_URL = 'http://webx.daxy.top/login'

function normalizeText(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeInstallDevice(value: unknown): InstallDevice {
  const normalized = normalizeText(value)
  if (normalized.includes('samsung') || normalized.includes('sansung')) return 'Samsung'
  if (normalized === 'lg' || /\blg\b/.test(normalized) || normalized.includes('tv lg') || normalized.includes('smart lg')) return 'LG'
  if (normalized.includes('roku')) return 'Roku'
  if (normalized.includes('box') || normalized.includes('caixinha')) return 'TV Box'
  if (normalized.includes('fire') || normalized.includes('stick') || normalized.includes('stik')) return 'Fire Stick / Mi Stick'
  if (normalized.includes('iphone') || normalized.includes('ios') || normalized.includes('apple')) return 'iPhone / iOS'
  if (normalized.includes('celular') || normalized.includes('telefone')) return 'Celular Android'
  if (normalized.includes('smart up') || normalized.includes('smart stb') || normalized.includes('tv antiga') || normalized.includes('dns')) return 'Smart UP / Smart STB / Smart TV antiga'
  if (normalized.includes('pc') || normalized.includes('computador') || normalized.includes('notebook') || normalized.includes('windows')) return 'PC'
  return 'Android TV / Google TV / TCL'
}

export function resolveInstallApp(value: unknown): InstallApp {
  const normalized = normalizeText(value)
  return INSTALL_APPS.find((app) => {
    const id = normalizeText(app.id)
    const name = normalizeText(app.name)
    return normalized === id || normalized === name || normalized.includes(id) || normalized.includes(name)
  }) || INSTALL_APPS[0]
}

function isXcloud(app: InstallApp): boolean {
  return /xcloud|x cloud/i.test(app.name)
}

function appDisplayName(app: InstallApp): string {
  return isXcloud(app) ? 'XCloud TV' : app.name
}

function downloaderMessage(app: InstallApp) {
  return [
    'Perfeito! 📺',
    '',
    'Para instalar siga o passo a passo desse vídeo',
    '',
    DOWNLOADER_VIDEO_URL,
    '',
    'abra o app *Downloader* e digite:',
    '',
    `*${app.downloader || '4866905'}*`,
    '',
    `Baixe, instale e abra o *${appDisplayName(app)}*.`,
  ].join('\n')
}

function storeMessage(app: InstallApp, storeLine: string, extraLine = '') {
  return [
    'Perfeito! 📺',
    '',
    storeLine,
    '',
    `*${appDisplayName(app)}*`,
    '',
    extraLine || null,
    extraLine ? '' : null,
  ].filter((line) => line !== null).join('\n')
}

export function buildInstallMessage(appValue: unknown = 'XCloud', deviceValue: unknown = 'LG'): string {
  const app = resolveInstallApp(appValue)
  const device = normalizeInstallDevice(deviceValue)

  if (!app.devices.includes(device)) {
    return [
      `${app.name} nao esta marcado como compativel com ${device}.`,
      '',
      'Sugestao: escolha XCloud ou FunPlay para esse aparelho, ou use a opcao Manual se o operador tiver outro guia.',
    ].join('\n')
  }

  if (device === 'Celular Android') {
    if (isXcloud(app)) {
      return [
        'Perfeito! 📱',
        '',
        'Baixe o *XCloud TV* por aqui:',
        '',
        XCLOUD_ANDROID_URL,
      ].join('\n')
    }
    return [
      'Perfeito! 📱',
      '',
      `Abra a Play Store do celular e pesquise por *${app.name}*.`,
    ].join('\n')
  }

  if (device === 'iPhone / iOS') {
    if (isXcloud(app)) {
      return [
        'Perfeito! 📱',
        '',
        'Abra este link da App Store:',
        '',
        XCLOUD_IOS_SEARCH_URL,
      ].join('\n')
    }
    return [
      'Perfeito! 📱',
      '',
      `Abra a App Store e pesquise por *${app.name}*.`,
    ].join('\n')
  }

  if (device === 'PC') {
    return [
      'Perfeito! 💻',
      '',
      'Para assistir pelo computador, acesse:',
      '',
      PC_URL,
    ].join('\n')
  }

  if (device === 'Smart UP / Smart STB / Smart TV antiga') {
    return [
      'Perfeito! 📺',
      '',
      'Nesse tipo de TV, a configuração muda um pouco.',
      '',
      'Abra o *Smart UP* ou *Smart STB* e deixe na tela de configuração.',
    ].join('\n')
  }

  if (device === 'Android TV / Google TV / TCL') return downloaderMessage(app)
  if (device === 'TV Box') return downloaderMessage(app)
  if (device === 'Fire Stick / Mi Stick') return downloaderMessage(app)

  if (device === 'Samsung' || device === 'LG' || device === 'Roku') {
    const storeLine = device === 'Roku'
      ? 'Na sua Roku TV, abra a loja de canais/apps e pesquise por:'
      : `Na sua TV ${device}, abra a loja de aplicativos e pesquise por:`
    const extraLine = device === 'LG' && isXcloud(app) ? 'Ele também pode aparecer como *IPTV XCloud Pro*.' : ''
    return storeMessage(app, storeLine, extraLine)
  }

  return [
    'Perfeito!',
    '',
    `Pesquise por *${appDisplayName(app)}* na loja de aplicativos do aparelho.`,
  ].join('\n')
}
