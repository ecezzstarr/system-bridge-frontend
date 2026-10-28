import { getPool } from '@/lib/db'
import { verifyPaystackTransaction, paystackTransactionMatches } from '@/lib/paystack'
import { notifyDepositDecision } from '@/lib/deposit-notifications'

/** Verify against Paystack and settle one pending wallet deposit atomically. */
export async function settlePaystackDeposit(reference: string) {
  const transaction = await verifyPaystackTransaction(reference)
  const client = await getPool().connect()
  let notification: { userId: string; depositId: string; amountNgn: number; flameCoin: number } | null = null
  try {
    await client.query('BEGIN')
    const found = await client.query(
      "SELECT d.*, u.email AS owner_email, u.role AS owner_role FROM deposits d JOIN users u ON u.id=d.user_id WHERE d.method='paystack' AND d.receipt_data=$1 FOR UPDATE OF d",
      [reference],
    )
    const deposit = found.rows[0]
    if (!deposit) throw new Error('Paystack deposit reference was not found')
    const expectedKobo = Math.round(Number(deposit.amount_usd) * 100)
    if (!paystackTransactionMatches({ transaction, expectedReference: reference, expectedAmountKobo: expectedKobo, expectedEmail: deposit.owner_email })) {
      if (deposit.status === 'pending') {
        await client.query("UPDATE deposits SET status='rejected',updated_at=NOW() WHERE id=$1::uuid AND status='pending'", [deposit.id])
        await client.query(
          "INSERT INTO ledger_entries(user_id,entry_type,amount,currency,description,metadata) VALUES($1::uuid,'deposit',0,'Flame Coin','Paystack deposit verification failed',$2::jsonb)",
          [deposit.user_id, JSON.stringify({deposit_id:deposit.id,payment_method:'Paystack',reference,expected_amount_kobo:expectedKobo,received_amount_kobo:transaction.amount,received_currency:transaction.currency,received_status:transaction.status,status:'failed'})],
        )
      }
      await client.query('COMMIT')
      return { settled: false, reason: 'Payment status, reference, currency, amount, or payer did not match the pending deposit.' }
    }
    if (deposit.status === 'approved') {
      await client.query('COMMIT')
      return { settled: true, duplicate: true, depositId: deposit.id }
    }
    if (deposit.status !== 'pending') {
      await client.query('COMMIT')
      return { settled: false, reason: 'Deposit is no longer pending.' }
    }
    const flameCoin = Number(deposit.amount_trx)
    if (!Number.isFinite(flameCoin) || flameCoin <= 0) throw new Error('Stored Flame Coin credit is invalid')
    const wallet = await client.query(
      "UPDATE wallets SET balance_trx=balance_trx+$2,updated_at=NOW() WHERE user_id=$1::uuid AND is_primary=true RETURNING balance_trx",
      [deposit.user_id, flameCoin],
    )
    if (wallet.rowCount !== 1) throw new Error('Primary wallet missing or duplicated; no deposit credit was applied')
    await client.query(
      "INSERT INTO ledger_entries(user_id,entry_type,amount,currency,description,metadata) VALUES($1::uuid,'deposit',$2,'Flame Coin','Verified Paystack deposit credited',$3::jsonb)",
      [deposit.user_id, flameCoin, JSON.stringify({deposit_id:deposit.id,payment_method:'Paystack',reference,ngn_amount:Number(deposit.amount_usd),amount_kobo:expectedKobo,credited_flame_coin:flameCoin,paystack_channel:transaction.channel,paystack_paid_at:transaction.paid_at})],
    )
    const updated = await client.query(
      "UPDATE deposits SET status='approved',verified_at=NOW(),updated_at=NOW() WHERE id=$1::uuid AND status='pending' RETURNING id",
      [deposit.id],
    )
    if (updated.rowCount !== 1) throw new Error('Deposit settlement conflict')
    await client.query('COMMIT')
    notification = { userId:String(deposit.user_id), depositId:String(deposit.id), amountNgn:Number(deposit.amount_usd), flameCoin }
    return { settled: true, duplicate: false, depositId: deposit.id, flameCoin }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
    if (notification) {
      await notifyDepositDecision({userId:notification.userId,approved:true,rail:'PAYSTACK',depositId:notification.depositId,amountLabel:'₦'+notification.amountNgn.toLocaleString(),creditedFlameCoin:notification.flameCoin})
    }
  }
}
