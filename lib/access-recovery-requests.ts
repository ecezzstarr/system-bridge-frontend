import crypto from 'node:crypto'
import { getPool } from '@/lib/db'
import { ensureAdminAccessRecoverySchema, issueAdminRecoveryGrant } from '@/lib/admin-access-recovery'

const REQUEST_MINUTES = 60
let schemaPromise: Promise<void> | null = null

export function recoveryRequestTokenHash(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function deliveryKey() {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('Recovery desk delivery is unavailable')
  return crypto.createHash('sha256').update('weave-recovery-delivery:' + secret).digest()
}

export function sealRecoveryPasscode(code: string, requestId: string) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', deliveryKey(), iv)
  cipher.setAAD(Buffer.from(requestId))
  const encrypted = Buffer.concat([cipher.update(code, 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64')
}

export function openRecoveryPasscode(payload: string, requestId: string) {
  const bytes = Buffer.from(payload, 'base64')
  const decipher = crypto.createDecipheriv('aes-256-gcm', deliveryKey(), bytes.subarray(0, 12))
  decipher.setAAD(Buffer.from(requestId))
  decipher.setAuthTag(bytes.subarray(12, 28))
  return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8')
}

export async function ensureRecoveryRequestSchema() {
  if (schemaPromise) return schemaPromise
  schemaPromise = (async () => {
    await ensureAdminAccessRecoverySchema()
    const client = await getPool().connect()
    try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['weave_recovery_requests_v1'])
    await client.query(`CREATE TABLE IF NOT EXISTS access_recovery_requests (
      id UUID PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      details VARCHAR(500) NOT NULL,
      token_hash VARCHAR(64) NOT NULL UNIQUE,
      network_hash VARCHAR(64) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      grant_id UUID REFERENCES admin_access_recovery_grants(id),
      code_ciphertext TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      handled_at TIMESTAMPTZ
    )`)
    await client.query('CREATE INDEX IF NOT EXISTS idx_recovery_requests_email_created ON access_recovery_requests(LOWER(email),created_at DESC)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_recovery_requests_network_created ON access_recovery_requests(network_hash,created_at DESC)')
    await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      throw error
    } finally { client.release() }
  })().catch(error => { schemaPromise = null; throw error })
  return schemaPromise
}

export async function requestAdministrationRecovery(email: string, details: string, network: string) {
  deliveryKey()
  await ensureRecoveryRequestSchema()
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const networkHash = recoveryRequestTokenHash(network)
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['recovery-network:' + networkHash])
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['recovery-email:' + email])
    const limits = await client.query(`SELECT COUNT(*)::int AS count FROM access_recovery_requests
      WHERE (LOWER(email)=$1 OR network_hash=$2) AND created_at>NOW()-INTERVAL '1 hour'`, [email, networkHash])
    if (Number(limits.rows[0]?.count || 0) >= 5) throw new Error('Too many recovery requests. Try again later.')
    const userResult = await client.query(`SELECT id FROM users WHERE LOWER(email)=$1
      AND is_active=true AND role IN ('agent','bridger','client','admin') LIMIT 1`, [email])
    const userId = userResult.rows[0]?.id || null
    const id = crypto.randomUUID()
    const token = crypto.randomBytes(32).toString('hex')
    await client.query(`INSERT INTO access_recovery_requests (id,user_id,email,details,token_hash,network_hash,expires_at)
      VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6,NOW()+($7::int*INTERVAL '1 minute'))`,
      [id, userId, email, details, recoveryRequestTokenHash(token), networkHash, REQUEST_MINUTES])
    if (userId) {
      await client.query(`INSERT INTO notifications (user_id,type,title,content,from_user_id,from_user_name,link)
        SELECT id,'access_recovery','Password recovery request',
        'A user is waiting at the Access Recovery Desk. Verify their identity before sending a passcode.',
        $1::uuid,'Access Recovery Desk','/admin/access-recovery'
        FROM users WHERE role='admin' AND is_active=true`, [userId])
    }
    await client.query('COMMIT')
    return { token, expiresMinutes: REQUEST_MINUTES }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally { client.release() }
}

export async function recoveryRequestStatus(token: string) {
  await ensureRecoveryRequestSchema()
  const result = await getPool().query(`SELECT r.id,r.status,r.code_ciphertext,r.expires_at,
      g.expires_at AS grant_expires_at,g.consumed_at,g.revoked_at
      ,g.attempts
    FROM access_recovery_requests r LEFT JOIN admin_access_recovery_grants g ON g.id=r.grant_id
    WHERE r.token_hash=$1 LIMIT 1`, [recoveryRequestTokenHash(token)])
  const row = result.rows[0]
  if (!row) return { status: 'expired' }
  if (row.consumed_at) return { status: 'used' }
  if (row.revoked_at || Number(row.attempts || 0) >= 5 || new Date(row.grant_expires_at || row.expires_at).getTime() <= Date.now()) return { status: 'expired' }
  if (row.status === 'approved' && row.code_ciphertext) {
    return { status: 'approved', code: openRecoveryPasscode(row.code_ciphertext, row.id), expiresAt: row.grant_expires_at }
  }
  return { status: row.status }
}

export async function listRecoveryRequests() {
  await ensureRecoveryRequestSchema()
  return (await getPool().query(`SELECT r.id,r.user_id,r.email,r.details,r.status,r.created_at,r.expires_at,
      u.name,u.role,u.file_number
    FROM access_recovery_requests r JOIN users u ON u.id=r.user_id
    WHERE r.status='pending' AND r.expires_at>NOW() AND u.is_active=true
    ORDER BY r.created_at ASC LIMIT 50`)).rows
}

export async function handleRecoveryRequest(input: { adminId: string; requestId: string; reason: string; approve: boolean }) {
  await ensureRecoveryRequestSchema()
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const result = await client.query(`SELECT id,user_id,email FROM access_recovery_requests
      WHERE id=$1::uuid AND status='pending' AND expires_at>NOW() FOR UPDATE`, [input.requestId])
    const request = result.rows[0]
    if (!request?.user_id) throw new Error('Pending recovery request not found')
    if (input.approve) {
      const grant = await issueAdminRecoveryGrant({ adminId: input.adminId, targetUserId: request.user_id, reason: input.reason, client })
      const ciphertext = sealRecoveryPasscode(grant.code, request.id)
      await client.query(`UPDATE access_recovery_requests SET status='approved',grant_id=$2::uuid,
        code_ciphertext=$3,handled_at=NOW() WHERE id=$1::uuid`, [request.id, grant.id, ciphertext])
      await client.query(`INSERT INTO notifications (user_id,type,title,content,from_user_id,from_user_name,link)
        VALUES ($1::uuid,'access_recovery','Recovery passcode issued',
          'Return to the recovery desk in the browser where you requested access. Your passcode expires in 15 minutes.',
          $2::uuid,'Administration','/forgot-password')`, [request.user_id, input.adminId])
    } else {
      await client.query(`UPDATE access_recovery_requests SET status='denied',handled_at=NOW() WHERE id=$1::uuid`, [request.id])
    }
    await client.query('COMMIT')
    return { success: true }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally { client.release() }
}
