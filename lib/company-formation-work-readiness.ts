import {getPool} from '@/lib/db'

type Case={
  client_id:string|null;file_number:string|null;verified_at:string|null;
  activated_at:string|null;business_brief:string|null
}
/** Operational hints come only from recorded business data; they are not sales forecasts. */
export async function formationNextWork(c:Case){
  const base={available:false,offerCount:null as number|null,orderCount:null as number|null,
    paidSettlements:null as number|null,pendingOrders:null as number|null,
    nextAction:'Await Client File Folder activation and an approved business formation.',
    actor:'Administrations',href:'/company/formation'}
  if(!c.verified_at)return {...base,nextAction:'Forensics must independently verify the purchase before activation or revenue claims.'}
  if(!c.client_id||!c.activated_at)return {...base,
    nextAction:'Administrations should help the rightful Client complete File Number registration and enter their File Folder.'}
  if(!c.business_brief)return {...base,available:true,actor:'Client · Mandate',
    nextAction:'Client: identify the first real customer group and a product or service you can deliver. Mandate: make the first operating plan.'}
  const pool=getPool()
  const {rows:tables}=await pool.query(`SELECT
    to_regclass('public.client_business_stores') IS NOT NULL AS stores,
    to_regclass('public.client_store_items') IS NOT NULL AS items,
    to_regclass('public.client_store_orders') IS NOT NULL AS orders,
    to_regclass('public.client_customer_door_settlements') IS NOT NULL AS receipts`)
  const table=tables[0]
  if(!table?.stores||!table?.items||!table?.orders||!table?.receipts)return {...base,
    nextAction:'Administrations must restore available Customer Door and verified settlement records before planning from business figures.'}
  const {rows}=await pool.query(`SELECT id,enabled,formation_status FROM client_business_stores
    WHERE client_id=$1::uuid AND file_number=$2 LIMIT 1`,[c.client_id,c.file_number])
  const store=rows[0]
  if(!store)return {...base,available:true,actor:'Client · Administrations',
    nextAction:'Enter the purchased File Folder to form the Customer Door business store and confirm the available systems.',
    href:'/client/system-switch'}
  const [offer,orders,receipts]=await Promise.all([
    pool.query('SELECT COUNT(*)::int AS n FROM client_store_items WHERE store_id=$1::uuid AND enabled=true',[store.id]),
    pool.query(`SELECT COUNT(*)::int AS n,
      COUNT(*) FILTER(WHERE payment_status<>'received' AND status<>'cancelled')::int AS pending
      FROM client_store_orders WHERE store_id=$1::uuid`,[store.id]),
    pool.query('SELECT COUNT(*)::int AS n FROM client_customer_door_settlements WHERE store_id=$1::uuid AND client_id=$2::uuid',[store.id,c.client_id])
  ])
  const offerCount=Number(offer.rows[0]?.n||0),orderCount=Number(orders.rows[0]?.n||0)
  const paidSettlements=Number(receipts.rows[0]?.n||0),pendingOrders=Number(orders.rows[0]?.pending||0)
  const result={...base,available:true,offerCount,orderCount,paidSettlements,pendingOrders,href:'/client/system-switch#business'}
  if(store.enabled!==true)return {...result,actor:'Client · Mandate',
    nextAction:'The Customer Door business store is not publicly enabled. Review the offer, then enable authorized customer access.'}
  if(!offerCount)return {...result,actor:'Client · Mandate',
    nextAction:'Create and publish the first real product or service with accurate pricing, availability and fulfilment conditions.'}
  if(!orderCount)return {...result,actor:'Client · Mandate',
    nextAction:'Your published offer has no recorded customer orders. Develop consented customer outreach and practical sales activity using approved Weave tools and workers.'}
  if(pendingOrders>0)return {...result,actor:'Client · Mandate · Forensics',
    nextAction:'Customer orders await verified payment or resolution. Contact the customer appropriately and complete authorized fulfilment without inventing receipts.'}
  if(!paidSettlements)return {...result,actor:'Client · Forensics',
    nextAction:'There are orders but no funded Customer Door settlement records. Check verified payment evidence and do not count unpaid orders as income.'}
  return {...result,actor:'Client · Mandate · Administrations',
    nextAction:'Continue delivering products and services, improve customer acquisition, record actual operating costs, and monitor verified net income toward the four-month objective.'}
}
