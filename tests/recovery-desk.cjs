const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const root = path.join(__dirname, '..')
function load(file, mocks = {}) {
  const module = { exports: {} }
  const output = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText
  vm.runInNewContext(output, { module, exports: module.exports, require: name => name in mocks ? mocks[name] : require(name), Buffer, process, console, Date })
  return module.exports
}
async function main() {
  const { clampPanelPosition } = load('lib/floating-panel-position.ts')
  const bounds = { width: 390, height: 600 }
  const size = { width: 240, height: 64 }
  assert.equal(JSON.stringify(clampPanelPosition({ x: -50, y: -10 }, size, bounds)), JSON.stringify({ x: 8, y: 8 }))
  assert.equal(JSON.stringify(clampPanelPosition({ x: 900, y: 900 }, size, bounds)), JSON.stringify({ x: 142, y: 528 }))
  assert.equal(clampPanelPosition({ x: 142, y: 528 }, size, { width: 300, height: 250 }).y, 178)

  process.env.JWT_SECRET = 'test-only-delivery-secret'
  let statusRow
  let limit = 0
  let known = true
  const queries = []
  const client = { release() {}, async query(sql, args = []) {
    queries.push({ sql, args })
    if (sql.includes('COUNT(*)')) return { rows: [{ count: limit }] }
    if (sql.includes('SELECT id FROM users')) return { rows: known ? [{ id: 'user-id' }] : [] }
    if (sql.includes('SELECT id,user_id,email FROM access_recovery_requests')) return { rows: [{ id: 'request-id', user_id: 'user-id', email: 'user@example.test' }] }
    return { rows: [] }
  } }
  let grantClient
  const engine = load('lib/access-recovery-requests.ts', {
    '@/lib/db': { getPool: () => ({ connect: async () => client, query: async () => ({ rows: statusRow ? [statusRow] : [] }) }) },
    '@/lib/admin-access-recovery': { ensureAdminAccessRecoverySchema: async () => {}, issueAdminRecoveryGrant: async input => {
      grantClient = input.client
      return { id: 'grant-id', code: '123456' }
    } },
  })
  const encrypted = engine.sealRecoveryPasscode('123456', 'request-id')
  assert.ok(!encrypted.includes('123456'))
  assert.equal(engine.openRecoveryPasscode(encrypted, 'request-id'), '123456')
  assert.throws(() => engine.openRecoveryPasscode(encrypted, 'other-request'))
  const tampered = Buffer.from(encrypted, 'base64'); tampered[29] ^= 1
  assert.throws(() => engine.openRecoveryPasscode(tampered.toString('base64'), 'request-id'))
  assert.equal(engine.recoveryRequestTokenHash('token').length, 64)

  const request = await engine.requestAdministrationRecovery('user@example.test', 'Verify registered details', 'network')
  assert.match(request.token, /^[a-f0-9]{64}$/)
  const insert = queries.find(q => q.sql.includes('INSERT INTO access_recovery_requests'))
  assert.equal(insert.args[4], engine.recoveryRequestTokenHash(request.token))
  assert.ok(!insert.args.includes(request.token))
  assert.ok(queries.some(q => q.sql.includes('INSERT INTO notifications')))
  queries.length = 0; known = false
  const missing = await engine.requestAdministrationRecovery('missing@example.test', 'Registered details', 'network')
  assert.match(missing.token, /^[a-f0-9]{64}$/)
  assert.ok(!queries.some(q => q.sql.includes('INSERT INTO notifications')))
  limit = 5
  await assert.rejects(() => engine.requestAdministrationRecovery('user@example.test', 'Registered details', 'network'), /Too many/)
  assert.ok(queries.some(q => q.sql === 'ROLLBACK'))
  limit = 0

  statusRow = { id: 'request-id', status: 'pending', expires_at: new Date(Date.now() + 60000) }
  assert.equal((await engine.recoveryRequestStatus(request.token)).status, 'pending')
  assert.equal((await engine.recoveryRequestStatus(request.token)).code, undefined)
  statusRow.status = 'approved'; statusRow.code_ciphertext = encrypted
  statusRow.grant_expires_at = new Date(Date.now() + 60000)
  assert.equal((await engine.recoveryRequestStatus(request.token)).code, '123456')
  statusRow.revoked_at = new Date()
  assert.equal((await engine.recoveryRequestStatus(request.token)).status, 'expired')
  statusRow.revoked_at = null; statusRow.attempts = 5
  assert.equal((await engine.recoveryRequestStatus(request.token)).code, undefined)
  statusRow.attempts = 0; statusRow.consumed_at = new Date()
  assert.equal((await engine.recoveryRequestStatus(request.token)).status, 'used')
  statusRow.consumed_at = null; statusRow.grant_expires_at = new Date(0)
  assert.equal((await engine.recoveryRequestStatus(request.token)).status, 'expired')
  statusRow = undefined
  assert.equal((await engine.recoveryRequestStatus('unknown')).status, 'expired')
  queries.length = 0
  const approval = await engine.handleRecoveryRequest({ adminId: 'admin-id', requestId: 'request-id', reason: 'Verified registered phone', approve: true })
  assert.equal(approval.code, undefined)
  assert.equal(grantClient, client)
  const update = queries.find(q => q.sql.includes("status='approved'"))
  assert.equal(engine.openRecoveryPasscode(update.args[2], 'request-id'), '123456')
  assert.equal(queries.filter(q => q.sql === 'COMMIT').length, 1)
  const next = { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } }
  let accessed = false
  const api = load('app/api/admin/access-recovery/route.ts', {
    'next/server': next, '@/lib/auth-api': { getAuthUser: async () => ({ role: 'client' }) },
    '@/lib/db': { getPool: () => { accessed = true } }, '@/lib/access-recovery-requests': {}, '@/lib/admin-access-recovery': {},
  })
  assert.equal((await api.GET({})).status, 401)
  assert.equal((await api.POST({})).status, 401)
  assert.equal(accessed, false)
  let consumed = false
  let attempts = 0
  const resetQueries = []
  const crypto = require('node:crypto')
  const recoveryCodeHash = (id, code) => crypto.createHash('sha256').update(id + ':' + code).digest('hex')
  const resetClient = { release() {}, async query(sql, args) {
    resetQueries.push({ sql, args })
    if (sql.includes('FROM password_recovery_challenges')) return { rows: [] }
    if (sql.includes('FROM admin_access_recovery_grants')) return { rows: consumed ? [] : [{ id: 'grant', user_id: 'user', role: 'client', attempts, code_hash: recoveryCodeHash('grant', '123456') }] }
    if (sql.includes('attempts=attempts+1')) attempts++
    if (sql.includes('SET consumed_at')) consumed = true
    return { rows: [] }
  } }
  const reset = load('app/api/auth/reset-password/route.ts', {
    'next/server': next, bcryptjs: { hash: async password => 'hashed:' + password },
    '@/lib/db': { getPool: () => ({ connect: async () => resetClient }) },
    '@/lib/access-recovery-requests': { ensureRecoveryRequestSchema: async () => {} },
    '@/lib/password-recovery': { PASSWORD_RECOVERY_MAX_ATTEMPTS: 5, ensurePasswordRecoverySchema: async () => {}, normalizeRecoveryEmail: x => x, recoveryCodeHash },
    '@/lib/admin-access-recovery': { ADMIN_RECOVERY_MAX_ATTEMPTS: 5, ensureAdminAccessRecoverySchema: async () => {} },
  })
  const resetRequest = code => ({ json: async () => ({ email: 'user@example.test', code, password: 'new-test-password' }) })
  assert.equal((await reset.POST(resetRequest('654321'))).status, 400)
  assert.equal(attempts, 1)
  assert.ok(!resetQueries.some(q => q.sql.includes('UPDATE users SET password_hash')))
  const restored = await reset.POST(resetRequest('123456'))
  assert.equal(restored.status, 200)
  assert.equal(restored.body.login, '/client/login')
  assert.ok(resetQueries.some(q => q.sql.includes('DELETE FROM sessions')))
  assert.ok(resetQueries.some(q => q.sql.includes('code_ciphertext=NULL')))
  assert.equal((await reset.POST(resetRequest('123456'))).status, 400)
  console.log('Recovery desk authorization, rate limits, encrypted delivery, expiry and floating bounds passed')
}
main().catch(error => { console.error(error); process.exit(1) })
