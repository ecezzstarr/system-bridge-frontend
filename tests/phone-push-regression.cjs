const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

async function test() {
  const listeners = {}, shown = [], navigated = [], opened = []
  const self = {
    addEventListener: (name, fn) => { listeners[name] = fn },
    location: { origin: 'https://weavingsystem.online' },
    registration: { showNotification: async (...args) => shown.push(args) },
    clients: {
      matchAll: async () => [{ url: 'https://weavingsystem.online/agent', navigate: async url => navigated.push(url), focus: async () => {} }],
      openWindow: async url => opened.push(url),
    },
  }
  vm.runInNewContext(fs.readFileSync('public/sw.js', 'utf8'), { self, URL, caches: {} })
  async function event(name, data) {
    let work
    listeners[name]({ ...data, waitUntil: promise => { work = promise } })
    await work
  }
  await event('push', { data: { json: () => ({ id: 'message-1', title: 'Deposit confirmed', body: 'Your wallet is credited' }) } })
  assert.equal(shown[0][0], 'Deposit confirmed')
  assert.equal(shown[0][1].tag, 'message-1')
  assert.equal(shown[0][1].data.url, '/notifications?open=message-1')
  await event('push', { data: { json: () => { throw Error('invalid') } } })
  assert.equal(shown[1][0], 'WEAVE')
  await event('notificationclick', { notification: { close() {}, data: { url: '/notifications?open=message-1' } } })
  assert.equal(navigated[0], 'https://weavingsystem.online/notifications?open=message-1')
  await event('notificationclick', { notification: { close() {}, data: { url: 'https://evil.example' } } })
  assert.equal(navigated.length, 1)
  self.clients.matchAll = async () => []
  await event('notificationclick', { notification: { close() {} } })
  assert.equal(opened[0], 'https://weavingsystem.online/notifications')

  const queries = [], sent = []
  let batch = [], failure
  const client = { query: async (query, args) => {
    queries.push({ query, args })
    if (query.includes('SELECT public_key')) return { rows: [{ public_key: 'public', private_key: 'private' }] }
    if (query.includes('FOR UPDATE OF q')) return { rows: batch }
    return { rows: [] }
  }, release() {} }
  const push = { generateVAPIDKeys: () => ({ publicKey: 'public', privateKey: 'private' }),
    sendNotification: async (...args) => { sent.push(args); if (failure) throw failure } }
  const module = { exports: {} }
  const js = ts.transpileModule(fs.readFileSync('lib/web-push.ts','utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2020 },
  }).outputText
  vm.runInNewContext(js, { module, exports: module.exports, URL, console, setInterval,
    require: name => name === 'web-push' ? push : { getPool: () => ({ connect: async () => client }) } })
  const { validPushEndpoint, ensurePush, deliverPushBatch } = module.exports
  for (const endpoint of ['http://fcm.googleapis.com/push','https://127.0.0.1/x', 'https://fcm.googleapis.com.evil.test/x', 'https://user:pass@fcm.googleapis.com/x']) assert.equal(validPushEndpoint(endpoint), false)
  assert.equal(validPushEndpoint('https://fcm.googleapis.com/fcm/send/test'), true)
  await ensurePush()
  assert(queries.some(q => q.query.includes('AFTER INSERT ON notifications')))
  const row = { notification_id: 'id', endpoint: 'https://fcm.googleapis.com/fcm/send/test', title: 'Hello', content: 'World', owner_matches: true, attempts: 0 }
  batch = [row]
  await deliverPushBatch()
  assert.equal(sent.length, 1)
  assert.equal(JSON.parse(sent[0][1]).body, 'World')
  assert(queries.some(q => q.query.startsWith('DELETE FROM weave_push_queue')))
  failure = { statusCode: 410 }
  await deliverPushBatch()
  assert(queries.some(q => q.query.startsWith('DELETE FROM weave_push_subscriptions')))
  failure = { statusCode: 503 }
  await deliverPushBatch()
  assert(queries.some(q => q.query.includes('attempts=attempts+1')))
  batch = [{ ...row, owner_matches: false }, { ...row, is_read: true }]
  const count = sent.length
  await deliverPushBatch()
  assert.equal(sent.length, count, 'Read messages and previous account messages must not be delivered')
  console.log('Phone push worker, retries, stale subscriptions, ownership and service worker tests passed')
}
test().catch(error => { console.error(error); process.exitCode = 1 })
