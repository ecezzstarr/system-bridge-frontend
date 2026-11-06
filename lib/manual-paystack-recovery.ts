import { getPool } from '@/lib/db'
import { notifyUser, notifyAdministrators } from '@/lib/deposit-notifications'

type ManualPaystackInput = {
  depositId: string
  adminId: string
  paystackTransactionId: string
  observedReference: string
  observedAmountNgn: number
  evidenceNote: string
  confirmation: string
}

let schemaReady: Promise<void> | null = null
/** One manual credit per deposit AND per Paystack transaction ID. */
export function ensureManualPaystackSchema() {
  if (!schemaReady) {
    schemaReady = getPool().query(`CREATE TABLE IF NOT EXISTS weave_manual_paystack_credits (
      deposit_id uuid PRIMARY KEY REFERENCES deposits(id),
      paystack_transaction_id varchar(40) NOT NULL UNIQUE,
      paystack_reference varchar(100) NOT NULL UNIQUE,
      amount_ngn numeric(20,2) NOT NULL,
      credited_flame_coin numeric(30,8) NOT NULL,
      confirmed_by uuid NOT NULL REFERENCES users(id),
      evidence_note varchar(800) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT NOW()
    )`).then(() => {}).catch(error => { schemaReady = null; throw error })
  }
  return schemaReady
}

/**
 * Emergency Administration credit after a human independently reviews the
 * original successful charge inside the Paystack merchant dashboard.
 *
 * NOT proof from Paystack's API. Never used by webhooks, callbacks, ordinary
 * users, batch reconciliation or client-supplied receipts.
 */
export async function manualCreditStuckPaystack(input: ManualPaystackInput) {
  if (!/^[0-9a-f-]{36}$/i.test(input.depositId) || !/^[0-9a-f-]{36}$/i.test(input.adminId)) {
    throw new Error('Invalid deposit or Administration identity.')
  }
  const transactionId = input.paystackTransactionId.trim()
  const reference = input.observedReference.trim()
  const note = input.evidenceNote.trim()
  if (!/^\d{5,40}$/.test(transactionId)) {
    throw new Error('Enter the numeric Paystack transaction ID displayed in the Paystack Dashboard.')
  }
  if (!/^[A-Za-z0-9.=-]{1,100}$/.test(reference)) throw new Error('Enter the full original Paystack reference.')
  if (!Number.isFinite(input.observedAmountNgn) || input.observedAmountNgn <= 0) {
    throw new Error('Enter the exact NGN amount confirmed in the Paystack Dashboard.')
  }
  if (note.length < 20 || note.length > 800) {
    throw new Error('Record how you confirmed the successful Paystack charge (20–800 characters).')
  }
  if (input.confirmation !== 'CREDIT ' + reference) {
    throw new Error('Type CREDIT followed by the exact Paystack reference to authorize this manual credit.')
  }
  await ensureManualPaystackSchema()

  const client = await getPool().connect()
  let notice: {userId:string;role:string;name:string;reference:string;ngn:number;flameCoin:number;depositId:string}|null = null
  try {
    await client.query('BEGIN')
    const result = await client.query(
      `SELECT d.*,u.name AS owner_name,u.email AS owner_email,u.role AS owner_role
       FROM deposits d JOIN users u ON u.id=d.user_id
       WHERE d.id=$1::uuid AND d.method='paystack' FOR UPDATE OF d`,
      [input.depositId],
    )
    const deposit = result.rows[0]
    if (!deposit) throw new Error('Paystack deposit does not exist.')
    if (!['pending','rejected'].includes(deposit.status)) {
      throw new Error('Deposit is already approved or otherwise ineligible for manual credit.')
    }
    if (!['agent','bridger','admin','client'].includes(deposit.owner_role)) {
      throw new Error('This deposit does not belong to an eligible wallet account.')
    }
    if (String(deposit.receipt_data) !== reference) {
      throw new Error('The dashboard reference must exactly match the saved Weave checkout.')
    }
    const amount = Number(deposit.amount_usd)
    const flameCoin = Number(deposit.amount_trx)
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) {
      throw new Error('Manual recovery is restricted to stuck deposits of ₦10,000 or less. Escalate larger payments for independent Paystack verification.')
    }
    if (Math.round(input.observedAmountNgn * 100) !== Math.round(amount * 100)) {
      throw new Error('The confirmed Paystack amount does not match this deposit.')
    }
    if (!Number.isFinite(flameCoin) || flameCoin <= 0) {
      throw new Error('Stored Flame Coin amount is invalid.')
    }
    // Lock serializes against the signed webhook and Paystack API settlement.
    // Check all positive credits (regardless of their description), refunds and
    // prior manual claims before altering a wallet.
    const previous = await client.query(
      `SELECT COUNT(*) FILTER (WHERE entry_type='deposit' AND amount > 0) AS credits,
              COUNT(*) FILTER (WHERE metadata->>'event_type'='refund.processed') AS refunds
       FROM ledger_entries WHERE user_id=$1::uuid AND metadata->>'deposit_id'=$2`,
      [deposit.user_id, String(deposit.id)],
    )
    if (Number(previous.rows[0]?.credits || 0) > 0 || Number(previous.rows[0]?.refunds || 0) > 0) {
      throw new Error('Existing credit or Paystack refund evidence found. No second wallet credit is allowed.')
    }
    const existing = await client.query(
      `SELECT deposit_id FROM weave_manual_paystack_credits
       WHERE paystack_transaction_id=$1 OR paystack_reference=$2 OR deposit_id=$3::uuid LIMIT 1`,
      [transactionId, reference, deposit.id],
    )
    if (existing.rowCount) throw new Error('This Paystack transaction or checkout was already manually credited.')

    await client.query(
      `INSERT INTO weave_manual_paystack_credits (
        deposit_id,paystack_transaction_id,paystack_reference,amount_ngn,
        credited_flame_coin,confirmed_by,evidence_note
       ) VALUES($1::uuid,$2,$3,$4,$5,$6::uuid,$7)`,
      [deposit.id, transactionId, reference, amount, flameCoin, input.adminId, note],
    )
    const wallet = await client.query(
      `UPDATE wallets SET balance_trx=balance_trx+$2,updated_at=NOW()
       WHERE user_id=$1::uuid AND is_primary=true RETURNING balance_trx`,
      [deposit.user_id, flameCoin],
    )
    if (wallet.rowCount !== 1) throw new Error('Expected exactly one primary wallet; no money was credited.')
    await client.query(
      `INSERT INTO ledger_entries(user_id,entry_type,amount,currency,description,metadata)
       VALUES($1::uuid,'deposit',$2,'Flame Coin','Administration manually confirmed Paystack credit',$3::jsonb)`,
      [deposit.user_id, flameCoin, JSON.stringify({
        deposit_id:deposit.id, reference, paystack_transaction_id:transactionId,
        payment_method:'Paystack', event_type:'paystack.manual_admin_credit',
        approved_by:input.adminId, approval_basis:'human_verified_in_paystack_dashboard',
        ngn_amount:amount, flame_coin_amount:flameCoin, evidence_note:note,
      })],
    )
    // Intentionally preserve verified_at=NULL. A human-reviewed merchant
    // dashboard entry is not an independently authenticated API verification.
    const approved = await client.query(
      `UPDATE deposits SET status='approved',updated_at=NOW()
       WHERE id=$1::uuid AND status IN ('pending','rejected') RETURNING id`,
      [deposit.id],
    )
    if (approved.rowCount !== 1) throw new Error('Deposit changed while Administration was crediting it.')
    await client.query('COMMIT')
    notice = {userId:String(deposit.user_id),name:String(deposit.owner_name || deposit.owner_email || 'Weave user'),
      role:String(deposit.owner_role),reference,ngn:amount,flameCoin,depositId:String(deposit.id)}
    return {credited:true, depositId:String(deposit.id), flameCoin, amountNgn:amount}
  } catch (error:any) {
    await client.query('ROLLBACK').catch(() => {})
    if (error?.code === '23505') throw new Error('This Paystack transaction has already been manually credited.')
    throw error
  } finally {
    client.release()
    // Notification delivery is not a prerequisite for the committed wallet
    // update. Never retry monetary settlement because a notification fails.
    if (notice) await Promise.allSettled([
      notifyUser(notice.userId, {
        type:'deposit_approved',
        title:'Paystack payment manually confirmed · Flame Coin credited',
        content:'Weave Administration confirmed your ₦'+notice.ngn.toLocaleString()
          +' Paystack payment and credited '+notice.flameCoin.toLocaleString()+' Flame Coin to your wallet.',
        link:'/wallet/deposit-withdraw',fromUserName:'WEAVE Administration',
      }),
      notifyAdministrators({
        type:'paystack_manual_credit_audit',
        title:'Manual Paystack wallet credit · '+notice.role,
        content:notice.name+' received '+notice.flameCoin.toLocaleString()+' Flame Coin for ₦'
          +notice.ngn.toLocaleString()+' after Administration confirmed Paystack transaction '
          +transactionId+' (reference '+notice.reference+', deposit '+notice.depositId+').',
        link:'/admin/control-center#deposits',fromUserName:'WEAVE Finance',
      }),
    ])
  }
}
