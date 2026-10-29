import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { getPool } from '@/lib/db'

const PAYSTACK_API = 'https://api.paystack.co'
type StoredConfig = { secret_key_ciphertext: string; public_origin: string; mode: string }

function encryptionKey() {
  const root = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET
  if (!root) throw new Error('NEXTAUTH_SECRET or AUTH_SECRET must be configured before storing payment credentials.')
  return createHash('sha256').update(root).update(':weave-paystack-config:v1').digest()
}
function encrypt(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), ciphertext.toString('base64')].join('.')
}
function decrypt(value: string) {
  const [iv, tag, data] = value.split('.')
  if (!iv || !tag || !data) throw new Error('Stored Paystack credentials are invalid.')
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8')
}
async function ensureTable() {
  await getPool().query(`CREATE TABLE IF NOT EXISTS weave_paystack_integration (
    id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    secret_key_ciphertext text NOT NULL,
    public_origin text NOT NULL,
    mode text NOT NULL CHECK (mode IN ('test','live')),
    verified_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    updated_by uuid
  )`)
}
export async function getPaystackConfig(): Promise<{ secretKey: string; publicOrigin: string; mode: 'test'|'live'; configured: boolean; verifiedAt: string|null }> {
  const envKey = process.env.PAYSTACK_SECRET_KEY?.trim()
  const envOrigin = process.env.WEAVE_PUBLIC_ORIGIN?.trim().replace(/\/$/, '')
  await ensureTable()
  const result = await getPool().query<StoredConfig & { verified_at: Date }>('SELECT secret_key_ciphertext,public_origin,mode,verified_at FROM weave_paystack_integration WHERE id=1')
  const row = result.rows[0]
  if (row) return { secretKey: decrypt(row.secret_key_ciphertext), publicOrigin: row.public_origin, mode: row.mode === 'live' ? 'live' : 'test', configured: true, verifiedAt: row.verified_at.toISOString() }
  return { secretKey: envKey || '', publicOrigin: envOrigin || '', mode: envKey?.startsWith('sk_live_') ? 'live' : 'test', configured: Boolean(envKey && envOrigin), verifiedAt: null }
}
export async function savePaystackConfig(input: { secretKey: string; publicOrigin: string; mode: 'test'|'live'; adminId: string }) {
  const key = input.secretKey.trim()
  const origin = input.publicOrigin.trim().replace(/\/$/, '')
  let parsedOrigin: URL
  try { parsedOrigin = new URL(origin) } catch { throw new Error('Enter a valid canonical public HTTPS origin.') }
  if (parsedOrigin.protocol !== 'https:' || parsedOrigin.origin !== origin) throw new Error('Enter the canonical public HTTPS origin only, without a path, query or fragment.')
  if (!/^https:\/\/[^\s/]+(?:\/[^\s]*)?$/i.test(origin) || origin.includes('?') || origin.includes('#')) throw new Error('Enter the canonical public HTTPS origin without query or fragment.')
  if (input.mode === 'test' && !key.startsWith('sk_test_')) throw new Error('Test mode requires a Paystack test secret key (sk_test_…).')
  if (input.mode === 'live' && !key.startsWith('sk_live_')) throw new Error('Live mode requires a Paystack live secret key (sk_live_…).')
  if (!/^sk_(test|live)_[A-Za-z0-9]+$/.test(key)) throw new Error('The secret key format is not recognized.')
  const response = await fetch(PAYSTACK_API + '/balance', { headers: { Authorization: 'Bearer ' + key }, cache: 'no-store' })
  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.status !== true || !Array.isArray(payload?.data)) throw new Error('Paystack rejected the credential. Check the key and selected mode; nothing was saved.')
  await ensureTable()
  await getPool().query(`INSERT INTO weave_paystack_integration(id,secret_key_ciphertext,public_origin,mode,verified_at,updated_at,updated_by)
    VALUES(1,$1,$2,$3,NOW(),NOW(),$4::uuid)
    ON CONFLICT(id) DO UPDATE SET secret_key_ciphertext=EXCLUDED.secret_key_ciphertext,public_origin=EXCLUDED.public_origin,mode=EXCLUDED.mode,verified_at=NOW(),updated_at=NOW(),updated_by=EXCLUDED.updated_by`,
    [encrypt(key), origin, input.mode, input.adminId])
  return { publicOrigin: origin, mode: input.mode, verifiedAt: new Date().toISOString() }
}
export async function getPaystackSecretKey() {
  const config = await getPaystackConfig()
  if (!config.configured || !config.secretKey) throw new Error('Paystack is not configured. Administration must complete the Paystack Integration Workshop.')
  return config.secretKey
}
