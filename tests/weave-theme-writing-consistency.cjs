const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')

const theme = read('app/globals.css')
assert.equal((theme.match(/--background: #06152e/g) || []).length, 1,
  'Base palette values should have one source instead of a duplicate .dark palette')

const writing = read('lib/weave-writing.ts')
const login = read('app/(auth)/login/page.tsx')
const registration = read('app/(auth)/register/page.tsx')
const home = read('app/page.tsx')
for (const [key, value] of Object.entries({
  email: 'Email',
  password: 'Password',
  forgotPassword: 'Forgot password?',
  register: 'Register',
  signIn: 'Sign in',
})) {
  assert.ok(writing.includes(`${key}: '${value}'`), `${key} is defined in the shared writing module`)
}
for (const key of ['email', 'password', 'forgotPassword', 'register', 'signIn']) {
  assert.ok(login.includes(`WEAVE_WRITING.positionAccess.${key}`), `Login uses shared ${key} wording`)
}
assert.ok(registration.includes('WEAVE_WRITING.positionAccess.signIn'),
  'Registration uses the same sentence-case sign-in label')
assert.ok(home.includes('WEAVE_WRITING.positionAccess.signIn'),
  'The homepage uses the same sentence-case sign-in label')

console.log('WEAVE theme palette and access wording consistency passed')
