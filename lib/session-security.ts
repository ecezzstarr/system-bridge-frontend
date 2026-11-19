import { createHash } from 'node:crypto'

// Registration previously combined a public UUID with a millisecond timestamp.
// Never accept those sessions again, including before the cleanup migration runs.
export function isPredictableSessionToken(token: string) {
  return /^ssb_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_[0-9]+$/i.test(token)
}

// Bind encrypted NextAuth claims to the current stored credential without
// putting the password hash itself in the browser's session object.
export function credentialStamp(passwordHash: unknown) {
  return typeof passwordHash === 'string' && passwordHash
    ? createHash('sha256').update(passwordHash).digest('hex') : null
}
