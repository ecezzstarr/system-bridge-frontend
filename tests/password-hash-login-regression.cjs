const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const bcrypt = require('bcryptjs')
const root = path.resolve(__dirname, '..')
const read = p => fs.readFileSync(path.join(root, p), 'utf8')

function load(file, mocks = {}) {
  const module = { exports: {} }
  const compiled = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  vm.runInNewContext(compiled, {
    module, exports: module.exports,
    require: id => Object.hasOwn(mocks, id) ? mocks[id] : require(id),
    Buffer, Date, process, console,
  }, { filename: file })
  return module.exports
}

const { usableBcryptPasswordHash } = load('lib/password-hash.ts')
const staffLoginSource = read('app/api/auth/login/route.ts')
const clientLoginSource = read('app/api/client/weave-login/route.ts')
const nextAuthSource = read('lib/auth.ts')
const staffRegister = read('app/api/auth/register/route.ts')
const clientRegister = read('app/api/client/weave-register/route.ts')
const reset = read('app/api/auth/reset-password/route.ts')
const authProvider = read('lib/auth-provider.tsx')
const staffLoginPage = read('app/(auth)/login/page.tsx')
const clientLoginPage = read('app/client/login/page.tsx')

for (const [label, source] of [
  ['staff', staffLoginSource], ['Client', clientLoginSource], ['NextAuth', nextAuthSource],
]) {
  assert.ok(source.includes("import { usableBcryptPasswordHash } from '@/lib/password-hash'"), label + ' uses the shared validator')
  assert.ok(source.includes('usableBcryptPasswordHash(user.password_hash)'), label + ' validates the stored hash')
  assert.ok(source.includes('bcrypt.compare(') && source.includes(', passwordHash)'), label + ' verifies the normalized hash')
  assert.ok(!source.includes('function hasUsablePasswordHash('), label + ' does not retain a divergent regex')
}
assert.ok(staffRegister.includes('bcrypt.hash(password, 10)') && staffRegister.includes('password_hash'), 'Agent and Bridger registration persists bcrypt')
assert.ok(clientRegister.includes('bcrypt.hash(password, 10)') && clientRegister.includes('password_hash'), 'Client registration persists bcrypt')
assert.ok(reset.includes('bcrypt.hash(password,10)') && reset.includes('UPDATE users SET password_hash=$1'), 'Password reset persists bcrypt')
assert.ok(authProvider.includes('authError.code = result.code'), 'Provider preserves the server-side setup-required state')
assert.ok(staffLoginPage.includes("authError?.code === 'PASSWORD_SETUP_REQUIRED'"), 'Staff recovery applies only to an explicit setup-required response')
assert.ok(clientLoginPage.includes("result.code === 'PASSWORD_SETUP_REQUIRED'"), 'Client recovery applies only to an explicit setup-required response')

const correctPassword = 'weave-test-only-password'
const stored = bcrypt.hashSync(correctPassword, 4)
assert.equal(stored.length, 60, 'Test fixture is a full bcrypt hash')
assert.equal(usableBcryptPasswordHash(stored), stored, 'Ordinary bcrypt credential is recognized')
assert.equal(usableBcryptPasswordHash('  ' + stored + '\n'), stored, 'Padding does not break a real credential')
assert.equal(usableBcryptPasswordHash(stored.replace('$2b$', '$2a$')), stored.replace('$2b$', '$2a$'), 'Legacy 2a prefix is accepted')
assert.equal(usableBcryptPasswordHash(stored.replace('$2b$', '$2y$')), stored.replace('$2b$', '$2y$'), 'Legacy 2y prefix is accepted')
for (const invalid of [null, undefined, '', ' ', 'plaintext-password', '$2b$10$short', '$2b$10$' + 'x'.repeat(54)]) {
  assert.equal(usableBcryptPasswordHash(invalid), null, 'Invalid hash must not authorize login')
}
assert.equal(bcrypt.compareSync(correctPassword, usableBcryptPasswordHash(stored)), true, 'Existing password verifies without resetting it')
assert.equal(bcrypt.compareSync('wrong-password', usableBcryptPasswordHash(stored)), false, 'Wrong password is still rejected')

const next = { NextResponse: { json: (body, options = {}) => ({ status: options.status || 200, body }) } }
function sqlFor(current) {
  return async (parts, ...values) => {
    const query = parts.join('?')
    if (query.includes('FROM users')) return [current.user]
    return []
  }
}
function staffRoute(current) {
  return load('app/api/auth/login/route.ts', {
    'next/server': next, bcryptjs: bcrypt,
    '@/lib/password-hash': { usableBcryptPasswordHash },
    '@/lib/db': { sql: sqlFor(current) },
    '@/lib/weave-infrastructure': { getDivineShieldState: async () => ({ active: false }) },
    '@/lib/user-referral': { ensureUserReferralCode: async () => 'TEST-REFERRAL' },
  })
}
function clientRoute(current) {
  return load('app/api/client/weave-login/route.ts', {
    'next/server': next, bcryptjs: bcrypt,
    '@/lib/password-hash': { usableBcryptPasswordHash },
    '@/lib/db': { sql: sqlFor(current) },
    '@/lib/weave-infrastructure': { getDivineShieldState: async () => ({ active: false }) },
    '@/lib/user-referral': { ensureUserReferralCode: async () => 'TEST-REFERRAL' },
  })
}
const request = body => ({ json: async () => body })

async function run() {
  for (const role of ['admin', 'agent', 'bridger']) {
    const current = { user: { id: '123e4567-e89b-42d3-a456-426614174000', email: role + '@example.test', name: role, username: role, role, password_hash: stored, is_active: true } }
    const route = staffRoute(current)
    const valid = await route.POST(request({ email: current.user.email, password: correctPassword }))
    assert.equal(valid.status, 200, role + ' must login with an existing bcrypt password')
    assert.equal(valid.body.user.role, role)
    assert.ok(valid.body.token, role + ' must receive a session')
    const invalid = await route.POST(request({ email: current.user.email, password: 'incorrect' }))
    assert.equal(invalid.status, 401, role + ' wrong password must not force recovery')
    current.user.password_hash = null
    const noPassword = await route.POST(request({ email: current.user.email, password: correctPassword }))
    assert.equal(noPassword.status, 409, role + ' truly passwordless account requires recovery')
    assert.equal(noPassword.body.code, 'PASSWORD_SETUP_REQUIRED')
  }

  const current = { user: { id: '123e4567-e89b-42d3-a456-426614174001', email: 'client@example.test', name: 'Client', role: 'client', file_number: 'WEAVE-583104927361', password_hash: '  ' + stored + '  ', is_active: true } }
  const route = clientRoute(current)
  const valid = await route.POST(request({ fileNumber: current.user.file_number, password: correctPassword }))
  assert.equal(valid.status, 200, 'Client login must accept its existing bcrypt hash')
  assert.equal(valid.body.success, true)
  assert.ok(valid.body.token, 'Client receives a session')
  assert.equal((await route.POST(request({ fileNumber: current.user.file_number, password: 'wrong' }))).status, 401, 'Wrong Client password stays on login')
  current.user.password_hash = ''
  const noPassword = await route.POST(request({ fileNumber: current.user.file_number, password: correctPassword }))
  assert.equal(noPassword.status, 409, 'Passwordless Client requires setup')
  assert.equal(noPassword.body.code, 'PASSWORD_SETUP_REQUIRED')
  console.log('WEAVE bcrypt login: real hashes accepted for all four roles; invalid passwords rejected; recovery only for missing hashes')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
