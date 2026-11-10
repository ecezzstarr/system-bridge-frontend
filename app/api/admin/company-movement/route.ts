import {NextRequest, NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getPool} from '@/lib/db'

export const dynamic = 'force-dynamic'
const headers = {'Cache-Control':'private, no-store', 'Vary':'Authorization'}
const since = "NOW() - ($1::int * INTERVAL '1 day')"

type Section = {available:boolean; rows:Record<string,unknown>[]; note?:string}
type Sources = Record<string,boolean>

/**
 * Read-only Administrations report. Each metric comes from its owning operational
 * record. Missing tables / failed queries are unavailable, NEVER counted as zero.
 * Pending payment, paid inventory, agent-reported sales and fulfilled orders are
 * intentionally distinct. This endpoint does not move money or approve work.
 */
export async function GET(request:NextRequest) {
  const user=await getAuthUser(request)
  if (!user || user.role!=='admin') return NextResponse.json({error:'Administrations access required'},{status:403,headers})
  const value=Number(new URL(request.url).searchParams.get('days')||7)
  const days=[1,7,30,90].includes(value)?value:7
  try {
    const pool=getPool()
    const names=['market_prospect_packages','market_prospect_contacts','market_prospect_outreach',
      'agility_agent_sales','agility_stock_orders','carrier_food_orders','carrier_cake_orders',
      'file_folder_purchases','bridge_deposits','deposits','ledger_entries']
    const available=await pool.query(
      "SELECT "+names.map((_,i)=>"to_regclass('public."+names[i]+"') IS NOT NULL AS t"+i).join(", ")
    )
    const sources:Sources=Object.fromEntries(names.map((n,i)=>[n,available.rows[0]?.['t'+i]===true]))
    const missing:string[]=[]
    async function read(name:string, required:string[], query:string, args:unknown[]=[days]):Promise<Section>{
      if(required.some(n=>!sources[n])){
        const absent=required.filter(n=>!sources[n]).join(', ')
        missing.push(name+': '+absent+' not installed')
        return {available:false,rows:[],note:'Source unavailable: '+absent}
      }
      try {return {available:true,rows:(await pool.query(query,args)).rows}}
      catch(error){
        console.error('[Administrations movement report: '+name+']',error)
        missing.push(name+': query failed')
        return {available:false,rows:[],note:'Report query unavailable; inspect server logs'}
      }
    }

    // A sold package represents one charged purchase; contacts inside it are
    // candidate records, never promises of reachable or interested prospects.
    const prospects=await read('prospects',['market_prospect_packages'],
      "SELECT COUNT(*)::int AS packages, COUNT(DISTINCT purchased_by)::int AS purchasing_bridgers, "+
      "COALESCE(SUM(price_trx),0)::numeric AS spent_flame_coin "+
      "FROM market_prospect_packages WHERE status='sold' AND purchased_at >= "+since)
    const bridgerLeaders=await read('bridgerLeaders',['market_prospect_packages'],
      "SELECT p.purchased_by AS user_id, COALESCE(u.name,'Bridger') AS name, "+
      "COUNT(*)::int AS packages, COALESCE(SUM(p.price_trx),0)::numeric AS spent_flame_coin "+
      "FROM market_prospect_packages p JOIN users u ON u.id=p.purchased_by "+
      "WHERE p.status='sold' AND p.purchased_at >= "+since+
      " GROUP BY p.purchased_by,u.name ORDER BY packages DESC,spent_flame_coin DESC LIMIT 20")
    const prospectContacts=await read('prospectContacts',['market_prospect_packages','market_prospect_contacts'],
      "SELECT COUNT(c.id)::int AS candidates_in_sold_packages "+
      "FROM market_prospect_contacts c JOIN market_prospect_packages p ON p.id=c.package_id "+
      "WHERE p.status='sold' AND p.purchased_at >= "+since)
    const outreach=await read('outreach',['market_prospect_outreach'],
      "SELECT COUNT(*) FILTER (WHERE status IN ('sent','opened','responded','converted'))::int AS attempted, "+
      "COUNT(*) FILTER (WHERE status IN ('responded','converted'))::int AS responded "+
      "FROM market_prospect_outreach WHERE last_activity_at >= "+since)

    // This table is self-reported stock resale. Do not call it a verified
    // bank-receipt or combine its NGN value with company cash settlement.
    const agility=await read('agility',['agility_agent_sales'],
      "SELECT COUNT(*)::int AS recorded_sales, COALESCE(SUM(quantity_packages),0)::int AS recorded_units, "+
      "COALESCE(SUM(total_revenue_ngn),0)::numeric AS recorded_revenue_ngn "+
      "FROM agility_agent_sales WHERE sold_at >= "+since)
    const agentLeaders=await read('agentLeaders',['agility_agent_sales'],
      "SELECT s.agent_id AS user_id,COALESCE(u.name,'Agent') AS name, "+
      "COUNT(*)::int AS recorded_sales,COALESCE(SUM(s.quantity_packages),0)::int AS units "+
      "FROM agility_agent_sales s JOIN users u ON u.id=s.agent_id "+
      "WHERE s.sold_at >= "+since+" GROUP BY s.agent_id,u.name ORDER BY units DESC LIMIT 20")
    const food=await read('carrierFood',['carrier_food_orders'],
      "SELECT COUNT(*) FILTER (WHERE payment_status='paid' AND status='fulfilled')::int AS fulfilled_orders, "+
      "COALESCE(SUM(quantity_packages) FILTER (WHERE payment_status='paid' AND status='fulfilled'),0)::int AS fulfilled_units, "+
      "COALESCE(SUM(total_ngn) FILTER (WHERE payment_status='paid' AND status='fulfilled'),0)::numeric AS fulfilled_value_ngn, "+
      "COUNT(*) FILTER (WHERE payment_status='paid' AND status<>'fulfilled' AND status<>'cancelled')::int AS paid_unfulfilled, "+
      "COUNT(*) FILTER (WHERE payment_status='proof_submitted')::int AS payment_proofs_pending "+
      "FROM carrier_food_orders WHERE (fulfilled_at >= "+since+
      " OR created_at >= "+since+")")
    const agentFoodLeaders=await read('agentFoodLeaders',['carrier_food_orders'],
      "SELECT o.agent_id AS user_id,COALESCE(u.name,'Agent') AS name, "+
      "COUNT(*)::int AS fulfilled_orders, COALESCE(SUM(o.quantity_packages),0)::int AS units "+
      "FROM carrier_food_orders o JOIN users u ON u.id=o.agent_id "+
      "WHERE o.payment_status='paid' AND o.status='fulfilled' AND o.fulfilled_at >= "+since+
      " GROUP BY o.agent_id,u.name ORDER BY units DESC LIMIT 20")
    const paidFoodProducts=await read('paidFoodProducts',['carrier_food_orders'],
      "SELECT variant_id AS product, COUNT(*)::int AS orders, "+
      "COALESCE(SUM(quantity_packages),0)::int AS units "+
      "FROM carrier_food_orders WHERE payment_status='paid' AND status='fulfilled' "+
      "AND fulfilled_at >= "+since+" GROUP BY variant_id ORDER BY units DESC LIMIT 20")
    const recordedStockProducts=await read('recordedStockProducts',['agility_agent_sales','agility_stock_orders'],
      "SELECT o.variant_id AS product, COUNT(*)::int AS sales, "+
      "COALESCE(SUM(s.quantity_packages),0)::int AS units "+
      "FROM agility_agent_sales s JOIN agility_stock_orders o ON o.id=s.order_id "+
      "WHERE s.sold_at >= "+since+" GROUP BY o.variant_id ORDER BY units DESC LIMIT 20")
    const cakes=await read('cakes',['carrier_cake_orders'],
      "SELECT COUNT(*) FILTER (WHERE status='completed' AND payment_status='paid')::int AS fulfilled_orders, "+
      "COALESCE(SUM(total_ngn) FILTER (WHERE status='completed' AND payment_status='paid'),0)::numeric AS fulfilled_value_ngn, "+
      "COUNT(*) FILTER (WHERE payment_status='paid' AND status NOT IN ('completed','cancelled'))::int AS paid_unfulfilled, "+
      "COUNT(*) FILTER (WHERE payment_status='proof_submitted')::int AS payment_proofs_pending "+
      "FROM carrier_cake_orders WHERE (completed_at >= "+since+" OR created_at >= "+since+")")
    const stock=await read('stock',['agility_stock_orders'],
      "SELECT COUNT(*)::int AS verified_stock_orders, COALESCE(SUM(total_ngn),0)::numeric AS verified_stock_value_ngn "+
      "FROM agility_stock_orders WHERE payment_status='paid' AND COALESCE(payment_verified_at,paid_at) >= "+since)

    // Two historical purchase rails can reference the same File Number.
    // Choose one verified purchase per File Number, favoring the newer rail.
    const parts:string[]=[]
    if(sources.file_folder_purchases)parts.push(
      "SELECT COALESCE(NULLIF(file_number,''),id::text) AS sale_key, amount_trx::numeric AS amount, "+
      "COALESCE(file_folder_tier,'unknown') AS tier, COALESCE(confirmed_at,created_at) AS sold_at, "+
      "bridger_id, 1 AS priority FROM file_folder_purchases WHERE status='confirmed'")
    if(sources.bridge_deposits)parts.push(
      "SELECT COALESCE(NULLIF(file_number,''),id::text) AS sale_key, tier_trx::numeric AS amount, "+
      "'legacy'::text AS tier, COALESCE(verified_at,created_at) AS sold_at, "+
      "bridger_id, 2 AS priority FROM bridge_deposits WHERE status='approved'")
    const folders=parts.length
      ? await read('folders',[],
        "WITH sales AS ("+parts.join(" UNION ALL ")+"), "+
        "deduplicated AS (SELECT *,ROW_NUMBER() OVER (PARTITION BY sale_key ORDER BY priority) AS rn FROM sales) "+
        "SELECT COUNT(*)::int AS confirmed_folders,COUNT(DISTINCT bridger_id)::int AS referring_bridgers, "+
        "COUNT(*) FILTER (WHERE tier='plus')::int AS plus_folders "+
        "FROM deduplicated WHERE rn=1 AND sold_at >= "+since)
      : {available:false,rows:[],note:'No File Folder purchase source installed'} as Section
    if(!parts.length)missing.push('folders: no purchase table installed')
    const folderQueue=await read('folderQueue',['file_folder_purchases'],
      "SELECT COUNT(*) FILTER (WHERE status='pending_admin_confirmation')::int AS awaiting_administration, "+
      "COUNT(*) FILTER (WHERE status='pending_payment')::int AS awaiting_payment "+
      "FROM file_folder_purchases")
    const wallet=await read('wallet',['deposits'],
      "SELECT COUNT(*) FILTER (WHERE status='approved' AND verified_at >= "+since+")::int AS approved_deposits, "+
      "COALESCE(SUM(amount_trx) FILTER (WHERE status='approved' AND verified_at >= "+since+"),0)::numeric AS credited_flame_coin, "+
      "COUNT(*) FILTER (WHERE status='pending')::int AS pending_deposits, "+
      "COUNT(*) FILTER (WHERE status='rejected')::int AS rejected_deposits "+
      "FROM deposits")
    const ledger=await read('ledger',['ledger_entries'],
      "SELECT entry_type, currency, COUNT(*)::int AS events "+
      "FROM ledger_entries WHERE created_at >= "+since+
      " GROUP BY entry_type,currency ORDER BY events DESC LIMIT 16")
    const recent=await read('recent',['ledger_entries'],
      "SELECT entry_type, currency, amount, created_at "+
      "FROM ledger_entries WHERE created_at >= "+since+
      " ORDER BY created_at DESC LIMIT 15")
    return NextResponse.json({
      success:true,days,generatedAt:new Date().toISOString(),sources,missing,
      sections:{prospects,bridgerLeaders,prospectContacts,outreach,agility,agentLeaders,
        food,cakes,stock,agentFoodLeaders,paidFoodProducts,recordedStockProducts,folders,folderQueue,wallet,ledger,recent},
      definitions:{
        prospect:'Completed package purchases, not verified human responses',
        agility:'Agent-recorded stock resale; payment is not independently verified by this record',
        fulfilled:'Customer-paid and completed orders only',
        folders:'Confirmed unique File Folder sale keys across current and historical rails',
        wallet:'Approved deposits with verified_at in selected period; pending is the current all-time queue',
        ledger:'Entry counts by type and currency, not revenue or cash balances'
      }
    },{headers})
  }catch(error){
    console.error('[Administrations movement report]',error)
    return NextResponse.json({error:'Movement records could not be retrieved; no totals have been assumed'},
      {status:503,headers})
  }
}
