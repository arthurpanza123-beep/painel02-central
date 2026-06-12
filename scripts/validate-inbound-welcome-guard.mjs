#!/usr/bin/env node

import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const assert = require('node:assert/strict')
const Module = require('node:module')
const ts = require('typescript')

Module._extensions['.ts'] = function loadTs(module, filename) {
  const source = require('node:fs').readFileSync(filename, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText
  module._compile(output, filename)
}

process.env.SUPABASE_URL = 'https://mock.supabase.local'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.local'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role'
process.env.EVOLUTION_ENABLED = 'true'
process.env.EVOLUTION_DRY_RUN = 'true'
process.env.EVOLUTION_API_URL = 'https://mock.evolution.local'
process.env.EVOLUTION_API_KEY = 'mock-evolution-key'
process.env.EVOLUTION_INSTANCE = 'centralplay-v2'
process.env.INBOUND_WELCOME_ENABLED = 'true'
process.env.INBOUND_WELCOME_ONLY_FOR_NEW_PHONES = 'true'
process.env.INBOUND_WELCOME_MIN_HISTORY_BLOCK_COUNT = '5'
process.env.INBOUND_INSTALL_AUTO_REPLY_ENABLED = 'true'
process.env.WELCOME_HUMAN_DELAY_MIN_MS = '0'
process.env.WELCOME_HUMAN_DELAY_MAX_MS = '0'

const phones = ['5522988473304', '5522988345946']
let clientSeq = 0
let state

function reset() {
  clientSeq = 0
  state = {
    clients: [],
    logs: [],
    pipelineEvents: [],
    historyByPhone: new Map(),
    failClients: false,
    failHistory: false,
  }
}

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  }
}

function addClient(phone, status = 'lead', metadata = {}) {
  const client = {
    id: `client_${++clientSeq}`,
    name: `Lead ${clientSeq}`,
    phone_e164: phone,
    status,
    legacy_metadata: metadata,
    created_at: new Date().toISOString(),
  }
  state.clients.push(client)
  return client
}

function message(phone, id, fromMe = false, text = 'Olá! Tenho interesse e quero saber mais.') {
  return {
    key: { remoteJid: `${phone}@s.whatsapp.net`, id, fromMe },
    messageTimestamp: Math.floor(Date.now() / 1000),
    message: { conversation: text },
  }
}

function inboundPayload(phone, id, text) {
  return {
    event: 'messages.upsert',
    data: {
      key: { remoteJid: `${phone}@s.whatsapp.net`, id, fromMe: false },
      pushName: 'Operador Autorizado',
      message: { conversation: text },
    },
  }
}

function clientsByUrl(url) {
  if (state.failClients) return null
  const raw = decodeURIComponent(url.toString())
  const idMatch = raw.match(/(?:\?|&)id=eq\.([^&]+)/)
  if (idMatch) return state.clients.filter((client) => client.id === idMatch[1])
  const exactPhone = raw.match(/(?:\?|&)phone_e164=eq\.([^&]+)/)
  if (exactPhone) return state.clients.filter((client) => client.phone_e164 === exactPhone[1])
  const phonesInOr = [...raw.matchAll(/phone_e164\.eq\.([0-9]+)/g)].map((match) => match[1])
  if (phonesInOr.length) return state.clients.filter((client) => phonesInOr.includes(client.phone_e164))
  return state.clients
}

global.fetch = async (input, init = {}) => {
  const url = new URL(String(input))
  const method = String(init.method || 'GET').toUpperCase()

  if (url.hostname === 'mock.evolution.local') {
    if (state.failHistory) return jsonResponse({ error: 'history unavailable' }, 503)
    const body = init.body ? JSON.parse(String(init.body)) : {}
    const remoteJid = body?.where?.key?.remoteJid || ''
    const phone = String(remoteJid).split('@')[0]
    return jsonResponse({ messages: state.historyByPhone.get(phone) || [] })
  }

  if (url.hostname !== 'mock.supabase.local') {
    throw new Error(`Unexpected network call: ${url.toString()}`)
  }

  const path = url.pathname.replace(/^\/rest\/v1\//, '')
  if (path === 'clients' && method === 'GET') {
    if (state.failClients) return jsonResponse({ error: 'clients unavailable' }, 503)
    return jsonResponse(clientsByUrl(url))
  }
  if (path === 'clients' && method === 'POST') {
    const body = JSON.parse(String(init.body || '{}'))
    const client = {
      id: `client_${++clientSeq}`,
      name: body.name,
      phone_e164: body.phone_e164,
      status: body.status,
      legacy_metadata: body.legacy_metadata || {},
      created_at: body.created_at,
    }
    state.clients.push(client)
    return jsonResponse([client], 201)
  }
  if (path === 'clients' && method === 'PATCH') {
    const rows = clientsByUrl(url) || []
    const body = JSON.parse(String(init.body || '{}'))
    for (const row of rows) Object.assign(row, body)
    return jsonResponse(rows)
  }
  if (path === 'tests' && method === 'GET') return jsonResponse([])
  if (path === 'logs' && method === 'POST') {
    state.logs.push(JSON.parse(String(init.body || '{}')))
    return jsonResponse({}, 201)
  }
  if (path === 'pipeline_events' && method === 'POST') {
    state.pipelineEvents.push(JSON.parse(String(init.body || '{}')))
    return jsonResponse({}, 201)
  }
  if ((path === 'logs' || path === 'pipeline_events') && method === 'GET') return jsonResponse([])

  throw new Error(`Unhandled mock fetch: ${method} ${url.toString()}`)
}

const { handleEvolutionInboundWebhook } = require('../lib/services/messages/inbound-webhook.ts')

async function settleBackground() {
  await new Promise((resolve) => setTimeout(resolve, 20))
}

async function runCase(name, setup, payload, expectedCode) {
  reset()
  setup()
  const result = await handleEvolutionInboundWebhook(payload)
  await settleBackground()
  assert.equal(result.code, expectedCode, `${name}: expected ${expectedCode}, got ${result.code}`)
  console.log(`${name}: ${result.code}`)
  return result
}

async function main() {
  await runCase(
    '1 novo sem historico',
    () => state.historyByPhone.set(phones[0], [message(phones[0], 'case1')]),
    inboundPayload(phones[0], 'case1', 'Olá! Tenho interesse e quero saber mais.'),
    'WELCOME_STARTED'
  )

  reset()
  state.historyByPhone.set(phones[1], [message(phones[1], 'case2a')])
  await handleEvolutionInboundWebhook(inboundPayload(phones[1], 'case2a', 'Tenho interesse'))
  await settleBackground()
  const second = await handleEvolutionInboundWebhook(inboundPayload(phones[1], 'case2b', 'Tenho interesse'))
  assert.equal(second.code, 'WELCOME_SKIPPED_EXISTING_CONTACT')
  console.log(`2 mesmo telefone: ${second.code}`)

  await runCase(
    '3 lead existente',
    () => addClient(phones[0], 'lead'),
    inboundPayload(phones[0], 'case3', 'Tenho interesse'),
    'WELCOME_SKIPPED_EXISTING_CONTACT'
  )

  await runCase(
    '4 active existente',
    () => addClient(phones[0], 'active'),
    inboundPayload(phones[0], 'case4', 'Tenho interesse'),
    'WELCOME_SKIPPED_CLIENT_EXISTS'
  )

  await runCase(
    '5 test_active existente',
    () => addClient(phones[0], 'test_active'),
    inboundPayload(phones[0], 'case5', 'Tenho interesse'),
    'WELCOME_SKIPPED_TEST_EXISTS'
  )

  await runCase(
    '6 cinco mensagens recentes',
    () => state.historyByPhone.set(phones[0], Array.from({ length: 5 }, (_, index) => message(phones[0], `case6_${index}`))),
    inboundPayload(phones[0], 'case6_current', 'Tenho interesse'),
    'WELCOME_SKIPPED_RECENT_HISTORY'
  )

  await runCase(
    '7 conversa manual operador',
    () => state.historyByPhone.set(phones[0], [message(phones[0], 'case7_previous_out', true, 'Oi, estou te atendendo.'), message(phones[0], 'case7_current')]),
    inboundPayload(phones[0], 'case7_current', 'Tenho interesse'),
    'WELCOME_SKIPPED_RECENT_HISTORY'
  )

  await runCase(
    '8 aparelho envia install sem welcome',
    () => addClient(phones[1], 'lead', { welcome_flow_status: 'running', active_flow_type: 'welcome' }),
    inboundPayload(phones[1], 'case8', 'Minha TV é TCL'),
    'INSTALL_DRY_RUN'
  )

  reset()
  addClient(phones[1], 'lead', {
    install_sent_at: new Date().toISOString(),
    install_device: 'Android TV / Google TV / TCL',
  })
  const duplicateInstall = await handleEvolutionInboundWebhook(inboundPayload(phones[1], 'case9', 'Minha TV é TCL'))
  assert.equal(duplicateInstall.code, 'INSTALL_SKIPPED_RECENT_DUPLICATE')
  console.log(`9 aparelho repetido 24h: ${duplicateInstall.code}`)

  await runCase(
    '10 falha historico',
    () => { state.failHistory = true },
    inboundPayload(phones[0], 'case10', 'Tenho interesse'),
    'WELCOME_SKIPPED_LOOKUP_UNAVAILABLE'
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
