const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')

const listeners = {}
const fetched = []
const matched = []
const deleted = []
let claimed = false
const cached = { kind: 'cached-icon' }
const context = {
  URL, Promise,
  self: {
    addEventListener: (name, handler) => { listeners[name] = handler },
    skipWaiting: () => {},
    clients: { claim: async () => { claimed = true } },
  },
  caches: {
    open: async () => ({ addAll: async () => {} }),
    keys: async () => ['weave-v4', 'weave-v5', 'weave-v6'],
    delete: async name => { deleted.push(name) },
    match: async request => { matched.push(request.url); return cached },
  },
  fetch: async request => { fetched.push(request.url); return { kind: 'active-release' } },
}
vm.runInNewContext(fs.readFileSync('public/sw.js', 'utf8'), context)

async function fetchRequest(path, mode) {
  let response
  listeners.fetch({ request: { url: `https://weavingsystem.online${path}`, mode }, respondWith: result => { response = result } })
  return await response
}

;(async () => {
  for (const [path, mode] of [['/agent/food-order', 'navigate'], ['/agent/distribution', 'navigate'], ['/api/health', 'cors'], ['/_next/static/new-release.js', 'cors']]) {
    assert.equal((await fetchRequest(path, mode)).kind, 'active-release')
  }
  assert.equal(matched.length, 0, 'Screens, health, and runtime scripts cannot use cached responses')
  assert.equal(fetched.length, 4)
  assert.equal((await fetchRequest('/weave-logo.svg', 'cors')).kind, 'cached-icon')
  let activation
  listeners.activate({ waitUntil: result => { activation = result } })
  await activation
  assert.deepEqual(deleted, ['weave-v4', 'weave-v5'])
  assert.equal(claimed, true)
  console.log('PASS: active release serves app screens/API/scripts; old WEAVE caches are removed on activation')
})().catch(error => { console.error(error); process.exitCode = 1 })
