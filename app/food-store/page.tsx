'use client'
import { useEffect,useMemo,useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Search, ShoppingBasket, Sprout, CakeSlice, PackageCheck, Truck } from 'lucide-react'

type Group={id:string;label:string;items:readonly string[]}
type BasketTemplate={id:string;name:string;description:string;suggested:readonly string[]}
type FoodOffer={
  id:string;name:string;unit:string;priceNgn:number;availableQuantity:number;details:string;
  farmName:string;state:string;community:string;agentName:string;carrierPath:string;
  isBasket:boolean;basketComponents:{name:string;quantity:number;unit:string}[];
  basketReferenceAtListingNgn:number|null;basketSavingsAtListingNgn:number|null
}
type Catalog={
  groups:Group[];templates:BasketTemplate[];offers:FoodOffer[];
  prepared:{agilityNgn:number;electrolyte:{name:string;priceNgn:number}[];ember:{name:string;priceNgn:number}[]};
  daisy:{name:string;label:string}[];carrierAgents:{name:string;carrierPath:string;daisyPath:string}[]
}
const naira=(v:number)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(v)
const matches=(offer:FoodOffer,group:Group)=>group.items.some(item=>{
  const a=item.toLowerCase().split(/[(/]/)[0].trim()
  const name=offer.name.toLowerCase()
  return a.length>2 && (name.includes(a)||a.includes(name))
})
export default function WeaveFamilyFoodStore(){
  const [catalog,setCatalog]=useState<Catalog|null>(null)
  const [error,setError]=useState('')
  const [query,setQuery]=useState('')
  const [group,setGroup]=useState('all')
  const [state,setState]=useState('all')
  useEffect(()=>{
    const controller=new AbortController()
    fetch('/api/food-store',{signal:controller.signal,cache:'no-store'})
      .then(async res=>{const data=await res.json();if(!res.ok)throw new Error(data.error||'Store catalogue unavailable');return data})
      .then(data=>setCatalog(data))
      .catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Unable to load food store')})
    return()=>controller.abort()
  },[])
  const regions=useMemo(()=>[...new Set((catalog?.offers||[]).map(x=>x.state))].sort(),[catalog])
  const offers=useMemo(()=>(catalog?.offers||[]).filter(offer=>{
    if(state!=='all'&&offer.state!==state)return false
    if(group==='baskets'&&!offer.isBasket)return false
    if(group!=='all'&&group!=='baskets'){
      const cat=catalog?.groups.find(x=>x.id===group)
      if(!cat||!matches(offer,cat))return false
    }
    const search=query.trim().toLowerCase()
    return !search||[offer.name,offer.farmName,offer.state,offer.community,offer.details,...offer.basketComponents.map(c=>c.name)].join(' ').toLowerCase().includes(search)
  }),[catalog,query,group,state])
  return <main className="min-h-screen bg-[#08120c] px-4 pb-24 pt-6 text-white sm:px-8" data-weave-family-food-store>
    <div className="mx-auto max-w-6xl">
      <header className="border-b border-emerald-300/20 pb-7">
        <Link href="/" className="text-xs font-bold text-emerald-200">WEAVE · Home</Link>
        <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-amber-200"><ShoppingBasket className="h-4 w-4"/> Farm to Family · Agility · Electrolyte · Ember · Daisy Pastries</div>
        <h1 className="mt-3 text-3xl font-black sm:text-5xl">WEAVE FAMILY FOOD STORE</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-300">One branded Nigerian food destination. Buy from real Agent suppliers: rice, beans, garri, yam, plantain, vegetables, fish, meat, oils, cooking ingredients, pantry staples, prepared bowls and Daisy Pastries. Prices and available stock are shown only when suppliers publish them.</p>
        <p className="mt-3 text-xs leading-6 text-amber-100">Family Baskets are discounted only against the same supplier’s separate-item prices at the time of publication. The seller sets the basket price; delivery may change the final total. No national cheapest-price guarantee is made.</p>
      </header>

      <figure className="mt-6 grid overflow-hidden rounded-xl border border-emerald-300/20 bg-[#0e1c12] sm:grid-cols-[minmax(0,420px)_minmax(0,1fr)]" data-weave-food-real-product-image>
        <img src="/weave-food/weave-family-products.avif" alt="WEAVE Family Food Store branded rice, honey beans, garri, palm oil, vegetables, yams and eggs product collection illustration" width={420} height={307} loading="eager" fetchPriority="high" className="mx-auto h-auto w-full max-w-[420px] object-contain"/>
        <figcaption className="flex flex-col justify-center gap-3 px-5 py-5 text-sm leading-6 text-stone-300 sm:px-8">
          <span className="text-xl font-black text-emerald-100">Food for Nigerian homes</span>
          <span>Rice, beans, garri, cooking oils and household provisions under the WEAVE Family Food Store collection.</span>
          <span className="text-xs text-amber-100">Branded packaging is illustrative; verified seller listings below determine actual products, prices and stock.</span>
        </figcaption>
      </figure>
      <section className="mt-7 grid gap-3 sm:grid-cols-3" data-store-departments>
        <div className="border border-emerald-300/20 bg-emerald-300/[.035] p-5">
          <Sprout className="h-6 w-6 text-emerald-200"/><h2 className="mt-3 text-lg font-black">Farm & household essentials</h2>
          <p className="mt-2 text-xs leading-6 text-stone-300">Rice, beans, garri, vegetables, soup ingredients, proteins, breakfast and verified pre-packed Family Baskets. Buy through a supplier’s Carrier Door with Weave farm escrow.</p>
          <button type="button" className="mt-4 text-xs font-black text-emerald-200" onClick={()=>setGroup('baskets')}>See Family Baskets →</button>
        </div>
        <div className="border border-amber-300/20 bg-amber-300/[.035] p-5">
          <PackageCheck className="h-6 w-6 text-amber-200"/><h2 className="mt-3 text-lg font-black">Prepared WEAVE food</h2>
          <p className="mt-2 text-xs leading-6 text-stone-300">Agility {catalog?naira(catalog.prepared.agilityNgn):'priced per pack'} · Electrolyte and Ember each have separate Small/Large or Small/Medium prices. Customers can order only the Agent’s paid and received available stock.</p>
        </div>
        <div className="border border-orange-300/20 bg-orange-300/[.035] p-5">
          <CakeSlice className="h-6 w-6 text-orange-200"/><h2 className="mt-3 text-lg font-black">Daisy Pastries</h2>
          <p className="mt-2 text-xs leading-6 text-stone-300">Cake slices, bento cakes, celebration, wedding, birthday and event cakes. Customers use the Agent’s Daisy Carrier section; quote and payment flow remain separate from Farm-to-Family stock.</p>
          <p className="mt-3 text-xs font-bold text-orange-100">{catalog?.daisy.map(x=>x.name+' '+x.label).join(' · ')||'View prices through an Agent Carrier Door'}</p>
          {catalog?.carrierAgents?.length?<Link href={catalog.carrierAgents[0].daisyPath} className="mt-4 inline-flex items-center gap-2 text-xs font-black text-orange-100">Order from a configured Agent <ArrowRight className="h-4 w-4"/></Link>:<p className="mt-3 text-xs text-stone-400">Customer cake requests become available when an Agent configures a receiving account.</p>}
        </div>
      </section>

      <section id="registered-food-agents" className="mt-6 scroll-mt-4 border border-orange-300/20 p-4" data-store-real-agent-carriers>
        {!catalog&&!error&&<p className="text-xs text-stone-400">Loading registered WEAVE Food Agents…</p>}
        {catalog&&!catalog.carrierAgents.length&&<p className="text-xs text-stone-400">No Food Agent with a configured receiving account is listed yet. You can still browse published supplier offers below.</p>}
        {!!catalog?.carrierAgents?.length&&<>
        <h2 className="text-lg font-black">Order from a registered WEAVE Food Agent</h2>
        <p className="mt-2 text-xs text-stone-400">These Agents have configured customer receiving accounts. Their Carrier Doors include Daisy Pastries requests; prepared food is orderable only where they have paid, received stock. Browse the food selection before paying.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {catalog.carrierAgents.slice(0,20).map((agent,i)=><Link key={agent.carrierPath+i} href={agent.carrierPath} className="border border-orange-300/25 px-3 py-2 text-xs text-orange-100">{agent.name} →</Link>)}
        </div>
        </>}
      </section>
      <section className="mt-8" data-household-food-categories>
        <h2 className="text-xl font-black">Household food categories</h2>
        <p className="mt-2 text-xs text-stone-400">The catalogue below is a food checklist. Only separately displayed live offers are available for purchase.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={()=>setGroup('all')} className={`border px-3 py-2 text-xs ${group==='all'?'border-emerald-300 text-emerald-100':'border-white/15 text-stone-300'}`}>All live offers</button>
          <button type="button" onClick={()=>setGroup('baskets')} className={`border px-3 py-2 text-xs ${group==='baskets'?'border-emerald-300 text-emerald-100':'border-white/15 text-stone-300'}`}>Family Baskets</button>
          {catalog?.groups.map(g=><button key={g.id} type="button" onClick={()=>setGroup(g.id)} className={`border px-3 py-2 text-xs ${group===g.id?'border-emerald-300 text-emerald-100':'border-white/15 text-stone-300'}`}>{g.label}</button>)}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {catalog?.groups.map(g=><div key={g.id} className="border border-white/10 p-4">
            <h3 className="text-xs font-black text-emerald-200">{g.label}</h3>
            <p className="mt-2 text-xs leading-6 text-stone-400">{g.items.join(' · ')}</p>
          </div>)}
        </div>
      </section>

      <section className="mt-8 border-t border-white/10 pt-7" data-store-real-inventory>
        <h2 className="text-xl font-black">Available, approved supplier offers</h2>
        <p className="mt-2 text-xs text-stone-400">Supplier prices are shown in naira. Select an Agent Carrier Door to place a real order; no payment is taken on this browsing page.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_220px]">
          <label className="flex items-center gap-2 border border-white/20 px-3"><Search className="h-4 w-4 text-stone-500"/><input type="search" aria-label="Search household food" placeholder="Search rice, beans, baskets or location" value={query} onChange={e=>setQuery(e.target.value)} className="w-full bg-transparent py-3 text-sm text-white outline-none"/></label>
          <label className="text-xs text-stone-400">Origin state
            <select value={state} onChange={e=>setState(e.target.value)} className="mt-1 w-full border border-white/15 bg-[#122015] p-2.5 text-white"><option value="all">All available states</option>{regions.map(s=><option key={s} value={s}>{s}</option>)}</select>
          </label>
        </div>
        {error&&<p role="alert" className="mt-4 text-xs text-rose-200">{error}</p>}
        {!catalog&&!error&&<p className="mt-5 text-xs text-stone-400">Loading verified offers…</p>}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map(offer=><article key={offer.id} className="flex flex-col border border-white/10 bg-white/[.025] p-4">
            <p className="text-[10px] font-black uppercase tracking-[.15em] text-emerald-200">{offer.isBasket?'WEAVE Family Basket · supplier-packed':'Approved farm / food supplier'}</p>
            <h3 className="mt-2 text-lg font-black">{offer.name}</h3>
            <p className="mt-2 text-xs leading-5 text-stone-400">{offer.details}</p>
            {offer.isBasket&&<p className="mt-2 text-xs text-sky-200">{offer.basketComponents.map(c=>c.quantity+' '+c.unit+' '+c.name).join(' · ')}</p>}
            <p className="mt-3 text-xl font-black">{naira(offer.priceNgn)} <span className="text-xs font-normal text-stone-400">/ {offer.unit}</span></p>
            {offer.isBasket&&Number(offer.basketSavingsAtListingNgn)>0&&<p className="mt-1 text-xs text-emerald-200">Published bundle saving: {naira(Number(offer.basketSavingsAtListingNgn))} compared with supplier’s individual listing prices when published</p>}
            <p className="mt-2 text-xs text-stone-400">{offer.availableQuantity} {offer.unit} reported available · {offer.farmName}, {offer.community}, {offer.state}</p>
            <Link href={offer.carrierPath} className="mt-5 inline-flex items-center justify-between border border-emerald-300/25 px-4 py-3 text-xs font-black text-emerald-100">Order from {offer.agentName||'this Agent'} <ArrowRight className="h-4 w-4"/></Link>
          </article>)}
          {catalog&&offers.length===0&&<p className="border border-dashed border-white/20 p-6 text-sm text-stone-400 sm:col-span-2">No currently published, eligible supplier offers match this search. The food categories are planned product coverage, not invented stock.</p>}
        </div>
      </section>
      <footer className="mt-8 flex items-start gap-2 border-t border-white/10 pt-5 text-xs leading-6 text-stone-400"><Truck className="mt-1 h-4 w-4 shrink-0"/> Farm-to-Family retains the ₦1,000 fee deducted once from the seller per completed trade. Customers pay the accepted food and transport quote to Weave escrow. Prepared stock sold on Agent Carrier Doors and Daisy Pastries use their existing separate payment rules.</footer>
    </div>
  </main>
}
