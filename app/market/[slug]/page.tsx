import { notFound } from 'next/navigation'
import { ClientMarketEnvironment } from '@/components/public/client-market-environment'
import {
  ensureClientBusinessStoreSchema,
  getBusinessDb,
  normalizeStoreEnvironmentConfig,
} from '@/lib/client-business-store'
import { ensureClientInternationalPaymentProfile } from '@/lib/client-international-payments'

export default async function PublicClientMarketStore({
  params,
  searchParams,
}:{
  params:Promise<{slug:string}>
  searchParams:Promise<{order?:string}>
}){
  const {slug}=await params
  const query=await searchParams
  const sql=getBusinessDb()
  await ensureClientBusinessStoreSchema(sql)

  const [store]=await sql`
    SELECT
      id,client_id,file_number,name,description,public_slug,
      formation_status,public_opened_at,customer_wallet_required,environment_config
    FROM client_business_stores
    WHERE public_slug=${slug}
      AND enabled=true
      AND formation_status='selling'
    LIMIT 1
  `
  if(!store)notFound()

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
  const payments=await ensureClientInternationalPaymentProfile(sql,store.client_id)
  const level=structure?.has_market_hall?'market_hall':structure?.has_storefront?'storefront':'door'

  return <ClientMarketEnvironment
    slug={slug}
    store={store}
    offers={offers}
    payments={payments}
    config={normalizeStoreEnvironmentConfig(store.environment_config)}
    level={level}
    orderRef={query.order||null}
  />
}
