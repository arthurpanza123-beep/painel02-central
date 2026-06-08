const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const originalResolve = Module._resolveFilename

Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    return originalResolve.call(this, path.join(root, request.slice(2)), parent, isMain, options)
  }
  return originalResolve.call(this, request, parent, isMain, options)
}

require.extensions['.ts'] = function compileTs(module, filename) {
  const source = fs.readFileSync(filename, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  })
  module._compile(output.outputText, filename)
}

process.env.EVOLUTION_ENABLED = 'false'
process.env.EVOLUTION_DRY_RUN = 'true'
process.env.NEXT_PUBLIC_SUPABASE_URL = ''
process.env.SUPABASE_URL = ''
process.env.SUPABASE_SERVICE_ROLE_KEY = ''

const { buildFlowMessage, validateFlowContext } = require(path.join(root, 'lib/services/messages/templates.ts'))
const { dispatchFlow } = require(path.join(root, 'lib/services/messages/dispatch-flow.ts'))

function captionOf(message) {
  if (Array.isArray(message)) return message.map((part) => typeof part === 'string' ? part : part.caption).join('\n')
  return typeof message === 'string' ? message : message.caption
}

function partsOf(message) {
  return Array.isArray(message) ? message : [message]
}

function mediaPartsOf(message) {
  return partsOf(message).filter((part) => typeof part !== 'string')
}

function mediaRequestsOf(result) {
  const requests = Array.isArray(result.results)
    ? result.results.map((item) => item.request?.body).filter(Boolean)
    : result.request?.body
      ? [result.request.body]
      : []
  return requests.filter((body) => body.mediatype || body.fileName || body.media)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function preview(caption) {
  return caption.replace(/\*Senha:\* .+/g, '*Senha:* <present>')
}

const base = {
  cliente: 'Cliente Teste',
  panel: 'Yellow Box',
  plan: 'Mensal 1 tela',
  amount: 'R$ 20.00',
  dueAt: '2026-07-08T02:59:59.000Z',
  username: '12345678',
  password: '87654321',
}

async function main() {
const blessed = captionOf(buildFlowMessage('access_activated', {
  ...base,
  app: 'Blessed Player',
  host: 'http://recordsway.shop:80',
}))
const blessedMedia = mediaPartsOf(buildFlowMessage('access_activated', {
  ...base,
  app: 'Blessed Player',
  host: 'http://recordsway.shop:80',
}))
assert(validateFlowContext('access_activated', { ...base, app: 'Blessed Player' }).ok, 'Blessed deveria validar.')
assert(blessed.includes('Provider: 1105'), 'Blessed deve enviar Provider 1105.')
assert(blessed.includes('Usuário: 12345678'), 'Blessed deve enviar usuário.')
assert(blessed.includes('Senha: 87654321'), 'Blessed deve enviar senha.')
assert(!/Host:/i.test(blessed), 'Blessed não deve enviar Host.')
assert(!/xtream/i.test(blessed), 'Blessed não deve mencionar Xtream.')
assert(!/reload|recarregar/i.test(blessed), 'Blessed não deve mencionar RELOAD/RECARREGAR.')
assert(blessed.includes('Valor: R$ 20,00'), 'Valor deve estar em BRL brasileiro.')
assert(blessed.includes('Vencimento: 07/07/2026'), 'Vencimento deve estar em dd/mm/yyyy.')
assert(blessedMedia.length === 1, 'Blessed acesso ativado deve enviar uma única mídia.')
assert(blessedMedia.some((part) => part.fileName === 'acesso-ativado.png'), 'Blessed deve enviar arte principal.')

const blessedTestMessage = buildFlowMessage('test_created', {
  ...base,
  app: 'Blessed Player',
  host: 'http://recordsway.shop:80',
})
const blessedTest = captionOf(blessedTestMessage)
const blessedTestMedia = mediaPartsOf(blessedTestMessage)
assert(blessedTest.includes('Teste ativado com sucesso! ✅'), 'Blessed teste deve usar titulo correto.')
assert(blessedTest.includes('Provider: 1105'), 'Blessed teste deve enviar Provider 1105.')
assert(blessedTest.includes('Usuário: 12345678'), 'Blessed teste deve enviar usuário.')
assert(blessedTest.includes('Senha: 87654321'), 'Blessed teste deve enviar senha.')
assert(!/Host:/i.test(blessedTest), 'Blessed teste não deve enviar Host.')
assert(!/xtream/i.test(blessedTest), 'Blessed teste não deve mencionar Xtream.')
assert(!/reload|recarregar/i.test(blessedTest), 'Blessed teste não deve mencionar RELOAD/RECARREGAR.')
assert(blessedTestMedia.length === 1, 'Blessed teste deve enviar uma única mídia.')
assert(blessedTestMedia[0].fileName === 'valores-central-play-plus.png', 'Blessed teste deve enviar a arte de valores.')
assert(blessedTestMedia[0].caption === blessedTest, 'Blessed teste deve levar a legenda na própria imagem.')

const blessedUpdatedMessage = buildFlowMessage('access_updated', {
  ...base,
  app: 'Blessed Player',
  host: 'http://recordsway.shop:80',
})
const blessedUpdated = captionOf(blessedUpdatedMessage)
const blessedUpdatedMedia = mediaPartsOf(blessedUpdatedMessage)
assert(blessedUpdated.includes('Acesso atualizado com sucesso! ✅'), 'Blessed atualizado deve usar titulo correto.')
assert(blessedUpdated.includes('Provider: 1105'), 'Blessed atualizado deve enviar Provider 1105.')
assert(blessedUpdated.includes('Usuário: 12345678'), 'Blessed atualizado deve enviar usuário.')
assert(blessedUpdated.includes('Senha: 87654321'), 'Blessed atualizado deve enviar senha.')
assert(!/Host:/i.test(blessedUpdated), 'Blessed atualizado não deve enviar Host.')
assert(!/xtream/i.test(blessedUpdated), 'Blessed atualizado não deve mencionar Xtream.')
assert(!/reload|recarregar/i.test(blessedUpdated), 'Blessed atualizado não deve mencionar RELOAD/RECARREGAR.')
assert(blessedUpdatedMedia.length === 0, 'Blessed atualizado deve ser uma mensagem única sem mídia duplicada.')

const playsim = captionOf(buildFlowMessage('access_activated', {
  ...base,
  app: 'PlaySim',
  code: '187052',
  host: 'http://recordsway.shop:80',
}))
assert(playsim.includes('*Code:* 187052'), 'PlaySim deve enviar Code.')
assert(!playsim.includes('*Host:*'), 'PlaySim não deve enviar Host.')

const xcloud = captionOf(buildFlowMessage('access_activated', {
  ...base,
  app: 'XCloud',
  host: 'http://recordsway.shop:80',
}))
assert(xcloud.includes('*Host:* http://recordsway.shop:80'), 'XCloud deve enviar Host.')

for (const invalid of [
  { username: '*', password: '87654321' },
  { username: '12345678', password: '*' },
  { username: '', password: '87654321' },
  { username: '12345678', password: '' },
]) {
  const validation = validateFlowContext('access_activated', { ...base, app: 'Blessed Player', ...invalid })
  assert(!validation.ok, `Payload inválido deveria bloquear: ${JSON.stringify(invalid)}`)
}

const blessedTestDispatch = await dispatchFlow({
  flow: 'test_created',
  phone: '+5511999999999',
  dryRun: true,
  context: {
    ...base,
    app: 'Blessed Player',
    host: 'http://recordsway.shop:80',
  },
})
const blessedTestRequests = mediaRequestsOf(blessedTestDispatch)
const blessedTestRequest = blessedTestRequests[0] || {}
assert(blessedTestDispatch.ok, 'Dry-run dispatch Blessed teste deveria retornar ok.')
assert(blessedTestRequests.length === 1, 'Dry-run dispatch Blessed teste deve gerar uma única mídia.')
assert(!(blessedTestDispatch.code === 'FLOW_SEQUENCE_SENT' && blessedTestRequests.length > 1), 'Dry-run dispatch Blessed teste não pode retornar sequência com duas mídias.')
assert(blessedTestRequest.fileName === 'valores-central-play-plus.png', 'Dry-run dispatch Blessed teste deve enviar a arte de valores.')
assert(String(blessedTestRequest.caption || '').includes('Teste ativado com sucesso! ✅'), 'Dry-run dispatch Blessed teste deve enviar caption de teste.')
assert(String(blessedTestRequest.caption || '').includes('Provider: 1105'), 'Dry-run dispatch Blessed teste deve enviar Provider.')
assert(String(blessedTestRequest.caption || '').includes('Usuário: 12345678'), 'Dry-run dispatch Blessed teste deve enviar usuário.')
assert(String(blessedTestRequest.caption || '').includes('Senha: 87654321'), 'Dry-run dispatch Blessed teste deve enviar senha.')
assert(!/Host:/i.test(String(blessedTestRequest.caption || '')), 'Dry-run dispatch Blessed teste não deve enviar Host.')
assert(!/reload|recarregar/i.test(String(blessedTestRequest.caption || '')), 'Dry-run dispatch Blessed teste não deve mencionar RELOAD/RECARREGAR.')

console.log(JSON.stringify({
  ok: true,
  dispatch: {
    blessed_test_created: {
      code: blessedTestDispatch.code,
      media_count: blessedTestRequests.length,
      fileName: blessedTestRequest.fileName,
      caption_has_provider: String(blessedTestRequest.caption || '').includes('Provider: 1105'),
      caption_has_username: String(blessedTestRequest.caption || '').includes('Usuário: 12345678'),
      caption_has_password: String(blessedTestRequest.caption || '').includes('Senha: 87654321'),
      caption_has_host: /Host:/i.test(String(blessedTestRequest.caption || '')),
      caption_has_reload: /reload|recarregar/i.test(String(blessedTestRequest.caption || '')),
    },
  },
  previews: {
    blessed: preview(blessed),
    blessed_test: preview(blessedTest),
    blessed_updated: preview(blessedUpdated),
    playsim: preview(playsim),
    xcloud: preview(xcloud),
  },
}, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
