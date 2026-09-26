import { notFound } from 'next/navigation'
import { ClientMarketEnvironment } from '@/components/public/client-market-environment'
import {
  ensureClientBusinessStoreSchema,
  getBusinessDb,
  normalizeStoreEnvironmentConfig,
} from '@/lib/client-business-store'
import { ensureClientInternationalPaymentProfile } from '@/lib/client-international-payments'
import { ensureClientGrowthWorldSchema } from '@/lib/client-growth-world'
import { ensureEnterpriseDreamSchema } from '@/lib/enterprise-dream'

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
  await ensureClientGrowthWorldSchema(sql)
  await ensureEnterpriseDreamSchema(sql)

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

  return <ClientMarketEnvironment
    slug={slug}
    store={store}
    offers={offers}
    payments={payments}
    config={normalizeStoreEnvironmentConfig(store.environment_config)}
    level={level}
    orderRef={query.order||null}
    streamUrl={channel?.public_slug?'/stream/'+channel.public_slug:null}
    enterpriseUrl={enterprise?.public_slug?'/enterprise/'+enterprise.public_slug:null}
  />
}
