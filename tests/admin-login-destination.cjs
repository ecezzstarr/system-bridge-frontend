const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

// Execute the actual submit handler with isolated auth/navigation dependencies.
const source = fs.readFileSync(path.join(__dirname, '../app/(auth)/login/page.tsx'), 'utf8')
const body = source.split('const handleSubmit = async (e: React.FormEvent) => {')[1]
  .split('\n  return (')[0].replace(/\}\s*$/, '').replace('err as WeaveAuthError', 'err')
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
const submit = new AsyncFunction('e', 'login', 'logout', 'administrationPortal', 'router',
  'isFlameEventActive', 'sessionStorage', 'setError', 'setIsSubmitting', 'email', 'password',
  'AGILITY_AGENT_LOGIN_AD_KEY', 'LOOP1_AGENT_LOGIN_AD_KEY', body)

async function run({ role = 'admin', portal = true, event = false, error } = {}) {
  const result = { routes: [], errors: [], eventChecks: 0, logout: false }
  await submit({ preventDefault() {} }, async () => {
    if (error) throw error
    return { role }
  }, () => { result.logout = true }, portal, {
    replace(route) { result.routes.push(route) }, push(route) { result.routes.push(route) },
  }, async () => { result.eventChecks++; return event }, { setItem() {} },
  value => result.errors.push(value), () => {}, 'ADMIN@example.com', 'test-only', 'ad1', 'ad2')
  return result
}

;(async () => {
  for (const portal of [true, false]) for (const event of [true, false]) {
    const result = await run({ portal, event })
    assert.deepEqual(result.routes, ['/admin/dashboard'])
    assert.equal(result.eventChecks, 0, 'Admin arrival must not wait for event status')
  }
  const wrongRole = await run({ role: 'agent' })
  assert.equal(wrongRole.logout, true)
  assert.deepEqual(wrongRole.routes, [])
  for (const role of ['agent', 'bridger']) {
    assert.deepEqual((await run({ role, portal: false })).routes, [`/${role}/dashboard`])
    assert.deepEqual((await run({ role, portal: false, event: true })).routes, ['/event'])
  }
  const setup = await run({ error: Object.assign(new Error('Password setup required'), { code: 'PASSWORD_SETUP_REQUIRED' }) })
  assert.deepEqual(setup.routes, ['/forgot-password?email=admin%40example.com&portal=admin'])
  assert.deepEqual((await run({ error: new Error('Invalid email or password') })).routes, [])
  console.log('PASS: admin dashboard arrival, role boundary, other staff routing and password recovery')
})().catch(error => { console.error(error); process.exitCode = 1 })
