import { getPool } from '@/lib/db'

/**
 * File Folder owner operating ledger.
 *
 * Verified receipts are read ONLY from immutable Customer Door settlements.
 * Costs are append-only OWNER-REPORTED obligations, not wallet transfers.
 * Business income is never merged with company payroll or speculative trades.
 */
export const OWNER_COST_CATEGORIES = [
  'production','fulfilment','staff_compensation','marketing','equipment','operations','other',
] as const
export type OwnerCostCategory = typeof OWNER_COST_CATEGORIES[number]
export const OWNER_COST_CURRENCIES = ['FLAME COIN','NGN','USD','EUR','GBP','USDT'] as const

let ready:Promise<void>|null=null
export function ensureOwnerEarningsSchema(){
  if(!ready)ready=(async()=>{
    const pool=getPool()
    await pool.query(`
      CREATE TABLE IF NOT EXISTS client_file_folder_operating_costs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id uuid NOT NULL REFERENCES users(id),
        file_number varchar(120) NOT NULL,
        store_id uuid NOT NULL REFERENCES client_business_stores(id),
        category varchar(48) NOT NULL CHECK (category IN
          ('production','fulfilment','staff_compensation','marketing','equipment','operations','other')),
        amount numeric(30,8) NOT NULL CHECK (amount>0),
        currency varchar(20) NOT NULL CHECK (currency IN ('FLAME COIN','NGN','USD','EUR','GBP','USDT')),
        description varchar(300) NOT NULL,
        order_id uuid REFERENCES client_store_orders(id),
        system_id uuid REFERENCES client_built_systems(id),
        client_request_id varchar(80) NOT NULL,
        evidence_reference varchar(160),
        recorded_by uuid NOT NULL REFERENCES users(id),
        recorded_at timestamptz NOT NULL DEFAULT NOW(),
        UNIQUE (client_id,client_request_id)
      )
    `)
    await pool.query('CREATE INDEX IF NOT EXISTS idx_folder_costs_owner ON client_file_folder_operating_costs(client_id,file_number,recorded_at DESC)')
  })().catch(error=>{ready=null;throw error})
  return ready
}

export function validOwnerCost(input:{
  category:unknown;currency:unknown;amount:unknown;description:unknown;requestId:unknown
}){
  return typeof input.category==='string'
    &&OWNER_COST_CATEGORIES.includes(input.category as OwnerCostCategory)
    &&typeof input.currency==='string'
    &&OWNER_COST_CURRENCIES.includes(input.currency as typeof OWNER_COST_CURRENCIES[number])
    &&typeof input.amount==='number' &&Number.isFinite(input.amount)
    &&input.amount>0 &&input.amount<=1_000_000_000_000
    &&Math.round(input.amount*1e8)/1e8===input.amount
    &&typeof input.description==='string'
    &&input.description.trim().length>=4 &&input.description.trim().length<=300
    &&typeof input.requestId==='string'
    &&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.requestId)
}

export async function getOwnerEarnings(clientId:string,fileNumber:string,storeId:string){
  await ensureOwnerEarningsSchema()
  const pool=getPool()
  // Revenue derives exclusively from actual funded settlements, not order status,
  // submitted payment references, personal exchange journals or sales claims.
  const [revenue,costs,orders,summary]=await Promise.all([
    pool.query(`
      SELECT cs.id,cs.order_id,cs.credited_flame_coin,cs.payment_source,cs.receipt_number,
             cs.created_at, o.status AS fulfilment_status,o.currency AS offered_currency,
             o.amount AS offered_amount, i.name AS offer_name,i.offer_type,
             o.legion_sales_code, l.name AS legion_name
      FROM client_customer_door_settlements cs
      JOIN client_store_orders o ON o.id=cs.order_id AND o.store_id=cs.store_id
      LEFT JOIN client_store_items i ON i.id=o.item_id
      LEFT JOIN enterprise_legions l ON l.id=o.legion_id
      WHERE cs.client_id=$1::uuid AND cs.store_id=$2::uuid
      ORDER BY cs.created_at DESC LIMIT 80
    `,[clientId,storeId]),
    pool.query(`
      SELECT c.id,c.category,c.amount,c.currency,c.description,c.evidence_reference,
             c.recorded_at,c.order_id,c.system_id,s.title AS system_title
      FROM client_file_folder_operating_costs c
      LEFT JOIN client_built_systems s ON s.id=c.system_id
        AND s.client_id=c.client_id AND s.file_number=c.file_number
      WHERE c.client_id=$1::uuid AND c.file_number=$2 AND c.store_id=$3::uuid
      ORDER BY c.recorded_at DESC LIMIT 80
    `,[clientId,fileNumber,storeId]),
    pool.query(`
      SELECT COUNT(*)::int AS total_orders,
        COUNT(*) FILTER(WHERE payment_status<>'received' AND status<>'cancelled')::int AS awaiting_payment,
        COUNT(*) FILTER(WHERE status='fulfilled')::int AS fulfilled_orders
      FROM client_store_orders WHERE store_id=$1::uuid
    `,[storeId]),
    pool.query(`
      SELECT
        (SELECT COALESCE(SUM(credited_flame_coin),0)
           FROM client_customer_door_settlements WHERE client_id=$1::uuid AND store_id=$2::uuid) AS verified_receipts_flame_coin,
        (SELECT COUNT(*)::int FROM client_customer_door_settlements
           WHERE client_id=$1::uuid AND store_id=$2::uuid) AS verified_sales_count,
        (SELECT COALESCE(SUM(amount),0) FROM client_file_folder_operating_costs
           WHERE client_id=$1::uuid AND file_number=$3 AND store_id=$2::uuid AND currency='FLAME COIN') AS reported_cost_flame_coin
    `,[clientId,storeId,fileNumber]),
  ])
  const costTotals=await pool.query(`
    SELECT currency,COALESCE(SUM(amount),0) AS amount,COUNT(*)::int AS entries
    FROM client_file_folder_operating_costs
    WHERE client_id=$1::uuid AND file_number=$2 AND store_id=$3::uuid
    GROUP BY currency ORDER BY currency
  `,[clientId,fileNumber,storeId])
  const s=summary.rows[0]||{}
  const receipts=Number(s.verified_receipts_flame_coin||0)
  const reportedCosts=Number(s.reported_cost_flame_coin||0)
  return {
    fileNumber,
    storeId,
    summary:{
      verifiedReceiptsFlameCoin:receipts,
      verifiedSalesCount:Number(s.verified_sales_count||0),
      reportedCostFlameCoin:reportedCosts,
      provisionalRemainderFlameCoin:receipts-reportedCosts,
      totalOrders:Number(orders.rows[0]?.total_orders||0),
      awaitingPayment:Number(orders.rows[0]?.awaiting_payment||0),
      fulfilledOrders:Number(orders.rows[0]?.fulfilled_orders||0),
    },
    revenue:revenue.rows,
    costs:costs.rows,
    costTotals:costTotals.rows,
    accountingNote:'Verified receipts are funded Customer Door settlements, not gross order requests. Costs are owner-reported and do not debit any wallet. The provisional remainder subtracts only reported Flame Coin costs; other currencies have separate totals and are never silently converted. Refunds, taxes, provider fees, actual payroll and external trading require independent reconciliation. No profitability or withdrawal guarantee.',
  }
}

export async function recordOwnerCost(input:{
 clientId:string;fileNumber:string;storeId:string;category:OwnerCostCategory;
 amount:number;currency:string;description:string;requestId:string;
 evidenceReference?:string;orderId?:string;systemId?:string
}){
  await ensureOwnerEarningsSchema()
  const pool=getPool()
  const db=await pool.connect()
  let committed=false
  try{
    await db.query('BEGIN')
    const owner=await db.query(
      'SELECT id FROM client_business_stores WHERE id=$1::uuid AND client_id=$2::uuid AND file_number=$3 LIMIT 1',
      [input.storeId,input.clientId,input.fileNumber])
    if(!owner.rows[0]){await db.query('ROLLBACK');return {ok:false,error:'Not your File Folder'} as const}
    if(input.orderId){
      const order=await db.query('SELECT id FROM client_store_orders WHERE id=$1::uuid AND store_id=$2::uuid',[input.orderId,input.storeId])
      if(!order.rows[0]){await db.query('ROLLBACK');return {ok:false,error:'Order does not belong to this business'} as const}
    }
    if(input.systemId){
      const sys=await db.query('SELECT id FROM client_built_systems WHERE id=$1::uuid AND client_id=$2::uuid AND file_number=$3',[input.systemId,input.clientId,input.fileNumber])
      if(!sys.rows[0]){await db.query('ROLLBACK');return {ok:false,error:'System does not belong to this File Folder'} as const}
    }
    await db.query(`
      INSERT INTO client_file_folder_operating_costs
        (client_id,file_number,store_id,category,amount,currency,description,
         order_id,system_id,client_request_id,evidence_reference,recorded_by)
      VALUES ($1::uuid,$2,$3::uuid,$4,$5,$6,$7,$8::uuid,$9::uuid,$10,$11,$1::uuid)
      ON CONFLICT(client_id,client_request_id) DO NOTHING
    `,[input.clientId,input.fileNumber,input.storeId,input.category,input.amount,
      input.currency,input.description.trim(),input.orderId||null,input.systemId||null,
      input.requestId,input.evidenceReference?.trim()||null])
    const result=await db.query(`
      SELECT id,category,amount,currency,description,recorded_at,client_request_id
      FROM client_file_folder_operating_costs WHERE client_id=$1::uuid AND client_request_id=$2
    `,[input.clientId,input.requestId])
    await db.query('COMMIT');committed=true
    return {ok:true,cost:result.rows[0]} as const
  }catch(e){
    if(!committed)await db.query('ROLLBACK').catch(()=>{})
    throw e
  }finally{db.release()}
}
