import { sql } from './db'
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
  
  const result = await sql`
    SELECT id, role, subscription_status as status, subscription_expiry as expiry, is_subscription_exempt as is_exempt, subscription_last_paid_at as last_paid_at
    FROM users
    WHERE id = ${userId}
  `
  
  if (result.length === 0) return null
  
  const bridger = result[0]
  
  // Logic to auto-update status based on expiry
  if (!bridger.is_exempt && bridger.role === 'bridger') {
    const now = new Date()
    const expiry = bridger.expiry ? new Date(bridger.expiry) : null
    
    if (expiry) {
      const gracePeriod = 7 * 24 * 60 * 60 * 1000 // 7 days grace
      
      if (now > new Date(expiry.getTime() + gracePeriod) && bridger.status !== 'suspended') {
        // Mark as suspended if past grace period
        await sql`UPDATE users SET subscription_status = 'suspended' WHERE id = ${userId}`
        bridger.status = 'suspended'
      } else if (now > expiry && bridger.status === 'active') {
        // Mark as due if past expiry but within grace
        await sql`UPDATE users SET subscription_status = 'due' WHERE id = ${userId}`
        bridger.status = 'due'
      }
    } else if (bridger.status === 'active') {
        // If no expiry but active, set one for 30 days from now (initial activation)
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
  const { getTrxNgnRate, ngnToTrx } = await import('./trx-rate')
  const { rate } = await getTrxNgnRate()
  const trxAmount = ngnToTrx(WORLD_RULES.BRIDGER_CONTINUANCE_NGN, rate)

  await sql`BEGIN`
  try {
    const walletRows = await sql`
      SELECT balance_trx FROM wallets WHERE user_id = ${userId}::uuid AND is_primary = true FOR UPDATE
    `
    const balance = walletRows[0]?.balance_trx ?? 0

    if (balance < trxAmount) {
      await sql`ROLLBACK`
      return { success: false, reason: 'insufficient_balance', requiredTrx: trxAmount, availableTrx: balance, rate }
    }

    const newBalance = balance - trxAmount
    await sql`
      UPDATE wallets SET balance_trx = ${newBalance}, updated_at = NOW()
      WHERE user_id = ${userId}::uuid AND is_primary = true
    `

    const now = new Date()
    const nextExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    await sql`
      INSERT INTO subscription_payments (user_id, amount, currency, payment_method, transaction_reference, status, period_start, period_end)
      VALUES (${userId}, ${trxAmount}, 'TRX', 'trx_wallet', ${'AUTO-' + Date.now()}, 'success', ${now}, ${nextExpiry})
    `

    await sql`
      UPDATE users
      SET subscription_status = 'active', subscription_expiry = ${nextExpiry}, subscription_last_paid_at = ${now}
      WHERE id = ${userId}
    `

    await sql`COMMIT`
    return { success: true, trxAmount, rate, nextExpiry }
  } catch (error) {
    await sql`ROLLBACK`
    console.error('Auto-deduct continuance failed:', error)
    return { success: false, reason: 'error' }
  }
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
      AND subscription_status IN ('active', 'due')
      AND subscription_expiry IS NOT NULL
      AND subscription_expiry <= ${now}
  `

  return { dueForReminder, dueForDeduction }
}
