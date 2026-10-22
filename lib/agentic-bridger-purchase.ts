import { getPool } from '@/lib/db'
import { issueWeaveReceipt } from '@/lib/weave-receipts'
import { WORLD_RULES } from '@/lib/world/constants'

// A Bridger keeps their normal position without any recurring subscription.
// A single 11 Flame Coin payment attains Agentic-Bridger permanently.
// Attainment enables Lifestyle access but does not appoint anyone to employment.
export const AGENTIC_BRIDGER_ONE_TIME_FLAME_COIN = WORLD_RULES.AGENTIC_BRIDGER_ONE_TIME_FLAME_COIN

export async function ensureAgenticBridgerPurchaseTable() {
  const pool = getPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bridger_agentic_purchases (
      user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      paid_flame_coin numeric(20,6) NOT NULL,
      paid_at timestamptz NOT NULL DEFAULT NOW(),
      receipt_reference uuid NOT NULL DEFAULT gen_random_uuid()
    )
  `)
}

export async function getAgenticBridgerPurchase(userId: string) {
  await ensureAgenticBridgerPurchaseTable()
  const result = await getPool().query(
    'SELECT user_id,paid_flame_coin,paid_at,receipt_reference FROM bridger_agentic_purchases WHERE user_id=$1::uuid',
    [userId]
  )
  return result.rows[0] || null
}

export async function purchaseAgenticBridger(userId: string) {
  await ensureAgenticBridgerPurchaseTable()
  const client = await getPool().connect()
  let purchase: any = null
  let balanceAfter = 0
  try {
    await client.query('BEGIN')
    // Lock the user so simultaneous purchases cannot charge twice.
    const users = await client.query('SELECT id,role,is_active FROM users WHERE id=$1::uuid FOR UPDATE', [userId])
    const user = users.rows[0]
    if (!user || user.role !== 'bridger' || user.is_active === false) {
      await client.query('ROLLBACK')
      return { success:false as const, reason:'bridger_unavailable' as const }
    }
    const existing = await client.query('SELECT paid_at FROM bridger_agentic_purchases WHERE user_id=$1::uuid', [userId])
    if (existing.rows.length) {
      await client.query('COMMIT')
      return { success:true as const, alreadyOwned:true, chargedFlameCoin:0 }
    }
    const wallets = await client.query(
      'SELECT id,balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true ORDER BY created_at LIMIT 1 FOR UPDATE',
      [userId]
    )
    const wallet = wallets.rows[0]
    const before = Number(wallet?.balance_trx || 0)
    if (!wallet || before < AGENTIC_BRIDGER_ONE_TIME_FLAME_COIN) {
      await client.query('ROLLBACK')
      return { success:false as const, reason:'insufficient_balance' as const,
        requiredFlameCoin:AGENTIC_BRIDGER_ONE_TIME_FLAME_COIN, availableFlameCoin:before }
    }
    const debit = await client.query(
      'UPDATE wallets SET balance_trx=balance_trx-$1,updated_at=NOW() WHERE id=$2::uuid AND balance_trx >= $1 RETURNING balance_trx',
      [AGENTIC_BRIDGER_ONE_TIME_FLAME_COIN, wallet.id]
    )
    if (!debit.rows.length) throw new Error('Agentic-Bridger wallet debit lost concurrency race')
    balanceAfter = Number(debit.rows[0].balance_trx)
    const added = await client.query(
      'INSERT INTO bridger_agentic_purchases (user_id,paid_flame_coin) VALUES ($1::uuid,$2) RETURNING *',
      [userId, AGENTIC_BRIDGER_ONE_TIME_FLAME_COIN]
    )
    purchase = added.rows[0]
    await client.query(
      `INSERT INTO ledger_entries (id,user_id,entry_type,amount,currency,description,balance_before,balance_after,metadata,created_at)
       VALUES (gen_random_uuid(),$1::uuid,'fee',$2,'Flame Coin','Agentic-Bridger attainment · one-time 11 Flame Coin',$3,$4,$5::jsonb,NOW())`,
      [userId,AGENTIC_BRIDGER_ONE_TIME_FLAME_COIN,before,balanceAfter,
       JSON.stringify({commerce_type:'purchase',source:'agentic_bridger_one_time',purchase_id:purchase.receipt_reference})]
    )
    await client.query('COMMIT')
  } catch (error) {
    try { await client.query('ROLLBACK') } catch {}
    console.error('[agentic-bridger purchase] transaction failed:', error)
    return { success:false as const, reason:'error' as const }
  } finally {
    client.release()
  }

  try {
    await issueWeaveReceipt({
      userId, kind:'purchase', source:'agentic_bridger_one_time',
      sourceId:String(purchase.receipt_reference),
      amount:AGENTIC_BRIDGER_ONE_TIME_FLAME_COIN, currency:'Flame Coin', status:'paid',
      description:'Agentic-Bridger attainment · one-time 11 Flame Coin',
      metadata:{permanent:true,balanceAfter}
    })
  } catch (error) { console.error('[agentic-bridger purchase] receipt failed:', error) }
  return { success:true as const, alreadyOwned:false, chargedFlameCoin:AGENTIC_BRIDGER_ONE_TIME_FLAME_COIN, balanceAfter }
}
