import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Landmark,
  ShoppingBag,
  Sparkles,
  Store,
  Radio,
  Crown,
} from 'lucide-react'
import type { StoreEnvironmentConfig } from '@/lib/client-business-store'

type Offer={
  id:string
  name:string
  description?:string|null
  price:number|string|null
  currency:string
  offer_type?:string|null
}

type Payments={
  enabled:boolean
  account_name?:string|null
  receiving_identifier?:string|null
  supported_currencies?:string|null
  service_fee_percent?:number|string|null
  instructions?:string|null
  payment_link?:string|null
}

const presetClass:Record<string,{sky:string;ground:string;glass:string;accent:string;soft:string}>={
  radiant_arcade:{
    sky:'from-[#071224] via-[#13234a] to-[#150f2f]',
    ground:'from-violet-950/90 via-slate-950 to-sky-950/80',
    glass:'border-sky-200/20 bg-sky-200/[0.07]',
    accent:'text-sky-200',
    soft:'border-violet-300/15 bg-violet-400/[0.06]',
  },
  glass_citadel:{
    sky:'from-[#06141a] via-[#0c2833] to-[#07131f]',
    ground:'from-cyan-950/90 via-slate-950 to-emerald-950/70',
    glass:'border-cyan-100/20 bg-cyan-100/[0.065]',
    accent:'text-cyan-100',
    soft:'border-cyan-300/15 bg-cyan-300/[0.055]',
  },
  night_market:{
    sky:'from-[#070711] via-[#1d102a] to-[#250b18]',
    ground:'from-fuchsia-950/70 via-slate-950 to-amber-950/50',
    glass:'border-fuchsia-200/20 bg-fuchsia-200/[0.06]',
    accent:'text-fuchsia-100',
    soft:'border-fuchsia-300/15 bg-fuchsia-300/[0.05]',
  },
  garden_exchange:{
    sky:'from-[#071710] via-[#123020] to-[#08151c]',
    ground:'from-emerald-950/80 via-slate-950 to-teal-950/60',
    glass:'border-emerald-200/20 bg-emerald-200/[0.06]',
    accent:'text-emerald-100',
    soft:'border-emerald-300/15 bg-emerald-300/[0.05]',
  },
}

function Architecture({
  level,
  preset,
}:{
  level:'door'|'storefront'|'market_hall'
  preset:string
}){
  const tall=level==='market_hall'
  const full=level!=='door'
  return <div aria-hidden="true" className="relative mx-auto h-[280px] w-full max-w-[760px] sm:h-[360px]">
    <div className="absolute inset-x-[7%] bottom-4 h-7 rounded-[50%] bg-black/55 blur-xl"/>
    <div className="absolute left-[8%] right-[8%] bottom-7 h-5 rounded-[50%] border border-white/10 bg-white/[0.025]"/>
    {tall&&<>
      <div className="absolute left-[12%] bottom-10 h-[44%] w-[15%] rounded-t-[2rem] border border-white/10 bg-black/30 backdrop-blur-sm"/>
      <div className="absolute right-[12%] bottom-10 h-[44%] w-[15%] rounded-t-[2rem] border border-white/10 bg-black/30 backdrop-blur-sm"/>
    </>}
    <div className={`absolute left-1/2 bottom-10 -translate-x-1/2 rounded-t-[3.5rem] border border-white/15 bg-gradient-to-b from-white/[0.12] to-black/40 shadow-[0_35px_100px_rgba(0,0,0,.55)] backdrop-blur-xl ${full?'h-[68%] w-[58%]':'h-[48%] w-[42%]'}`}>
      <div className="absolute inset-x-[8%] top-[13%] grid grid-cols-4 gap-2">
        {Array.from({length:full?12:4}).map((_,index)=><span key={index} className="aspect-[1.4] rounded-sm border border-white/10 bg-sky-200/[0.09] shadow-[inset_0_0_18px_rgba(125,211,252,.06)]"/>)}
      </div>
      <div className="absolute bottom-0 left-1/2 h-[34%] w-[32%] -translate-x-1/2 rounded-t-2xl border-x border-t border-white/15 bg-black/45">
        <div className="absolute inset-x-[18%] top-[17%] h-px bg-white/25"/>
        <div className="absolute bottom-0 left-1/2 h-[74%] w-px bg-white/15"/>
      </div>
    </div>
    {full&&<>
      <div className="absolute left-[8%] bottom-10 h-[34%] w-[21%] rounded-t-2xl border border-white/10 bg-black/30 backdrop-blur-sm"/>
      <div className="absolute right-[8%] bottom-10 h-[34%] w-[21%] rounded-t-2xl border border-white/10 bg-black/30 backdrop-blur-sm"/>
    </>}
    <div className="absolute left-1/2 bottom-[8px] h-14 w-[46%] -translate-x-1/2 [clip-path:polygon(42%_0,58%_0,100%_100%,0_100%)] bg-gradient-to-b from-white/15 to-transparent"/>
    <div className="absolute left-1/2 top-[7%] -translate-x-1/2">
      <div className="h-3 w-3 rounded-full bg-white shadow-[0_0_32px_rgba(255,255,255,.9)]"/>
      <div className="mx-auto h-12 w-px bg-gradient-to-b from-white/70 to-transparent"/>
    </div>
    <div className="absolute inset-x-[3%] top-[10%] flex justify-between opacity-40">
      {Array.from({length:8}).map((_,index)=><span key={index} className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,.8)]"/>)}
    </div>
  </div>
}

export function ClientMarketEnvironment({
  slug,
  store,
  offers,
  payments,
  config,
  level,
  orderRef,
  streamUrl,
  enterpriseUrl,
}:{
  slug:string
  store:{name:string;description?:string|null;customer_wallet_required?:boolean}
  offers:Offer[]
  payments:Payments
  config:StoreEnvironmentConfig
  level:'door'|'storefront'|'market_hall'
  orderRef?:string|null
  streamUrl?:string|null
  enterpriseUrl?:string|null
}){
  const style=presetClass[config.preset]||presetClass.radiant_arcade
  const levelLabel=level==='market_hall'?'Market Hall':level==='storefront'?'Constructed Storefront':'Customer Door'
  return <main className="min-h-screen bg-[#02050b] text-white">
    <section className={`relative isolate overflow-hidden border-b border-white/10 bg-gradient-to-b ${style.sky}`}>
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] [background-size:42px_42px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]"/>
      <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl"/>
      <div className="absolute -right-20 top-0 h-96 w-96 rounded-full bg-violet-400/10 blur-3xl"/>
      <div className="relative mx-auto max-w-7xl px-5 pb-8 pt-5 md:px-8 md:pt-8">
        <nav className="flex flex-wrap items-center justify-between gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-white/55">
          <Link href="/market" className="inline-flex items-center gap-2 hover:text-white"><Landmark className="h-4 w-4"/>WEAVE Client Market</Link>
          <span>{config.marketSection} · {levelLabel}</span>
        </nav>
        <div className="mt-8 grid items-center gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)]">
          <div>
            <p className={`text-[10px] font-black uppercase tracking-[0.28em] ${style.accent}`}>{config.sign}</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black leading-[0.96] tracking-[-0.04em] sm:text-6xl lg:text-7xl">{store.name}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">{config.tagline}</p>
            {store.description&&<p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{store.description}</p>}
            <div className="mt-6 flex flex-wrap gap-2">
              <a href="#offers" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-black text-slate-950">Enter store <ArrowRight className="h-4 w-4"/></a>
              <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-3 text-[10px] font-black uppercase tracking-wider ${style.glass}`}><ShoppingBag className="h-4 w-4"/>No WEAVE account required</span>
              {streamUrl&&<Link href={streamUrl} className={`inline-flex items-center gap-2 rounded-full border px-4 py-3 text-[10px] font-black uppercase tracking-wider ${style.glass}`}><Radio className="h-4 w-4"/>Streaming Gate</Link>}
              {enterpriseUrl&&<Link href={enterpriseUrl} className={`inline-flex items-center gap-2 rounded-full border px-4 py-3 text-[10px] font-black uppercase tracking-wider ${style.glass}`}><Crown className="h-4 w-4"/>Enterprise Door</Link>}
            </div>
          </div>
          <Architecture level={level} preset={config.preset}/>
        </div>
      </div>
      <div className={`h-16 bg-gradient-to-b ${style.ground}`}/>
    </section>

    <section className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12">
      {orderRef&&<div className="mb-8 flex items-start gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-400/[0.06] p-5">
        <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300"/>
        <div><p className="font-black">Your order entered this Client&apos;s store.</p><p className="mt-1 text-xs text-slate-400">Reference: {orderRef}</p></div>
      </div>}

      <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr]">
        <aside className="space-y-5">
          <section className={`rounded-[2rem] border p-6 ${style.soft}`}>
            <div className="flex items-center gap-3"><Building2 className={`h-5 w-5 ${style.accent}`}/><p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Inside this building</p></div>
            <p className="mt-4 text-xl font-black">{config.featuredMessage}</p>
            <div className="mt-5 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[8px] uppercase tracking-wider text-slate-500">Public offers</p><p className="mt-1 text-2xl font-black">{offers.length}</p></div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[8px] uppercase tracking-wider text-slate-500">Structure</p><p className="mt-1 text-xs font-black uppercase">{levelLabel}</p></div>
            </div>
          </section>

          {payments.enabled&&<section className="rounded-[2rem] border border-emerald-300/15 bg-emerald-400/[0.045] p-6">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-300">Payment counter</p>
            <h2 className="mt-2 text-lg font-black">Payment option provided by this Client</h2>
            <div className="mt-4 space-y-3 text-xs">
              <div><span className="text-slate-500">Account name</span><p className="mt-1 text-slate-200">{payments.account_name||'Provided by the store'}</p></div>
              <div><span className="text-slate-500">Receiving identifier</span><p className="mt-1 break-words text-slate-200">{payments.receiving_identifier||'Provided by the store'}</p></div>
              <div><span className="text-slate-500">Currencies</span><p className="mt-1 text-slate-200">{payments.supported_currencies}</p></div>
            </div>
            {payments.instructions&&<p className="mt-4 whitespace-pre-wrap rounded-xl border border-white/5 bg-black/20 p-3 text-xs leading-5 text-slate-400">{payments.instructions}</p>}
            {payments.payment_link&&<a href={payments.payment_link} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-full bg-emerald-500 px-4 py-2 text-[10px] font-black text-slate-950">Open payment link</a>}
          </section>}
        </aside>

        <div id="offers" className="space-y-5">
          <div>
            <p className={`text-[9px] font-black uppercase tracking-[0.22em] ${style.accent}`}>Store windows</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Walk through the offers.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Each offer is a working sales window. Choose one, give the Client the required delivery details, and submit the purchase/request directly.</p>
          </div>

          {offers.length===0&&<div className="rounded-[2rem] border border-dashed border-white/10 p-10 text-center text-sm text-slate-500">This building is open, but its offer windows are still being arranged.</div>}

          <div className="space-y-4">
            {offers.map((item,index)=><article key={item.id} className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(120deg,rgba(255,255,255,.055),rgba(255,255,255,.015))] p-5 md:p-7">
              <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-sky-300/[0.045] blur-2xl"/>
              <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
                <div>
                  <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/25 text-[10px] font-black">{String(index+1).padStart(2,'0')}</span><span className="text-[9px] font-black uppercase tracking-[0.2em] text-sky-300">{item.offer_type||'product'} window</span></div>
                  <h3 className="mt-4 text-2xl font-black">{item.name}</h3>
                  {item.description&&<p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{item.description}</p>}
                  {item.price!=null&&<p className="mt-5 text-xl font-black">{Number(item.price).toLocaleString()} <span className="text-sm text-slate-500">{item.currency}</span></p>}
                </div>
                <form action={`/api/public/store/${encodeURIComponent(slug)}/orders`} method="POST" className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <input name="item_id" value={item.id} type="hidden"/>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Purchase counter</p>
                  <input name="customer_name" required placeholder="Your name" className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2.5 text-sm outline-none"/>
                  <input name="customer_contact" required placeholder="Email or phone" className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2.5 text-sm outline-none"/>
                  {store.customer_wallet_required&&<input name="customer_wallet" required placeholder="Receiving crypto wallet" className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2.5 text-sm outline-none"/>}
                  <input name="payment_reference" placeholder="Payment reference (if paid)" className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2.5 text-sm outline-none"/>
                  <textarea name="customer_note" rows={2} placeholder="Delivery/request note" className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2.5 text-sm outline-none"/>
                  <button className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-black text-slate-950">Purchase / Request <ArrowRight className="h-4 w-4"/></button>
                </form>
              </div>
            </article>)}
          </div>
        </div>
      </div>

      <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">
        <span className="inline-flex items-center gap-2"><Sparkles className="h-3.5 w-3.5"/>Constructed in a Client File Folder</span>
        <Link href="/market" className="inline-flex items-center gap-2 text-slate-400 hover:text-white"><Store className="h-3.5 w-3.5"/>Return to Client Market</Link>
      </footer>
    </section>
  </main>
}
