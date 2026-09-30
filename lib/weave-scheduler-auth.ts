import crypto from 'node:crypto'

import type { NextRequest } from 'next/server'

const GITHUB_OIDC_ISSUER = 'https://token.actions.githubusercontent.com'
const GITHUB_OIDC_AUDIENCE = 'weave-scheduler'
const WEAVE_REPOSITORY = 'ecezzstarr/system-bridge-frontend'
const WEAVE_REPOSITORY_ID = '1232841783'
const MAIN_REF = 'refs/heads/main'
const CLOCK_SKEW_SECONDS = 60
const JWKS_CACHE_MS = 5 * 60 * 1000

type OidcClaims = {
  iss?: unknown
  aud?: unknown
  exp?: unknown
  nbf?: unknown
  iat?: unknown
  repository?: unknown
  repository_id?: unknown
  ref?: unknown
  event_name?: unknown
  workflow_ref?: unknown
}

type JsonWebKeyRecord = Record<string, unknown> & {
  kid?: string
  kty?: string
}

let jwksCache: { keys: JsonWebKeyRecord[]; expiresAt: number } | null = null

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function decodeJwtPart(value: string) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
}

function audienceMatches(value: unknown) {
  if (typeof value === 'string') return value === GITHUB_OIDC_AUDIENCE
  return Array.isArray(value) && value.some(item => item === GITHUB_OIDC_AUDIENCE)
}

async function githubJwks() {
  const now = Date.now()
  if (jwksCache && jwksCache.expiresAt > now) return jwksCache.keys

  const discoveryResponse = await fetch(`${GITHUB_OIDC_ISSUER}/.well-known/openid-configuration`, {
    cache: 'no-store',
  })
  if (!discoveryResponse.ok) throw new Error('GitHub OIDC discovery unavailable')

  const discovery = await discoveryResponse.json() as { jwks_uri?: string }
  const jwksUri = String(discovery.jwks_uri || '')
  const parsed = new URL(jwksUri)
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'token.actions.githubusercontent.com') {
    throw new Error('Unexpected GitHub OIDC JWKS location')
  }

  const jwksResponse = await fetch(jwksUri, { cache: 'no-store' })
  if (!jwksResponse.ok) throw new Error('GitHub OIDC signing keys unavailable')

  const body = await jwksResponse.json() as { keys?: JsonWebKeyRecord[] }
  const keys = Array.isArray(body.keys) ? body.keys : []
  if (keys.length === 0) throw new Error('GitHub OIDC signing keys are empty')

  jwksCache = { keys, expiresAt: now + JWKS_CACHE_MS }
  return keys
}

async function verifyGitHubOidcToken(token: string, workflowPath: string) {
  const parts = token.split('.')
  if (parts.length !== 3) return false

  let header: { alg?: unknown; kid?: unknown }
  let claims: OidcClaims
  try {
    header = decodeJwtPart(parts[0])
    claims = decodeJwtPart(parts[1])
  } catch {
    return false
  }

  if (header.alg !== 'RS256' || typeof header.kid !== 'string') return false

  const keys = await githubJwks()
  const jwk = keys.find(key => key.kid === header.kid && key.kty === 'RSA')
  if (!jwk) return false

  const publicKey = crypto.createPublicKey({ key: jwk as any, format: 'jwk' })
  const verified = crypto.verify(
    'RSA-SHA256',
    Buffer.from(`${parts[0]}.${parts[1]}`),
    publicKey,
    Buffer.from(parts[2], 'base64url'),
  )
  if (!verified) return false

  const now = Math.floor(Date.now() / 1000)
  const exp = Number(claims.exp || 0)
  const nbf = Number(claims.nbf || 0)
  const iat = Number(claims.iat || 0)
  if (!exp || exp < now - CLOCK_SKEW_SECONDS) return false
  if (nbf && nbf > now + CLOCK_SKEW_SECONDS) return false
  if (iat && iat > now + CLOCK_SKEW_SECONDS) return false

  const expectedWorkflowRef = `${WEAVE_REPOSITORY}/${workflowPath}@${MAIN_REF}`
  const eventName = String(claims.event_name || '')

  return (
    claims.iss === GITHUB_OIDC_ISSUER &&
    audienceMatches(claims.aud) &&
    claims.repository === WEAVE_REPOSITORY &&
    String(claims.repository_id || '') === WEAVE_REPOSITORY_ID &&
    claims.ref === MAIN_REF &&
    (eventName === 'schedule' || eventName === 'workflow_dispatch') &&
    claims.workflow_ref === expectedWorkflowRef
  )
}

function sharedSecretAuthorized(request: NextRequest, extraSecretNames: string[]) {
  const supplied = request.headers.get('x-cron-secret')
    || request.headers.get('x-weave-development-agent-secret')
  if (!supplied) return false

  const names = ['CRON_SECRET', ...extraSecretNames]
  const expected = names
    .map(name => process.env[name])
    .filter((value): value is string => Boolean(value))

  return expected.some(secret => safeEqual(supplied, secret))
}

export const WEAVE_GITHUB_OIDC_SCHEDULER = true

export async function hasWeaveSchedulerAuthority(
  request: NextRequest,
  options: {
    workflowPath: string
    extraSecretNames?: string[]
  },
) {
  if (sharedSecretAuthorized(request, options.extraSecretNames || [])) return true

  const authorization = request.headers.get('authorization') || ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  if (!match) return false

  try {
    return await verifyGitHubOidcToken(match[1], options.workflowPath)
  } catch (error) {
    console.error('[scheduler-auth] GitHub OIDC verification failed', error)
    return false
  }
}
