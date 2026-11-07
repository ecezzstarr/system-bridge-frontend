import { getPool } from '@/lib/db'
import { notifyAdministrators, notifyUser } from '@/lib/deposit-notifications'

export class ManualPaystackCreditError extends Error {
  constructor(message: string, readonly httpStatus: 400 | 409 = 409) {
    super(message)
    this.name = 'ManualPaystackCreditError'
  }
}

type ManualPaystackInput = {
  depositId: string
  adminId: string
  confirmedInPaystackDashboard: boolean
  evidenceNote: string
  paystackTransactionId?: string
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const refuse = (message: string, httpStatus: 400 | 409 = 409): never => {
  throw new ManualPaystackCreditError(message, httpStatus)
}

/**
 * Administrations-only emergency recovery, not an assertion that Paystack's
 * API verified this transaction. The caller must authenticate role=admin.
 * Uses ONLY existing deposits, wallets and ledger_entries tables: no
 * database CREATE/ALTER privilege or runtime schema migration is required.
 */
export async function manualCreditStuckPaystack(input: ManualPaystackInput) {
  if (!uuid.test(input.depositId) || !uuid.test(input.adminId)) {
    refuse('Invalid Administrations or deposit identity.', 400)
  }
  if (input.confirmedInPaystackDashboard !== true) {
    refuse('Confirm that you personally checked the successful payment in the original Paystack merchant dashboard.', 400)
  }
  const evidenceNote = (input.evidenceNote || '').trim()
  if (evidenceNote.length < 12 || evidenceNote.length > 800) {
    refuse('Provide a short verification note (12 to 800 characters).', 400)
  }
  const transactionId = (input.paystackTransactionId || '').trim()
  if (transactionId && !/^[0-9]{1,40}$/.test(transactionId)) {
    refuse('Paystack transaction ID must contain digits only, or leave it blank.', 400)
  }

  const client = await getPool().connect()
  let successNotice: {
    userId: string
    ownerName: string
    role: string
    amountNgn: number
    flameCoin: number
    reference: string
    depositId: string
  } | null = null
  try {
    await client.query('BEGIN')
    const result = await client.query(
      `SELECT d.id,d.user_id,d.status,d.amount_usd,d.amount_trx,d.receipt_data,
              d.verified_at,u.name AS owner_name,u.email AS owner_email,u.role AS owner_role
       FROM deposits d JOIN users u ON u.id=d.user_id
       WHERE d.id=$1::uuid AND d.method='paystack' FOR UPDATE OF d`,
      [input.depositId],
    )
    const deposit = result.rows[0]
    if (!deposit) refuse('The Paystack deposit is no longer in Weave.')
    if (deposit.status !== 'pending' && deposit.status !== 'rejected') {
      refuse('This deposit is already processed. Refresh the page; no second credit is permitted.')
    }
    if (!['admin','agent','bridger','client'].includes(String(deposit.owner_role))) {
      refuse('This account is not eligible for a Flame Coin wallet deposit.')
    }
    const amountNgn = Number(deposit.amount_usd)
    const flameCoin = Number(deposit.amount_trx)
    const reference = String(deposit.receipt_data || '')
    if (!/^[A-Za-z0-9.=-]{1,100}$/.test(reference) || !Number.isFinite(amountNgn) ||
        amountNgn <= 0 || !Number.isFinite(flameCoin) || flameCoin <= 0) {
      refuse('Saved deposit information is incomplete or invalid; do not credit.')
    }
    if (amountNgn > 10000) {
      refuse('Emergency manual credit is limited to ₦10,000. Escalate larger deposits for independent review.')
    }

    // The deposit row lock serializes the human decision with the signed
    // Paystack webhook and any concurrent Administrations request.
    const prior = await client.query(
      `SELECT COUNT(*) FILTER (WHERE entry_type='deposit' AND amount > 0) AS credits,
              COUNT(*) FILTER (WHERE metadata->>'event_type'='refund.processed') AS refunds
       FROM ledger_entries
       WHERE user_id=$1::uuid AND metadata->>'deposit_id'=$2`,
      [deposit.user_id, String(deposit.id)],
    )
    if (Number(prior.rows[0]?.credits || 0) !== 0 || Number(prior.rows[0]?.refunds || 0) !== 0) {
      refuse('A wallet credit or refund already exists for this deposit. No additional credit was made.')
    }

    // A Paystack numeric transaction ID is useful but may not be displayed
    // to the operator. When supplied, serialize and reject its reuse globally.
    if (transactionId) {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1::text,0))', [
        'weave-paystack-manual:' + transactionId,
      ])
      const claimed = await client.query(
        `SELECT 1 FROM ledger_entries
         WHERE entry_type='deposit' AND amount>0
           AND metadata->>'payment_method'='Paystack'
           AND metadata->>'paystack_transaction_id'=$1 LIMIT 1`,
        [transactionId],
      )
      if (claimed.rowCount) {
        refuse('This Paystack transaction ID was already used for a credited deposit.')
      }
    }

    // Do not create a separate table during a live payment action.
    // Existing deposit + ledger metadata are the durable audit record.
    const wallet = await client.query(
      `UPDATE wallets SET balance_trx=balance_trx+$2,updated_at=NOW()
       WHERE user_id=$1::uuid AND is_primary=true RETURNING balance_trx`,
      [deposit.user_id, flameCoin],
    )
    if (wallet.rowCount !== 1) {
      refuse('The recipient has no unique primary wallet. Fix the wallet record before approving; nothing was credited.')
    }
    await client.query(
      `INSERT INTO ledger_entries(user_id,entry_type,amount,currency,description,metadata)
       VALUES($1::uuid,'deposit',$2,'Flame Coin','Administrations-confirmed Paystack deposit credit',$3::jsonb)`,
      [deposit.user_id, flameCoin, JSON.stringify({
        deposit_id:String(deposit.id), reference, payment_method:'Paystack',
        event_type:'paystack.manual_admin_credit',
        paystack_transaction_id:transactionId || null,
        ngn_amount:amountNgn, credited_flame_coin:flameCoin,
        approved_by:input.adminId,
        approval_basis:'human_confirmed_in_paystack_dashboard',
        evidence_note:evidenceNote,
      })],
    )
    // Never mark provider verified_at as true for a human-confirmed payment.
    const updated = await client.query(
      `UPDATE deposits SET status='approved',updated_at=NOW()
       WHERE id=$1::uuid AND status IN ('pending','rejected') RETURNING id`,
      [deposit.id],
    )
    if (updated.rowCount !== 1) refuse('Deposit state changed during approval; no funds were credited.')
    await client.query('COMMIT')
    successNotice = {
      userId:String(deposit.user_id),
      ownerName:String(deposit.owner_name || deposit.owner_email || 'Weave user'),
      role:String(deposit.owner_role),
      amountNgn, flameCoin, reference, depositId:String(deposit.id),
    }
    return { credited:true, depositId:String(deposit.id), amountNgn, flameCoin }
  } catch(error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
    if (successNotice) {
      const n = successNotice
      await Promise.allSettled([
        notifyUser(n.userId,{
          type:'deposit_approved',
          title:'Administrations confirmed your Paystack payment',
          content:'Your ₦'+n.amountNgn.toLocaleString()+' payment was manually confirmed and '
            +n.flameCoin.toLocaleString()+' Flame Coin credited to your Weave wallet.',
          link:'/wallet/deposit-withdraw',fromUserName:'WEAVE Administrations',
        }),
        notifyAdministrators({
          type:'paystack_manual_credit_audit',
          title:'Paystack manual approval credited · '+n.role,
          content:n.ownerName+' · ₦'+n.amountNgn.toLocaleString()
            +' · '+n.flameCoin.toLocaleString()+' Flame Coin. '
            +'Reference '+n.reference+'. Deposit '+n.depositId
            +'. Approved by Administrations '+input.adminId+'.',
          link:'/admin/control-center#deposits',fromUserName:'WEAVE Finance',
        }),
      ])
    }
  }
}
