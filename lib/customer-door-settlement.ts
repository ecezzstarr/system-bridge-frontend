import { randomUUID } from 'node:crypto'
import { getPool } from '@/lib/db'
import { ensureWeaveReceiptSchema } from '@/lib/weave-receipts'

export type DoorPaymentSource = 'weave_wallet' | 'admin_verified_external'
export type DoorPaymentResult = {
  success:boolean; alreadyPaid?:boolean; orderId?:string; settlementId?:string;
  clientId?:string; amountFlameCoin?:number; clientBalanceAfter?:number;
  receiptNumber?:string; error?:string; status?:number;
}

let schemaReady:Promise<void>|null=null

/** Every settlement is a transfer of already funded Flame Coin, never a mint.
 * Legacy 'received' order status is not proof: only a settlement row proves
 * the money moved to the Client's Main Wallet.
 */
export function ensureCustomerDoorSettlementSchema(){
  if(!schemaReady)schemaReady=(async()=>{
    await ensureWeaveReceiptSchema()
    const db=getPool()
    await db.query(`
      CREATE TABLE IF NOT EXISTS client_customer_door_settlements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id uuid NOT NULL UNIQUE REFERENCES client_store_orders(id),
        store_id uuid NOT NULL,
        client_id uuid NOT NULL REFERENCES users(id),
        funding_user_id uuid NOT NULL REFERENCES users(id),
        payment_source varchar(40) NOT NULL CHECK (payment_source IN ('weave_wallet','admin_verified_external')),
        original_amount numeric(30,8) NOT NULL CHECK (original_amount>0),
        original_currency varchar(20) NOT NULL,
        credited_flame_coin numeric(30,8) NOT NULL CHECK (credited_flame_coin>0),
        payment_reference varchar(255) NOT NULL UNIQUE,
        verified_by uuid REFERENCES users(id),
        verification_note text,
        client_balance_after numeric(30,8) NOT NULL,
        receipt_number varchar(80) NOT NULL UNIQUE,
        created_at timestamptz NOT NULL DEFAULT NOW()
      )
    `)
    await db.query('CREATE INDEX IF NOT EXISTS idx_door_settlements_client ON client_customer_door_settlements(client_id,created_at DESC)')
    await db.query("CREATE UNIQUE INDEX IF NOT EXISTS idx_door_receipts_source ON weave_receipts(source,source_id) WHERE source='customer_door_settlement'")
  })().catch(e=>{schemaReady=null;throw e})
  return schemaReady
}

export const validDoorUuid=(value:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
export function validFlameAmount(value:unknown):value is number{
  if(typeof value!=='number')return false
  return Number.isFinite(value)&&value>0&&value<=1_000_000_000_000&&Math.round(value*1e8)/1e8===value
}

export async function settleCustomerDoorPayment(input:{
  orderId:string,
  fundingUserId:string,
  source:DoorPaymentSource,
  adminId?:string,
  verifiedReference?:string,
  creditedFlameCoin?:number,
  confirmation?:string,
}):Promise<DoorPaymentResult>{
  if(!validDoorUuid(input.orderId)||!validDoorUuid(input.fundingUserId)){
    return {success:false,error:'Valid order and funding account required',status:400}
  }
  if(input.source==='admin_verified_external'){
    if(!input.adminId || input.adminId!==input.fundingUserId
      ||!input.verifiedReference ||input.verifiedReference.trim().length<8
      || !validFlameAmount(input.creditedFlameCoin)){
      return {success:false,error:'Verified WEAVE funds, valid external reference and credited Flame Coin amount are required',status:400}
    }
  }
  await ensureCustomerDoorSettlementSchema()
  const conn=await getPool().connect()
  let committed=false
  try{
    await conn.query('BEGIN')
    const found=await conn.query(`
      SELECT o.id,o.store_id,o.amount,o.currency,o.payment_status,o.status,
             o.customer_name,s.client_id,s.name AS store_name
      FROM client_store_orders o
      JOIN client_business_stores s ON s.id=o.store_id
      WHERE o.id=$1::uuid FOR UPDATE OF o
    `,[input.orderId])
    const order=found.rows[0]
    if(!order){
      await conn.query('ROLLBACK')
      return {success:false,error:'Customer Door order not found',status:404}
    }
    const past=await conn.query(
      'SELECT id,credited_flame_coin,client_balance_after,receipt_number FROM client_customer_door_settlements WHERE order_id=$1::uuid',
      [order.id]
    )
    if(past.rows[0]){
      await conn.query('COMMIT');committed=true
      return {success:true,alreadyPaid:true,orderId:order.id,clientId:order.client_id,
        settlementId:past.rows[0].id,amountFlameCoin:Number(past.rows[0].credited_flame_coin),
        clientBalanceAfter:Number(past.rows[0].client_balance_after),receiptNumber:past.rows[0].receipt_number}
    }
    if(['cancelled','refunded'].includes(String(order.status))||['refunded','rejected'].includes(String(order.payment_status))){
      await conn.query('ROLLBACK')
      return {success:false,error:'Cancelled or refunded orders cannot be settled',status:409}
    }
    const currency=String(order.currency||'').toUpperCase()
    const amount=Number(order.amount)
    if(!validFlameAmount(amount)){
      await conn.query('ROLLBACK')
      return {success:false,error:'The Client offer needs a valid positive price',status:409}
    }
    const internal=input.source==='weave_wallet'
    if(internal && !['FLAME COIN','FLAME_COIN','FC'].includes(currency)){
      await conn.query('ROLLBACK')
      return {success:false,error:'This offer is not priced in Flame Coin; select verified external payment instead',status:409}
    }
    if(order.client_id===input.fundingUserId){
      await conn.query('ROLLBACK')
      return {success:false,error:'Clients cannot purchase from their own Customer Door to create wallet earnings',status:403}
    }
    if(!internal){
      const approver=await conn.query("SELECT id FROM users WHERE id=$1::uuid AND role='admin' AND is_active=true LIMIT 1",[input.adminId])
      if(!approver.rows[0]||input.confirmation!=='funds_received_by_weave'){
        await conn.query('ROLLBACK')
        return {success:false,error:'Administration must verify funds received by WEAVE before settlement',status:403}
      }
      const dup=await conn.query('SELECT id FROM client_customer_door_settlements WHERE payment_reference=$1 LIMIT 1',[input.verifiedReference!.trim()])
      if(dup.rows.length){
        await conn.query('ROLLBACK')
        return {success:false,error:'This external payment reference has already settled an order',status:409}
      }
    }
    const flame=internal?amount:input.creditedFlameCoin!
    // Lock accounts in deterministic order to prevent opposite-direction
    // concurrent settlements from deadlocking or spending the same balance.
    const lock=await conn.query(`
      SELECT w.id,w.user_id,w.balance_trx FROM wallets w
      JOIN users u ON u.id=w.user_id
      WHERE w.user_id=ANY($1::uuid[]) AND w.is_primary=true
        AND u.is_active=true
      ORDER BY w.user_id,w.id
      FOR UPDATE OF w
    `,[[input.fundingUserId,order.client_id]])
    const payer=lock.rows.find(w=>w.user_id===input.fundingUserId)
    const client=lock.rows.find(w=>w.user_id===order.client_id)
    if(!payer||!client){
      await conn.query('ROLLBACK')
      return {success:false,error:'Both funding and Client Main Wallets must be active',status:409}
    }
    if(Number(payer.balance_trx)<flame){
      await conn.query('ROLLBACK')
      return {success:false,error:'Insufficient confirmed Flame Coin in the funding wallet',status:409}
    }
    const debit=await conn.query('UPDATE wallets SET balance_trx=balance_trx-$1,updated_at=NOW() WHERE id=$2::uuid AND balance_trx>=$1 RETURNING balance_trx',[flame,payer.id])
    if(!debit.rows.length)throw Error('Concurrent buyer wallet debit failed')
    const credit=await conn.query('UPDATE wallets SET balance_trx=balance_trx+$1,updated_at=NOW() WHERE id=$2::uuid RETURNING balance_trx',[flame,client.id])
    if(!credit.rows.length)throw Error('Client wallet credit failed')
    const balanceAfter=Number(credit.rows[0].balance_trx)
    const reference=internal?'WEAVE-DOOR-'+order.id:input.verifiedReference!.trim()
    const receiptNumber='WEAVE-PAY-'+randomUUID().toUpperCase()
    const result=await conn.query(`
      INSERT INTO client_customer_door_settlements
      (order_id,store_id,client_id,funding_user_id,payment_source,
       original_amount,original_currency,credited_flame_coin,payment_reference,
       verified_by,verification_note,client_balance_after,receipt_number)
      VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7,$8,$9,$10::uuid,$11,$12,$13)
      RETURNING id
    `,[order.id,order.store_id,order.client_id,input.fundingUserId,input.source,
       amount,currency,flame,reference,input.adminId||null,
       internal?'Atomic WEAVE wallet transfer':String(input.confirmation||'').slice(0,250),balanceAfter,receiptNumber])
    const settlementId=String(result.rows[0].id)
    const metadata=JSON.stringify({orderId:order.id,storeId:order.store_id,settlementId,source:input.source,
      originalCurrency:currency,originalAmount:amount,verifiedBy:input.adminId||null})
    await conn.query(`
      INSERT INTO ledger_entries
      (id,user_id,entry_type,amount,currency,description,balance_before,balance_after,metadata,created_at)
      VALUES (gen_random_uuid(),$1::uuid,'transfer',$2,'Flame Coin',$3,$4,$5,$6::jsonb,NOW()),
             (gen_random_uuid(),$7::uuid,'earning',$2,'Flame Coin',$8,$9,$10,$6::jsonb,NOW())
    `,[input.fundingUserId,flame,internal?'Customer Door purchase':'Verified external Customer Door settlement',
       Number(payer.balance_trx),Number(debit.rows[0].balance_trx),metadata,
       order.client_id,'Customer Door earnings · '+String(order.store_name).slice(0,160),Number(client.balance_trx),balanceAfter])
    await conn.query(`
      INSERT INTO weave_receipts
      (receipt_number,user_id,kind,source,source_id,amount,currency,status,description,metadata)
      VALUES ($1,$2::uuid,'payment','customer_door_settlement',$3,$4,'Flame Coin','paid',$5,$6::jsonb)
    `,[receiptNumber,order.client_id,order.id,flame,'Customer Door settlement · '+String(order.store_name).slice(0,150),metadata])
    await conn.query(`
      UPDATE client_store_orders
      SET payment_status='received',status='payment_received',payment_reference=$2,updated_at=NOW()
      WHERE id=$1::uuid
    `,[order.id,reference])
    await conn.query(`
      INSERT INTO notifications(user_id,type,title,content,from_user_name,link)
      VALUES ($1::uuid,'customer_door_payment','Customer Door sale credited',
       $2,'WEAVE Customer Door','/client/system-switch#business')
    `,[order.client_id,'Order '+order.id+' paid. '+flame+' Flame Coin credited to your Main Client Wallet. Receipt '+receiptNumber])
    await conn.query('COMMIT');committed=true
    return {success:true,orderId:order.id,clientId:order.client_id,settlementId,
      amountFlameCoin:flame,clientBalanceAfter:balanceAfter,receiptNumber}
  }catch(error){
    if(!committed)await conn.query('ROLLBACK').catch(()=>{})
    console.error('[Customer Door settlement]',error)
    return {success:false,error:'Customer Door settlement failed; no payment was confirmed',status:500}
  }finally{conn.release()}
}
