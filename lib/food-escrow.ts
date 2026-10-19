import type { PoolClient } from 'pg'
import { getPool } from '@/lib/db'
import { WEAVE_OPAY_ACCOUNT_NUMBER } from '@/lib/opay-config'
import { ensureFoodBridgeSchema } from '@/lib/food-bridge'

export const WEAVE_FARM_COMMISSION_NGN = 1000 as const
export const FARM_ESCROW_ACCOUNT_NUMBER = WEAVE_OPAY_ACCOUNT_NUMBER
export const FARM_ESCROW_RULE =
  'WEAVE charges sellers a single flat ₦1,000 service fee per successfully completed Farm-to-Family order, regardless of order quantity or value. The buyer pays only the accepted food and delivery quote to WEAVE. Administration verifies actual funds before dispatch. After receipt, seller payout equals buyer total minus ₦1,000, with no additional per-unit charge. This requires authorized escrow/payment operations, banking controls, refunds and reconciliation before real-money production use.'

export function farmPaymentReference(orderId:string) { return 'FARM-'+orderId.toUpperCase() }
export type FarmEscrowState='awaiting_payment'|'proof_submitted'|'held'|'release_due'|'released'|'disputed'|'refund_due'|'refunded'

export async function initializeFarmEscrow(client:PoolClient,orderId:string) {
  const {rows:orders}=await client.query(`
    SELECT o.id,o.status,o.food_subtotal_ngn,o.delivery_quote_ngn
    FROM weave_food_direct_orders o WHERE o.id=$1::uuid FOR UPDATE
  `,[orderId])
  const order=orders[0]
  if(!order||!['quoted','accepted'].includes(String(order.status))||order.delivery_quote_ngn===null)
    throw new Error('A farmer-confirmed quotation is required before creating a payment instruction')
  const food=Number(order.food_subtotal_ngn)
  const delivery=Number(order.delivery_quote_ngn)
  const total=Number((food+delivery).toFixed(2))
  if(!(food>0)||!(delivery>=0)||!Number.isFinite(total)||total<=WEAVE_FARM_COMMISSION_NGN)
    throw new Error('Farm quoted total must exceed the fixed ₦1,000 seller fee so the farmer receives positive proceeds')
  const {rows}=await client.query(`
    INSERT INTO weave_food_escrow (
      order_id,reference,food_amount_ngn,delivery_amount_ngn,
      buyer_total_ngn,weave_commission_ngn,seller_payout_ngn
    ) VALUES($1::uuid,$2,$3,$4,$5,$6,$7)
    ON CONFLICT(order_id) DO NOTHING
    RETURNING order_id,status,reference,buyer_total_ngn
  `,[orderId,farmPaymentReference(orderId),food,delivery,total,WEAVE_FARM_COMMISSION_NGN,Number((total-WEAVE_FARM_COMMISSION_NGN).toFixed(2))])
  if(rows.length)return rows[0]
  const existing=await client.query(`SELECT order_id,status,reference,buyer_total_ngn
    FROM weave_food_escrow WHERE order_id=$1::uuid`,[orderId])
  if(!existing.rows.length)throw new Error('Farm payment instruction could not be reconciled')
  return existing.rows[0]
}

export async function submitFarmEscrowProof(client:PoolClient,orderId:string,reference:string) {
  const trimmed=reference.trim()
  if(trimmed.length<8||trimmed.length>255)throw new Error('Enter the actual bank or OPay transfer reference (8–255 characters)')
  const {rows}=await client.query(`
    UPDATE weave_food_escrow e SET proof_reference=$2,
      status='proof_submitted',proof_submitted_at=NOW(),updated_at=NOW()
    FROM weave_food_direct_orders o
    WHERE e.order_id=o.id AND o.id=$1::uuid AND o.status='accepted'
      AND e.status='awaiting_payment'
    RETURNING e.order_id,e.status,e.buyer_total_ngn,e.reference
  `,[orderId,trimmed])
  if(!rows.length)throw new Error('Quote must be accepted, with no payment proof previously submitted')
  const admins=await client.query(`
    INSERT INTO notifications(user_id,type,title,content,from_user_name,link)
    SELECT id,'farm_escrow_review','Farm food payment proof submitted',
      $1,'WEAVE Farm-to-Family','/admin/food-escrow'
    FROM users WHERE role='admin' AND is_active=true
  `,['Farm order '+orderId+' has a new buyer payment reference requiring actual bank reconciliation. Do not authorize shipment until funds are confirmed.'])
  return rows[0]
}

export function farmEscrowPublicFields(row:any) {
  return {
    status:row?.escrow_status||null,
    reference:row?.escrow_reference||null,
    buyerTotalNgn:row?.buyer_total_ngn===null||row?.buyer_total_ngn===undefined?null:Number(row.buyer_total_ngn),
    sellerPayoutNgn:row?.seller_payout_ngn===null||row?.seller_payout_ngn===undefined?null:Number(row.seller_payout_ngn),
    weaveCommissionNgn:row?.weave_commission_ngn===undefined||row?.weave_commission_ngn===null?WEAVE_FARM_COMMISSION_NGN:Number(row.weave_commission_ngn),
    receivingAccountNumber:row?.escrow_status==='awaiting_payment'?FARM_ESCROW_ACCOUNT_NUMBER:null,
    proofSubmittedAt:row?.proof_submitted_at||null,
    verifiedAt:row?.verified_at||null,
    payoutRecordedAt:row?.payout_recorded_at||null,
  }
}

export async function getFarmEscrowState(orderId:string){
  await ensureFoodBridgeSchema()
  const {rows}=await getPool().query(`
    SELECT status AS escrow_status,reference AS escrow_reference,buyer_total_ngn,
      seller_payout_ngn,weave_commission_ngn,proof_submitted_at,verified_at,payout_recorded_at
    FROM weave_food_escrow WHERE order_id=$1::uuid LIMIT 1
  `,[orderId])
  return farmEscrowPublicFields(rows[0])
}
