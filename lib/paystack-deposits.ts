import { getPool } from '@/lib/db'
import { verifyPaystackTransaction, paystackTransactionMatches, paystackMismatchReason } from '@/lib/paystack'
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
    const matchInput = {
      transaction, expectedReference: reference, expectedAmountKobo: expectedKobo,
      expectedEmail: deposit.owner_email,
      expectedDepositId: String(deposit.id), expectedUserId: String(deposit.user_id),
    }
    if (!paystackTransactionMatches(matchInput)) {
      // An incomplete checkout is not a failed payment. Allow webhook/Administration retry.
      // Only a completed but mismatched payment is rejected for manual investigation.
      if (deposit.status === 'pending' && transaction.status === 'success') {
        await client.query("UPDATE deposits SET status='rejected',updated_at=NOW() WHERE id=$1::uuid AND status='pending'", [deposit.id])
        await client.query(
          "INSERT INTO ledger_entries(user_id,entry_type,amount,currency,description,metadata) VALUES($1::uuid,'deposit',0,'Flame Coin','Paystack deposit verification failed',$2::jsonb)",
          [deposit.user_id, JSON.stringify({deposit_id:deposit.id,payment_method:'Paystack',reference,expected_amount_kobo:expectedKobo,received_amount_kobo:transaction.amount,received_currency:transaction.currency,received_status:transaction.status,status:'failed'})],
        )
      }
      await client.query('COMMIT')
      return { settled: false, reason: paystackMismatchReason(matchInput) || 'Paystack could not match the original checkout.' }
    }
    const flameCoin = Number(deposit.amount_trx)
    if (!Number.isFinite(flameCoin) || flameCoin <= 0) throw new Error('Stored Flame Coin credit is invalid')
    // An old manual approval may already have credited the wallet. Inspect
    // immutable ledger evidence before ANY repair, including pending records.
    const previous = await client.query(
      `SELECT
        COUNT(*) FILTER (WHERE entry_type='deposit' AND amount>0) AS credits,
        COALESCE(SUM(amount) FILTER (WHERE entry_type='deposit' AND amount>0),0) AS credited_amount,
        COUNT(*) FILTER (WHERE metadata->>'event_type'='refund.processed') AS refunds
       FROM ledger_entries WHERE user_id=$1::uuid AND metadata->>'deposit_id'=$2`,
      [deposit.user_id, String(deposit.id)],
    )
    const credits = Number(previous.rows[0]?.credits || 0)
    const creditedAmount = Number(previous.rows[0]?.credited_amount || 0)
    const refunds = Number(previous.rows[0]?.refunds || 0)

    if (deposit.status === 'approved') {
      if (deposit.verified_at) {
        await client.query('COMMIT')
        return { settled: true, duplicate: true, depositId: deposit.id }
      }
      // Historic manual credit: provider confirmation attaches proof only.
      // No additional wallet increment is allowed.
      if (credits === 1 && Math.abs(creditedAmount - flameCoin) < 0.000001 && refunds === 0) {
        const proof = await client.query(
          "UPDATE deposits SET verified_at=NOW(),updated_at=NOW() WHERE id=$1::uuid AND status='approved' AND verified_at IS NULL RETURNING id",
          [deposit.id],
        )
        if (proof.rowCount !== 1) throw new Error('Historical deposit proof reconciliation conflict')
        await client.query(
          "INSERT INTO ledger_entries(user_id,entry_type,amount,currency,description,metadata) VALUES($1::uuid,'deposit',0,'Flame Coin','Historical Paystack payment evidence reconciled',$2::jsonb)",
          [deposit.user_id, JSON.stringify({deposit_id:deposit.id,payment_method:'Paystack',reference,paystack_paid_at:transaction.paid_at,existing_credited_flame_coin:creditedAmount,proof_only:true})],
        )
        await client.query('COMMIT')
        return { settled: true, duplicate: true, evidenceReconciled: true, depositId: deposit.id }
      }
      await client.query('COMMIT')
      return { settled: false, reason: 'Historical approval has no single matching wallet credit in the ledger, or a refund was recorded. Review the wallet ledger; no new credit was applied.' }
    }
    if (!['pending', 'rejected'].includes(deposit.status)) {
      await client.query('COMMIT')
      return { settled: false, reason: 'Deposit is not eligible for verified recovery.' }
    }
    if (credits > 0 || refunds > 0) {
      await client.query('COMMIT')
      return { settled: false, reason: 'A previous credit or refund event exists for this deposit. Administration must reconcile the ledger before further wallet changes.' }
    }
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
      "UPDATE deposits SET status='approved',verified_at=NOW(),updated_at=NOW() WHERE id=$1::uuid AND status IN ('pending','rejected') RETURNING id",
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
