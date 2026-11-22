import { getPool } from '@/lib/db'
import { verifyPaystackTransaction, paystackMismatchReason } from '@/lib/paystack'
import { getPaystackConfig } from '@/lib/paystack-config'

/** Read-only evidence for a single Administration-selected Paystack deposit. */
export async function inspectPaystackDeposit(depositId: string) {
  const found = await getPool().query(
    `SELECT d.id,d.user_id,d.status,d.receipt_data AS reference,d.amount_usd,d.amount_trx,d.verified_at,
            u.email AS owner_email
     FROM deposits d JOIN users u ON u.id=d.user_id
     WHERE d.id=$1::uuid AND d.method='paystack' LIMIT 1`,
    [depositId],
  )
  const deposit = found.rows[0]
  if (!deposit) throw new Error('Paystack deposit not found')
  const prior = await getPool().query(
    `SELECT COUNT(*) FILTER (WHERE entry_type='deposit' AND amount>0) AS credits,
            COALESCE(SUM(amount) FILTER (WHERE entry_type='deposit' AND amount>0),0) AS credited_amount,
            COUNT(*) FILTER (WHERE metadata->>'event_type'='refund.processed') AS refunds
     FROM ledger_entries WHERE user_id=$1::uuid AND metadata->>'deposit_id'=$2`,
    [deposit.user_id, String(deposit.id)],
  )
  const credits = Number(prior.rows[0]?.credits || 0)
  const creditedAmount = Number(prior.rows[0]?.credited_amount || 0)
  const refunds = Number(prior.rows[0]?.refunds || 0)
  const mode = await getPaystackConfig().then(config => config.mode).catch(() => 'unavailable')
  let paymentStatus: string = 'unavailable'
  let reason = ''
  try {
    const tx = await verifyPaystackTransaction(String(deposit.reference))
    paymentStatus = String(tx.status || 'unknown')
    reason = paystackMismatchReason({
      transaction: tx,
      expectedReference: String(deposit.reference),
      expectedAmountKobo: Math.round(Number(deposit.amount_usd) * 100),
      expectedEmail: String(deposit.owner_email || ''),
      expectedDepositId: String(deposit.id),
      expectedUserId: String(deposit.user_id),
    }) || ''
  } catch(error) {
    reason = error instanceof Error ? error.message : 'Paystack could not verify this reference.'
  }
  const matched = paymentStatus === 'success' && !reason
  // A USD quote belongs to the new isolated ledger, never to balance_trx.
  const usdTable=await getPool().query("SELECT to_regclass('public.weave_usd_deposit_quotes') AS relation")
  if(usdTable.rows[0]?.relation){
    const quoted=await getPool().query(
      'SELECT amount_usd FROM weave_usd_deposit_quotes WHERE deposit_id=$1::uuid',
      [deposit.id],
    )
    if(quoted.rowCount){
      const usdTable=await getPool().query("SELECT to_regclass('public.weave_usd_ledger') AS relation")
      const credit=usdTable.rows[0]?.relation
        ? await getPool().query(
            'SELECT COUNT(*)::integer AS credits,COALESCE(SUM(amount_usd),0) AS credited FROM weave_usd_ledger WHERE deposit_id=$1::uuid',
            [deposit.id],
          ) : null
      const usdCredits=Number(credit?.rows[0]?.credits||0)
      const paidUsd=Number(credit?.rows[0]?.credited||0)
      const quoteUsd=Number(quoted.rows[0].amount_usd)
      const eligible=matched&&refunds===0&&usdCredits===0&&
        ['pending','rejected'].includes(deposit.status)
      return {
        paymentStatus,mode,matched,canResolve:eligible,
        credits:usdCredits,creditedAmount:paidUsd,refunds,currency:'USD',
        guidance:!matched?reason||'Paystack has not confirmed this USD deposit.'
          : refunds>0?'Refund evidence exists. Review before any additional credit.'
          : usdCredits>0?'USD ledger already contains a credit. No second credit permitted.'
          : eligible?'Paystack verified the Naira payment. Use USD reconciliation to apply the locked 
  const ledgerMatches = credits === 1 && Math.abs(creditedAmount - Number(deposit.amount_trx)) < 0.000001
  const canResolve = matched && refunds === 0 && (
    (legacy && ledgerMatches) ||
    (['pending','rejected'].includes(deposit.status) && credits === 0)
  )
  let guidance = reason || 'Paystack independently confirmed this checkout.'
  if (matched && refunds > 0) guidance = 'A refund was recorded. Review the refund before any wallet change.'
  else if (matched && legacy && !ledgerMatches) guidance = 'This historical approval lacks one matching credited ledger entry. Audit the wallet before changing its status.'
  else if (matched && credits > 0 && !legacy) guidance = 'A credit already exists. Review the ledger to prevent duplicate credit.'
  else if (canResolve) guidance = legacy
    ? 'One existing wallet credit matches this successful Paystack payment. Resolve to attach proof without adding a second credit.'
    : 'Paystack confirms payment and no prior credit/refund is recorded. Resolve to credit the wallet exactly once.'
  return { paymentStatus, mode, matched, canResolve, credits, creditedAmount, refunds, guidance }
}
+quoteUsd.toFixed(2)+' credit once.'
          :'USD deposit requires Administrations review before further action.',
      }
    }
  }
  const legacy = deposit.status === 'approved' && !deposit.verified_at
  const ledgerMatches = credits === 1 && Math.abs(creditedAmount - Number(deposit.amount_trx)) < 0.000001
  const canResolve = matched && refunds === 0 && (
    (legacy && ledgerMatches) ||
    (['pending','rejected'].includes(deposit.status) && credits === 0)
  )
  let guidance = reason || 'Paystack independently confirmed this checkout.'
  if (matched && refunds > 0) guidance = 'A refund was recorded. Review the refund before any wallet change.'
  else if (matched && legacy && !ledgerMatches) guidance = 'This historical approval lacks one matching credited ledger entry. Audit the wallet before changing its status.'
  else if (matched && credits > 0 && !legacy) guidance = 'A credit already exists. Review the ledger to prevent duplicate credit.'
  else if (canResolve) guidance = legacy
    ? 'One existing wallet credit matches this successful Paystack payment. Resolve to attach proof without adding a second credit.'
    : 'Paystack confirms payment and no prior credit/refund is recorded. Resolve to credit the wallet exactly once.'
  return { paymentStatus, mode, matched, canResolve, credits, creditedAmount, refunds, guidance }
}
