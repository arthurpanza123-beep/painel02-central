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

const { buildFlowMessage, validateFlowContext } = require(path.join(root, 'lib/services/messages/templates.ts'))

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
assert(blessed.includes('*Provider:* 1105'), 'Blessed deve enviar Provider 1105.')
assert(blessed.includes('*Usuário:* 12345678'), 'Blessed deve enviar usuário.')
assert(blessed.includes('*Senha:* 87654321'), 'Blessed deve enviar senha.')
assert(!blessed.includes('*Host:*'), 'Blessed não deve enviar Host.')
assert(!/xtream/i.test(blessed), 'Blessed não deve mencionar Xtream.')
assert(!/reload|recarregar/i.test(blessed), 'Blessed não deve mencionar RELOAD/RECARREGAR.')
assert(blessed.includes('*Valor:* R$ 20,00'), 'Valor deve estar em BRL brasileiro.')
assert(blessed.includes('*Vencimento:* 07/07/2026'), 'Vencimento deve estar em dd/mm/yyyy.')
assert(blessedMedia.length === 2, 'Blessed acesso ativado deve enviar arte principal e arte de valores.')
assert(blessedMedia.some((part) => part.fileName === 'acesso-ativado.png'), 'Blessed deve enviar arte principal.')
assert(blessedMedia.some((part) => part.fileName === 'valores-central-play-plus.png'), 'Blessed deve enviar arte de valores.')

const blessedTestMessage = buildFlowMessage('test_created', {
  ...base,
  app: 'Blessed Player',
  host: 'http://recordsway.shop:80',
})
const blessedTest = captionOf(blessedTestMessage)
const blessedTestMedia = mediaPartsOf(blessedTestMessage)
assert(blessedTest.includes('*Teste ativado com sucesso!* ✅'), 'Blessed teste deve usar titulo premium.')
assert(blessedTest.includes('*Provider:* 1105'), 'Blessed teste deve enviar Provider 1105.')
assert(blessedTest.includes('*Usuário:* 12345678'), 'Blessed teste deve enviar usuário.')
assert(blessedTest.includes('*Senha:* 87654321'), 'Blessed teste deve enviar senha.')
assert(!blessedTest.includes('*Host:*'), 'Blessed teste não deve enviar Host.')
assert(!/xtream/i.test(blessedTest), 'Blessed teste não deve mencionar Xtream.')
assert(!/reload|recarregar/i.test(blessedTest), 'Blessed teste não deve mencionar RELOAD/RECARREGAR.')
assert(blessedTestMedia.length === 2, 'Blessed teste deve enviar arte principal e arte de valores.')

const blessedUpdatedMessage = buildFlowMessage('access_updated', {
  ...base,
  app: 'Blessed Player',
  host: 'http://recordsway.shop:80',
})
const blessedUpdated = captionOf(blessedUpdatedMessage)
const blessedUpdatedMedia = mediaPartsOf(blessedUpdatedMessage)
assert(blessedUpdated.includes('*Acesso atualizado com sucesso!* ✅'), 'Blessed atualizado deve usar titulo premium.')
assert(blessedUpdated.includes('*Provider:* 1105'), 'Blessed atualizado deve enviar Provider 1105.')
assert(blessedUpdated.includes('*Usuário:* 12345678'), 'Blessed atualizado deve enviar usuário.')
assert(blessedUpdated.includes('*Senha:* 87654321'), 'Blessed atualizado deve enviar senha.')
assert(!blessedUpdated.includes('*Host:*'), 'Blessed atualizado não deve enviar Host.')
assert(!/xtream/i.test(blessedUpdated), 'Blessed atualizado não deve mencionar Xtream.')
assert(!/reload|recarregar/i.test(blessedUpdated), 'Blessed atualizado não deve mencionar RELOAD/RECARREGAR.')
assert(blessedUpdatedMedia.length === 2, 'Blessed atualizado deve enviar arte principal e arte de valores.')

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

console.log(JSON.stringify({
  ok: true,
  previews: {
    blessed: preview(blessed),
    blessed_test: preview(blessedTest),
    blessed_updated: preview(blessedUpdated),
    playsim: preview(playsim),
    xcloud: preview(xcloud),
  },
}, null, 2))
