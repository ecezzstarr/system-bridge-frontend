import { getPool, sql } from '@/lib/db'
import { WORLD_RULES } from './world/constants'
import { getAgenticBridgerState } from './weave-lifestyle'

export async function creditBridgerCommission(params: {
  bridgerId: string
  baseAmount: number
  description: string
  sourceId: string
}): Promise<{ commissionAmount: number; credited: boolean; rate: number; lifestyle: string | null } | null> {
  const { bridgerId, baseAmount, description, sourceId } = params
  if (!bridgerId || !sourceId || !Number.isFinite(baseAmount) || baseAmount <= 0) return null

  const agentic = await getAgenticBridgerState(bridgerId)
  const rate = agentic.active ? agentic.earningRate : WORLD_RULES.BRIDGER_YIELD_RATE
  const lifestyle = agentic.active ? agentic.lifestyle : null
  const commissionAmount = Math.round(baseAmount * rate * 1e6) / 1e6
  if (commissionAmount <= 0) return null

  const sourceKey = `bridger:file_folder:${sourceId}:${bridgerId}`
  const client = await getPool().connect()
  let credited = false

  try {
    await client.query('BEGIN')

    const walletResult = await client.query(
      `SELECT id,balance_trx
       FROM wallets
       WHERE user_id=$1::uuid AND is_primary=true
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE`,
      [bridgerId],
    )
    const wallet = walletResult.rows[0]
    if (!wallet) {
      await client.query('ROLLBACK')
      console.error(`[bridger-commission] Bridger ${bridgerId} has no primary wallet`)
      return null
    }

    const existing = await client.query(
      `SELECT id
       FROM ledger_entries
       WHERE user_id=$1::uuid
         AND (entry_type='bridger_commission' OR metadata->>'commerce_type'='bridger_commission')
         AND metadata->>'source_key'=$2
       LIMIT 1`,
      [bridgerId, sourceKey],
    )
    if (existing.rows.length) {
      await client.query('COMMIT')
      return { commissionAmount, credited: false, rate, lifestyle }
    }

    const before = Number(wallet.balance_trx || 0)
    const updated = await client.query(
      `UPDATE wallets
       SET balance_trx=balance_trx+$1,updated_at=NOW()
       WHERE id=$2::uuid
       RETURNING balance_trx`,
      [commissionAmount, wallet.id],
    )
    const after = Number(updated.rows[0]?.balance_trx || before + commissionAmount)

    await client.query(
      `INSERT INTO ledger_entries (id, user_id, entry_type, amount, currency, description, balance_before, balance_after, metadata, created_at) VALUES (gen_random_uuid(), $1::uuid, 'earning', $2, 'Flame Coin', $3, $4, $5, ($6::jsonb) || jsonb_build_object('commerce_type','bridger_commission'), NOW())`,
      [
        bridgerId,
        commissionAmount,
        description,
        before,
        after,
        JSON.stringify({
          source_key: sourceKey,
          source_id: sourceId,
          activity: 'client_deposit',
          rate,
          lifestyle,
        }),
      ],
    )

    const profileUpdate=await client.query(
      `UPDATE bridger_profiles
       SET total_earnings=COALESCE(total_earnings,0)+$1,updated_at=NOW()
       WHERE user_id=$2::uuid
       RETURNING user_id`,
      [commissionAmount, bridgerId],
    )
    if(profileUpdate.rows.length!==1)throw new Error('Bridger earnings profile unavailable')

    await client.query('COMMIT')
    credited = true
  } catch (error) {
    try { await client.query('ROLLBACK') } catch {}
    console.error(`[bridger-commission] Failed for bridger ${bridgerId}:`, error)
    return null
  } finally {
    client.release()
  }

  if (credited) {
    try {
      await sql`
        INSERT INTO notifications (user_id,type,title,content,from_user_name,link)
        VALUES (
          ${bridgerId}::uuid,
          'commission',
          ${lifestyle === 'agentic_bridger' ? 'Agentic-Bridger return has come to you' : 'A File Folder return has come to you'},
          ${`You earned ${commissionAmount.toFixed(2)} Flame Coin (${(rate * 100).toFixed(0)}%) from a verified Client File Folder purchase${lifestyle === 'agentic_bridger' ? ' through your Agentic-Bridger lifestyle.' : '.'}`},
          'WEAVE',
          '/wallet'
        )
      `
    } catch (error) {
      console.error('[bridger-commission] notification failed:', error)
    }
  }

  return { commissionAmount, credited, rate, lifestyle }
}
