const assert = require('node:assert/strict')
const fs = require('node:fs')
const source = fs.readFileSync('app/api/auth/login/route.ts', 'utf8')

assert.ok(source.includes('PLATFORM_ADMIN_FALLBACK_PASSWORD'), 'legacy server-side Administration fallback remains available')
assert.ok(source.includes("email.toLowerCase() === PLATFORM_ADMIN_EMAIL"), 'fallback is restricted to the original Administration email')
assert.ok(source.includes("u.role = 'admin'"), 'fallback requires an active database Administrator')
assert.ok(source.includes('randomBytes(32)'), 'login tokens remain cryptographically random')
assert.ok(source.includes('INSERT INTO sessions (id, user_id, token, created_at, expires_at)'), 'fallback creates a persisted session')
assert.ok(!source.includes('token_${PLATFORM_ADMIN_ID}_${Date.now()}'), 'predictable legacy session token is not restored')

console.log('Administration fallback login regression checks passed.')
