import { notFound, redirect } from 'next/navigation'
import { ClientMarketEnvironment } from '@/components/public/client-market-environment'
import CustomerDoorCheckout from '@/components/public/customer-door-checkout'
import {
  ensureClientBusinessStoreSchema,
  getBusinessDb,
  normalizeStoreEnvironmentConfig,
} from '@/lib/client-business-store'
import { ensureClientInternationalPaymentProfile } from '@/lib/client-international-payments'
import { ensureClientGrowthWorldSchema } from '@/lib/client-growth-world'
import { ensureEnterpriseDreamSchema } from '@/lib/enterprise-dream'
import { ensureLegionCommerceSchema } from '@/lib/legion-commerce'

export default async function PublicClientMarketStore({
  params,
  searchParams,
}:{
  params:Promise<{slug:string}>
  searchParams:Promise<{order?:string;legion?:string;via?:string;checkout?:string}>
}){
  const {slug}=await params
  const query=await searchParams
  const sql=getBusinessDb()
  await ensureClientBusinessStoreSchema(sql)
  await ensureClientGrowthWorldSchema(sql)
  await ensureEnterpriseDreamSchema(sql)
  await ensureLegionCommerceSchema(sql)

  const [store]=await sql`
    SELECT
      id,client_id,file_number,name,description,public_slug,
      formation_status,public_opened_at,customer_wallet_required,environment_config,world_host_customer_market
    FROM client_business_stores
    WHERE public_slug=${slug}
      AND enabled=true
      AND (formation_status='selling' OR formation_status='ready_for_offer')
    LIMIT 1
  `
  if(!store)notFound()
  // Public Store links pass through System Switch's shared WEAVE Open World land.
  // Preserve Legion attribution and real order confirmation/checkout routes.
  if(store.world_host_customer_market&&query.checkout!=='1'&&!query.order&&query.via!=='system-switch'){
    const legion=typeof query.legion==='string'?query.legion.trim().slice(0,80):''
    redirect('/system-switch/world?door='+encodeURIComponent(slug)+
      (legion?'&legion='+encodeURIComponent(legion):''))
  }

  const [structure]=await sql`
    SELECT
      EXISTS(
        SELECT 1 FROM client_built_systems
        WHERE client_id=${store.client_id}::uuid
          AND file_number=${store.file_number}
          AND system_type='commerce_storefront'
          AND status='active'
      ) AS has_storefront,
      EXISTS(
        SELECT 1 FROM client_built_systems
        WHERE client_id=${store.client_id}::uuid
          AND file_number=${store.file_number}
          AND system_type='marketplace_network'
          AND status='active'
      ) AS has_market_hall
  `

  const offers=await sql`
    SELECT id,name,description,price,currency,offer_type
    FROM client_store_items
    WHERE store_id=${store.id}::uuid
      AND enabled=true
    ORDER BY created_at ASC
  `
  const connectedSystems=await sql`
    SELECT
      p.system_id,
      s.system_type,
      COALESCE(p.public_label,s.title) AS public_label,
      p.public_summary
    FROM client_customer_door_systems p
    JOIN client_built_systems s ON s.id=p.system_id
    WHERE p.store_id=${store.id}::uuid
      AND p.client_id=${store.client_id}::uuid
      AND p.enabled=true
      AND s.status='active'
    ORDER BY p.published_at ASC NULLS LAST,p.created_at ASC
  `
  const payments=await ensureClientInternationalPaymentProfile(sql,store.client_id)
  const level=structure?.has_market_hall?'market_hall':structure?.has_storefront?'storefront':'door'
  const [channel]=await sql`
    SELECT c.public_slug
    FROM client_stream_channels c
    WHERE c.client_id=${store.client_id}::uuid
      AND c.enabled=true
      AND EXISTS(
        SELECT 1 FROM client_built_systems s
        WHERE s.client_id=c.client_id
          AND s.system_type='streaming_gate'
          AND s.status='active'
      )
    LIMIT 1
  `
  const [enterprise]=await sql`
    SELECT a.public_slug
    FROM enterprise_applications a
    WHERE a.client_id=${store.client_id}::uuid
      AND a.status='approved'
      AND EXISTS(
        SELECT 1 FROM client_built_systems s
        WHERE s.client_id=a.client_id
          AND s.system_type='enterprise_door'
          AND s.status='active'
      )
    LIMIT 1
  `
  const orderForCheckout=(query.order&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query.order))?await sql`
    SELECT o.id,o.amount,o.currency FROM client_store_orders o
    WHERE o.id=${query.order}::uuid AND o.store_id=${store.id}::uuid LIMIT 1
  `:[]
  const checkoutOrder=orderForCheckout[0]||null

  const carrierCode=String(query.legion||'').trim().slice(0,80)
  const [legion]=carrierCode
    ? await sql`
        SELECT name,function_title,sales_code
        FROM enterprise_legions
        WHERE client_id=${store.client_id}::uuid
          AND sales_code=${carrierCode}
          AND active=true
          AND sales_enabled=true
        LIMIT 1
      `
    : [null]

  return <>
    {legion&&<div className="border-b border-violet-300/15 bg-violet-400/[0.06] px-5 py-3 text-center text-xs text-violet-100">
      <span className="font-black">Legion Carrier:</span> {legion.name} · {legion.function_title}. This Client-owned Customer Door remains the business destination; this Legion carried you here.
    </div>}
    {checkoutOrder&&<div className="mx-auto max-w-5xl px-5 py-4"><CustomerDoorCheckout orderId={String(checkoutOrder.id)} amount={Number(checkoutOrder.amount)} currency={String(checkoutOrder.currency)}/></div>}
    <ClientMarketEnvironment
      slug={slug}
      store={store}
      offers={offers}
      connectedSystems={connectedSystems}
      payments={payments}
      config={normalizeStoreEnvironmentConfig(store.environment_config)}
      level={level}
      arrivalFromSystemSwitch={query.via==='system-switch'}
      orderRef={query.order||null}
      streamUrl={channel?.public_slug?'/stream/'+channel.public_slug:null}
      enterpriseUrl={enterprise?.public_slug?'/enterprise/'+enterprise.public_slug:null}
    />
  </>
}
