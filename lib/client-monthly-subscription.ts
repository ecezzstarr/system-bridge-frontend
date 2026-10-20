import { getPool } from '@/lib/db'
import { issueWeaveReceipt } from '@/lib/weave-receipts'

export const CLIENT_MONTHLY_SUBSCRIPTION_FLAME_COIN = 600

export type RegisteredGender = 'male' | 'female'

export function normalizeRegisteredGender(input: unknown): RegisteredGender | null {
  const value = String(input || '').trim().toLowerCase()
  return value === 'male' || value === 'female' ? value : null
}

export function clientEnterpriseTitle(gender: unknown): 'lord' | 'lady' | null {
  const registered = normalizeRegisteredGender(gender)
  return registered === 'male' ? 'lord' : registered === 'female' ? 'lady' : null
}

// Use a paid Client subscription record as evidence. A legacy users row with a
// default subscription_status='active' must NOT grant a free Lord/Lady title.
let monthlySchemaReady: Promise<void> | null = null

export function ensureClientMonthlySchema() {
  if (!monthlySchemaReady) monthlySchemaReady = (async () => {
  const pool = getPool()
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS gender varchar(12)")
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status varchar(20) DEFAULT 'active'")
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expiry timestamptz")
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_last_paid_at timestamptz")
  await pool.query(`
    CREATE TABLE IF NOT EXISTS client_monthly_subscriptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL REFERENCES users(id),
      amount_flame_coin numeric(20,2) NOT NULL,
      payment_status varchar(20) NOT NULL DEFAULT 'paid',
      period_start timestamptz NOT NULL,
      period_end timestamptz NOT NULL,
      balance_after numeric(30,8) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query("CREATE INDEX IF NOT EXISTS client_monthly_subscriptions_active_idx ON client_monthly_subscriptions(client_id,period_end DESC)")
  })().catch(error => { monthlySchemaReady = null; throw error })
  return monthlySchemaReady
}

export async function getClientMonthlyStanding(clientId: string) {
  await ensureClientMonthlySchema()
  const result = await getPool().query(`
    SELECT u.gender,
      s.id AS payment_id,s.period_end,s.period_start,s.amount_flame_coin
    FROM users u
    LEFT JOIN LATERAL (
      SELECT id,period_start,period_end,amount_flame_coin
      FROM client_monthly_subscriptions
      WHERE client_id=u.id AND payment_status='paid'
      ORDER BY period_end DESC LIMIT 1
    ) s ON true
    WHERE u.id=$1::uuid AND u.role='client' LIMIT 1
  `, [clientId])
  const row = result.rows[0]
  const title = clientEnterpriseTitle(row?.gender)
  const active = Boolean(row?.payment_id && row?.period_end && new Date(row.period_end).getTime() > Date.now())
  return {
    active,
    gender: normalizeRegisteredGender(row?.gender),
    title: active ? title : null,
    monthlyFlameCoin: CLIENT_MONTHLY_SUBSCRIPTION_FLAME_COIN,
    paidUntil: active ? new Date(row.period_end).toISOString() : null,
    hasPayment: Boolean(row?.payment_id),
    needsRegistrationGender: !title,
  }
}

export async function subscribeClientMonthly(clientId: string) {
  await ensureClientMonthlySchema()
  const conn = await getPool().connect()
  let paymentId: string | null = null
  let paidUntil: string | null = null
  let balanceAfter: number | null = null
  let title: 'lord' | 'lady' | null = null
  try {
    await conn.query('BEGIN')
    const userRes = await conn.query(
      "SELECT id,gender,is_active FROM users WHERE id=$1::uuid AND role='client' FOR UPDATE",
      [clientId]
    )
    const user = userRes.rows[0]
    if (!user || user.is_active === false) {
      await conn.query('ROLLBACK')
      return {success:false as const, reason:'client_inactive'}
    }
    const folder=await conn.query("SELECT id,status FROM client_file_folders WHERE client_id=$1::uuid AND status='active' LIMIT 1 FOR UPDATE",[clientId])
    if(!folder.rows.length) {
      await conn.query('ROLLBACK')
      return {success:false as const,reason:'file_folder_inactive'}
    }
    title = clientEnterpriseTitle(user.gender)
    if (!title) {
      await conn.query('ROLLBACK')
      return {success:false as const, reason:'gender_missing'}
    }
    const current = await conn.query(`
      SELECT id,period_end FROM client_monthly_subscriptions
      WHERE client_id=$1::uuid AND payment_status='paid' AND period_end>NOW()
      ORDER BY period_end DESC LIMIT 1
    `, [clientId])
    if (current.rows.length) {
      await conn.query("UPDATE client_file_folders SET weave_position=$2,updated_at=NOW() WHERE client_id=$1::uuid AND weave_position NOT IN ('lord','lady')", [clientId,title])
      await conn.query('COMMIT')
      return {success:true as const, renewed:false, title, paidUntil:new Date(current.rows[0].period_end).toISOString()}
    }
    const wallet = await conn.query(`
      SELECT id,balance_trx FROM wallets WHERE user_id=$1::uuid
        AND is_primary=true ORDER BY created_at ASC LIMIT 1 FOR UPDATE
    `,[clientId])
    const available = Number(wallet.rows[0]?.balance_trx || 0)
    if (!wallet.rows.length || available < CLIENT_MONTHLY_SUBSCRIPTION_FLAME_COIN) {
      await conn.query('ROLLBACK')
      return {success:false as const, reason:'insufficient_balance', requiredFlameCoin:CLIENT_MONTHLY_SUBSCRIPTION_FLAME_COIN, availableFlameCoin:available}
    }
    const debit = await conn.query(
      "UPDATE wallets SET balance_trx=balance_trx-$1,updated_at=NOW() WHERE id=$2::uuid AND balance_trx >= $1 RETURNING balance_trx",
      [CLIENT_MONTHLY_SUBSCRIPTION_FLAME_COIN,wallet.rows[0].id]
    )
    if (debit.rows.length !== 1) throw new Error('Client subscription debit race')
    balanceAfter = Number(debit.rows[0].balance_trx)
    const inserted = await conn.query(`
      INSERT INTO client_monthly_subscriptions
        (client_id,amount_flame_coin,payment_status,period_start,period_end,balance_after)
      VALUES ($1::uuid,$2,'paid',NOW(),NOW()+INTERVAL '1 month',$3)
      RETURNING id,period_end
    `,[clientId,CLIENT_MONTHLY_SUBSCRIPTION_FLAME_COIN,balanceAfter])
    paymentId = inserted.rows[0].id
    paidUntil = new Date(inserted.rows[0].period_end).toISOString()
    await conn.query(
      "UPDATE users SET subscription_status='active',subscription_expiry=$2,subscription_last_paid_at=NOW() WHERE id=$1::uuid",
      [clientId,paidUntil]
    )
    await conn.query(
      "UPDATE client_file_folders SET weave_position=$2,updated_at=NOW() WHERE client_id=$1::uuid",
      [clientId,title]
    )
    await conn.query(`
      INSERT INTO ledger_entries
        (id,user_id,entry_type,amount,currency,description,balance_before,balance_after,metadata,created_at)
      VALUES (gen_random_uuid(),$1::uuid,'fee',$2,'Flame Coin',
       'Client monthly subscription · Lord/Lady enterprise standing',$3,$4,$5::jsonb,NOW())
    `,[clientId,CLIENT_MONTHLY_SUBSCRIPTION_FLAME_COIN,available,balanceAfter,
      JSON.stringify({source:'client_monthly_subscription',paymentId,title})])
    await conn.query('COMMIT')
  } catch(error) {
    try {await conn.query('ROLLBACK')}catch {}
    console.error('[Client subscription]',error)
    return {success:false as const,reason:'payment_error'}
  } finally {
    conn.release()
  }
  // Receipt failure must not duplicate a successful wallet debit on retry.
  if (paymentId) {
    try {
      await issueWeaveReceipt({
        userId:clientId,kind:'subscription',source:'client_monthly_subscription',
        sourceId:paymentId,amount:CLIENT_MONTHLY_SUBSCRIPTION_FLAME_COIN,
        currency:'Flame Coin',status:'paid',description:'Client monthly subscription · Enterprise standing',
        metadata:{title,paidUntil,balanceAfter},
      })
    } catch(e) { console.error('[Client subscription receipt]',e) }
  }
  return {success:true as const,renewed:true,title,paidUntil,balanceAfter}
}
