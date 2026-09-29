import { getPool, sql } from './db'
import { issueWeaveReceipt } from './weave-receipts'
import { WORLD_RULES } from './world/constants'

export type ContinuanceStatus = 'active' | 'due' | 'suspended'

export async function ensureContinuanceTables() {
  try {
    // 1. Add continuance columns to users table (keep legacy names for DB compatibility)
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active'`
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMPTZ`
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_subscription_exempt BOOLEAN DEFAULT false`
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_last_paid_at TIMESTAMPTZ`
    
    // 2. Create continuance_payments table (keep legacy names for DB compatibility)
    await sql`
      CREATE TABLE IF NOT EXISTS subscription_payments (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id),
        amount NUMERIC(20,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'NGN',
        payment_method VARCHAR(50),
        transaction_reference TEXT,
        status VARCHAR(20) DEFAULT 'success',
        period_start TIMESTAMPTZ,
        period_end TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `
    return true
  } catch (error) {
    console.error('Failed to ensure continuance tables:', error)
    return false
  }
}

export async function getBridgerSubscription(userId: string) {
  await ensureContinuanceTables()

  const read = async () => {
    const result = await sql`
      SELECT id, role, subscription_status as status, subscription_expiry as expiry,
             is_subscription_exempt as is_exempt, subscription_last_paid_at as last_paid_at
      FROM users
      WHERE id = ${userId}
    `
    return result[0] || null
  }

  let bridger = await read()
  if (!bridger) return null

  if (!bridger.is_exempt && bridger.role === 'bridger') {
    const now = new Date()
    const expiry = bridger.expiry ? new Date(bridger.expiry) : null

    // Renewal must be attempted before status enforcement. This also repairs
    // previously suspended Bridgers as soon as funds are available.
    if (bridger.status === 'due' || bridger.status === 'suspended' || (expiry && now >= expiry)) {
      await autoDeductContinuance(userId)
      bridger = await read()
    } else if (!expiry && bridger.status === 'active') {
      const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      await sql`UPDATE users SET subscription_expiry = ${newExpiry} WHERE id = ${userId}`
      bridger.expiry = newExpiry
    }
  }

  return bridger
}

export async function payContinuance(userId: string, amount: number, reference: string) {
  await ensureContinuanceTables()
  
  const now = new Date()
  const nextExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  
  // Start transaction
  await sql`BEGIN`
  try {
    // 1. Record payment
    await sql`
      INSERT INTO subscription_payments (user_id, amount, transaction_reference, period_start, period_end)
      VALUES (${userId}, ${amount}, ${reference}, ${now}, ${nextExpiry})
    `
    
    // 2. Update user status
    await sql`
      UPDATE users 
      SET subscription_status = 'active', 
          subscription_expiry = ${nextExpiry},
          subscription_last_paid_at = ${now}
      WHERE id = ${userId}
    `
    
    await sql`COMMIT`
    return true
  } catch (error) {
    await sql`ROLLBACK`
    console.error('Failed to process continuance payment:', error)
    return false
  }
}

export async function setExemptStatus(userId: string, isExempt: boolean) {
  await ensureContinuanceTables()
  
  await sql`
    UPDATE users 
    SET is_subscription_exempt = ${isExempt},
        subscription_status = ${isExempt ? 'active' : 'due'}
    WHERE id = ${userId}
  `
}

export async function submitContinuancePayment(
  userId: string,
  amount: number,
  reference: string,
  paymentMethod: string
) {
  await ensureContinuanceTables()

  const result = await sql`
    INSERT INTO subscription_payments
      (user_id, amount, payment_method, transaction_reference, status)
    VALUES (${userId}, ${amount}, ${paymentMethod}, ${reference}, 'pending')
    RETURNING id
  `
  return result[0]?.id ?? null
}

export async function getPendingContinuancePayments() {
  await ensureContinuanceTables()

  return sql`
    SELECT sp.id, sp.user_id, sp.amount, sp.payment_method,
           sp.transaction_reference, sp.created_at, u.email, u.name
    FROM subscription_payments sp
    JOIN users u ON u.id = sp.user_id
    WHERE sp.status = 'pending'
    ORDER BY sp.created_at ASC
  `
}

export async function approveContinuancePayment(paymentId: string) {
  await ensureContinuanceTables()

  const rows = await sql`
    SELECT user_id, amount FROM subscription_payments WHERE id = ${paymentId} AND status = 'pending'
  `
  if (rows.length === 0) return false

  const { user_id, amount } = rows[0]
  const now = new Date()
  const nextExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  await sql`BEGIN`
  try {
    await sql`
      UPDATE subscription_payments
      SET status = 'success', period_start = ${now}, period_end = ${nextExpiry}
      WHERE id = ${paymentId}
    `
    await sql`
      UPDATE users
      SET subscription_status = 'active',
          subscription_expiry = ${nextExpiry},
          subscription_last_paid_at = ${now}
      WHERE id = ${user_id}
    `
    await sql`COMMIT`
    return true
  } catch (error) {
    await sql`ROLLBACK`
    console.error('Failed to approve continuance payment:', error)
    return false
  }
}

export async function rejectContinuancePayment(paymentId: string) {
  await sql`UPDATE subscription_payments SET status = 'rejected' WHERE id = ${paymentId} AND status = 'pending'`
}

const REMINDER_DAYS_BEFORE = 3

export async function autoDeductContinuance(userId: string) {
  await ensureContinuanceTables()
  const { ngnToFlameCoin } = await import('./flame-coin')
  const { getTrxPaymentNgnRate } = await import('./trx-payment')

  let rate = 0
  try {
    const quote = await getTrxPaymentNgnRate()
    rate = Number(quote.rateNgnPerTrx || 0)
  } catch (error) {
    console.error('Continuance rate lookup failed:', error)
    return { success: false, reason: 'rate_unavailable' as const }
  }

  const flameCoinAmount = ngnToFlameCoin(WORLD_RULES.BRIDGER_CONTINUANCE_NGN, rate)
  if (!Number.isFinite(flameCoinAmount) || flameCoinAmount <= 0) {
    return { success: false, reason: 'rate_unavailable' as const }
  }

  const client = await getPool().connect()
  let paymentId: string | null = null
  let newBalance = 0
  let nextExpiry: Date | null = null

  try {
    await client.query('BEGIN')

    const userResult = await client.query(
      `SELECT id,role,subscription_status,subscription_expiry,is_subscription_exempt
       FROM users WHERE id=$1::uuid FOR UPDATE`,
      [userId]
    )
    const bridger = userResult.rows[0]
    if (!bridger || bridger.role !== 'bridger') {
      await client.query('ROLLBACK')
      return { success: false, reason: 'bridger_not_found' as const }
    }

    if (bridger.is_subscription_exempt) {
      await client.query(
        `UPDATE users SET subscription_status='active' WHERE id=$1::uuid`,
        [userId]
      )
      await client.query('COMMIT')
      return { success: true, renewed: false, reason: 'exempt' as const }
    }

    const now = new Date()
    const expiry = bridger.subscription_expiry ? new Date(bridger.subscription_expiry) : null
    if (bridger.subscription_status === 'active' && expiry && expiry > now) {
      await client.query('COMMIT')
      return { success: true, renewed: false, reason: 'not_due' as const, nextExpiry: expiry }
    }

    const walletResult = await client.query(
      `SELECT id,balance_trx FROM wallets
       WHERE user_id=$1::uuid AND is_primary=true
       ORDER BY created_at ASC LIMIT 1 FOR UPDATE`,
      [userId]
    )
    const wallet = walletResult.rows[0]
    const balance = Number(wallet?.balance_trx || 0)

    if (!wallet || balance < flameCoinAmount) {
      const gracePeriodMs = 7 * 24 * 60 * 60 * 1000
      const pastGrace = Boolean(expiry && now.getTime() > expiry.getTime() + gracePeriodMs)
      const nextStatus = pastGrace ? 'suspended' : 'due'
      await client.query(
        `UPDATE users SET subscription_status=$2 WHERE id=$1::uuid`,
        [userId, nextStatus]
      )
      await client.query('COMMIT')
      return {
        success: false,
        reason: 'insufficient_balance' as const,
        requiredFlameCoin: flameCoinAmount,
        availableFlameCoin: balance,
        rate,
        status: nextStatus,
      }
    }

    const debitResult = await client.query(
      `UPDATE wallets
       SET balance_trx=balance_trx-$1,updated_at=NOW()
       WHERE id=$2::uuid AND balance_trx >= $1
       RETURNING balance_trx`,
      [flameCoinAmount, wallet.id]
    )
    if (debitResult.rows.length !== 1) throw new Error('Wallet debit lost concurrency race')
    newBalance = Number(debitResult.rows[0].balance_trx || 0)

    nextExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const paymentResult = await client.query(
      `INSERT INTO subscription_payments
        (user_id,amount,currency,payment_method,transaction_reference,status,period_start,period_end)
       VALUES ($1::uuid,$2,'Flame Coin','flame_coin_wallet',$3,'success',$4,$5)
       RETURNING id`,
      [userId, flameCoinAmount, 'AUTO-' + Date.now(), now, nextExpiry]
    )
    paymentId = String(paymentResult.rows[0]?.id || '') || null

    await client.query(
      `INSERT INTO ledger_entries
        (id,user_id,entry_type,amount,currency,description,balance_before,balance_after,metadata,created_at)
       VALUES (gen_random_uuid(),$1::uuid,'subscription',$2,'Flame Coin',
        'Bridger Continuance automatic renewal',$3,$4,$5::jsonb,NOW())`,
      [
        userId,
        flameCoinAmount,
        balance,
        newBalance,
        JSON.stringify({ source: 'bridger_continuance', payment_id: paymentId, rate_ngn_per_flame_coin: rate }),
      ]
    )

    await client.query(
      `UPDATE users
       SET subscription_status='active',subscription_expiry=$2,subscription_last_paid_at=$3
       WHERE id=$1::uuid`,
      [userId, nextExpiry, now]
    )

    await client.query('COMMIT')
  } catch (error) {
    try { await client.query('ROLLBACK') } catch {}
    console.error('Auto-deduct continuance failed:', error)
    return { success: false, reason: 'error' as const }
  } finally {
    client.release()
  }

  try {
    if (paymentId && nextExpiry) {
      await issueWeaveReceipt({
        userId,
        kind: 'subscription',
        source: 'bridger_continuance_auto_renewal',
        sourceId: paymentId,
        amount: flameCoinAmount,
        currency: 'Flame Coin',
        status: 'paid',
        description: 'Bridger Continuance automatic renewal',
        metadata: {
          balanceAfter: newBalance,
          rateNgnPerFlameCoin: rate,
          nextExpiry: nextExpiry.toISOString(),
        },
      })
    }
  } catch (error) {
    console.error('Continuance receipt creation failed:', error)
  }

  try {
    await sql`
      INSERT INTO notifications (user_id,type,title,content,link)
      VALUES (${userId}::uuid,'subscription','Continuance renewed',
        'Your Bridger Continuance renewed automatically from your Flame Coin wallet.','/receipts')
    `
  } catch (error) {
    console.error('Continuance renewal notification failed:', error)
  }

  return { success: true, renewed: true, flameCoinAmount, rate, nextExpiry, newBalance, paymentId }
}

export async function getBridgersNeedingAttention() {
  await ensureContinuanceTables()
  const now = new Date()
  const reminderThreshold = new Date(now.getTime() + REMINDER_DAYS_BEFORE * 24 * 60 * 60 * 1000)

  const dueForReminder = await sql`
    SELECT id, subscription_expiry FROM users
    WHERE role = 'bridger' AND is_subscription_exempt = false
      AND subscription_status = 'active'
      AND subscription_expiry IS NOT NULL
      AND subscription_expiry <= ${reminderThreshold}
      AND subscription_expiry > ${now}
  `

  const dueForDeduction = await sql`
    SELECT id FROM users
    WHERE role = 'bridger' AND is_subscription_exempt = false
      AND subscription_status IN ('active', 'due', 'suspended')
      AND subscription_expiry IS NOT NULL
      AND subscription_expiry <= ${now}
  `

  return { dueForReminder, dueForDeduction }
}
