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
  return typeof message === 'string' ? message : message.caption
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
assert(validateFlowContext('access_activated', { ...base, app: 'Blessed Player' }).ok, 'Blessed deveria validar.')
assert(blessed.includes('*Provider:* 1105'), 'Blessed deve enviar Provider 1105.')
assert(blessed.includes('*Usuário:* 12345678'), 'Blessed deve enviar usuário.')
assert(blessed.includes('*Senha:* 87654321'), 'Blessed deve enviar senha.')
assert(!blessed.includes('*Host:*'), 'Blessed não deve enviar Host.')
assert(blessed.includes('*Valor:* R$ 20,00'), 'Valor deve estar em BRL brasileiro.')
assert(blessed.includes('*Vencimento:* 07/07/2026'), 'Vencimento deve estar em dd/mm/yyyy.')

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
    playsim: preview(playsim),
    xcloud: preview(xcloud),
  },
}, null, 2))
