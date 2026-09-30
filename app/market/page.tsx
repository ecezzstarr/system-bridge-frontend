import Link from 'next/link'
import { ArrowRight, Building2, Landmark, Store } from 'lucide-react'
import {
  ensureClientBusinessStoreSchema,
  getBusinessDb,
  normalizeStoreEnvironmentConfig,
} from '@/lib/client-business-store'

export const dynamic='force-dynamic'

export default async function PublicClientMarket(){
  const sql=getBusinessDb()
  await ensureClientBusinessStoreSchema(sql)

  const stores=await sql`
    SELECT
      s.public_slug,s.name,s.description,s.environment_config,s.public_opened_at,
      (SELECT COUNT(*)::int FROM client_store_items i WHERE i.store_id=s.id AND i.enabled=true) AS offer_count,
      EXISTS(
        SELECT 1 FROM client_built_systems b
        WHERE b.client_id=s.client_id
          AND b.file_number=s.file_number
          AND b.system_type='commerce_storefront'
          AND b.status='active'
      ) AS has_storefront,
      EXISTS(
        SELECT 1 FROM client_built_systems b
        WHERE b.client_id=s.client_id
          AND b.file_number=s.file_number
          AND b.system_type='marketplace_network'
          AND b.status='active'
      ) AS has_market_hall
    FROM client_business_stores s
    WHERE s.enabled=true
      AND s.formation_status='selling'
    ORDER BY s.public_opened_at DESC NULLS LAST,s.created_at DESC
    LIMIT 120
  `

  return <main className="min-h-screen overflow-hidden bg-transparent text-white" data-public-market-world>
    <section className="relative border-b border-white/10 bg-[radial-gradient(circle_at_15%_0%,rgba(56,189,248,.18),transparent_34%),radial-gradient(circle_at_82%_14%,rgba(168,85,247,.14),transparent_30%),linear-gradient(180deg,#07111f,#040710)] px-5 py-10 md:px-8 md:py-16">
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.045)_1px,transparent_1px)] [background-size:54px_54px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"/>
      <div className="relative mx-auto max-w-7xl">
        <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-sky-300"><Landmark className="h-4 w-4"/>WEAVE Customer Market</p>
        <h1 data-weave-live-word="title" className="mt-4 max-w-4xl text-4xl font-black tracking-[-0.04em] sm:text-6xl">The open internet meets Client-built enterprises.</h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300">Each Client builds privately inside System Switch. When the Customer Door opens, the enterprise enters this public market. Customers, Administration, Agents, Bridgers and other Clients can visit that public Door without entering the private File Folder.</p>
        <div className="mt-7 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-wider text-slate-400">
          <span className="rounded-full border border-white/10 bg-white/[0.035] px-4 py-2">Open internet access</span>
          <span className="rounded-full border border-white/10 bg-white/[0.035] px-4 py-2">Client-owned stores</span>
          <span className="rounded-full border border-white/10 bg-white/[0.035] px-4 py-2">Real orders</span>
          <span className="rounded-full border border-white/10 bg-white/[0.035] px-4 py-2">Persistent construction</span>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div><p className="text-[9px] font-black uppercase tracking-[0.22em] text-violet-300">Customer market</p><h2 data-weave-live-word="title" className="mt-2 text-3xl font-black">Open Customer Doors</h2></div>
        <p className="text-xs text-slate-500">{stores.length} open {stores.length===1?'door':'doors'}</p>
      </div>

      {stores.length===0?<div className="rounded-[2rem] border border-dashed border-white/10 p-12 text-center">
        <Building2 className="mx-auto h-8 w-8 text-slate-600"/>
        <p className="mt-4 text-sm text-slate-500">The first Client Customer Doors are still under construction.</p>
      </div>:<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {stores.map((store:any,index:number)=>{
          const config=normalizeStoreEnvironmentConfig(store.environment_config)
          const doorName=config.platformName || store.name || 'Customer Door'
          const level=store.has_market_hall?'Market Hall':store.has_storefront?'Store Building':doorName
          return <Link key={store.public_slug} href={`/market/${store.public_slug}`} className="group relative min-h-[360px] overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(155deg,rgba(14,165,233,.09),rgba(17,24,39,.88)_48%,rgba(88,28,135,.16))] p-5 shadow-[0_28px_80px_rgba(0,0,0,.28)] transition hover:-translate-y-1 hover:border-sky-200/20">
            <div className="absolute inset-x-5 bottom-4 h-6 rounded-[50%] bg-black/50 blur-lg"/>
            <div className="relative flex items-start justify-between gap-3">
              <span className="text-[8px] font-black uppercase tracking-[0.18em] text-sky-300">{config.marketSection}</span>
              <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[8px] font-black uppercase text-slate-400">{level}</span>
            </div>
            <div aria-hidden="true" className="relative mx-auto mt-5 h-36 w-[88%]">
              <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t-[2rem] border border-white/15 bg-white/[0.065] backdrop-blur-md ${store.has_market_hall?'h-[92%] w-[62%]':store.has_storefront?'h-[76%] w-[56%]':'h-[56%] w-[42%]'}`}>
                <div className="absolute inset-x-[10%] top-[16%] grid grid-cols-3 gap-1.5">{Array.from({length:6}).map((_,i)=><span key={i} className="aspect-[1.4] rounded-sm border border-white/10 bg-sky-200/[0.08]"/>)}</div>
                <div className="absolute bottom-0 left-1/2 h-[36%] w-[30%] -translate-x-1/2 rounded-t-xl border-x border-t border-white/10 bg-black/35"/>
              </div>
              <div className="absolute bottom-0 left-1/2 h-10 w-[70%] -translate-x-1/2 [clip-path:polygon(42%_0,58%_0,100%_100%,0_100%)] bg-gradient-to-b from-white/10 to-transparent"/>
            </div>
            <div className="relative mt-3">
              <p className="text-[8px] font-black uppercase tracking-[0.18em] text-violet-300">{config.sign}</p>
              <div className="mt-2 flex items-center gap-3">{config.logoUrl&&<img src={config.logoUrl} alt={`${doorName} logo`} className="h-10 w-10 rounded-lg border border-white/10 bg-white/5 object-contain p-1"/>}<div><p className="text-[8px] font-black uppercase tracking-wider text-slate-500">Public Door</p><h3 className="text-2xl font-black">{doorName}</h3></div></div>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{store.description||config.tagline}</p>
              <div className="mt-4 flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-slate-500"><span>{store.offer_count} offer windows</span><span className="inline-flex items-center gap-1 text-sky-300">Enter <ArrowRight className="h-3.5 w-3.5"/></span></div>
            </div>
          </Link>
        })}
      </div>}
    </section>

    <footer className="border-t border-white/10 px-5 py-6 text-center text-[9px] font-black uppercase tracking-[0.18em] text-slate-600"><span className="inline-flex items-center gap-2"><Store className="h-3.5 w-3.5"/>Customer Doors constructed from Client File Folders</span></footer>
  </main>
}
