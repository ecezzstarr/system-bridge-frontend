import Link from 'next/link'
import type { Metadata } from 'next'
import { AgentFoodCarrierPublic } from '@/components/carrier/agent-food-carrier-public'
import { AgentFarmCarrierPublic } from '@/components/carrier/agent-farm-carrier-public'
import { AgentCakeCarrierPublic } from '@/components/carrier/agent-cake-carrier-public'
import { getAgentByCarrierFoodCode, getCarrierFoodShareImageUrl, getCarrierFoodUrl } from '@/lib/carrier-food'

export async function generateMetadata({params}:{params:Promise<{code:string}>}):Promise<Metadata>{
  const {code}=await params
  const agent=await getAgentByCarrierFoodCode(code).catch(()=>null)
  const agentName=agent?.name||agent?.username||'WEAVE Agent'
  const title=`WEAVE Agent Carrier · ${agentName}`
  const description=`Shop this WEAVE Agent's Carrier Door for available farm surplus, Agility, Electrolyte, Ember and Daisy Pastries; place food requests directly and explore the Bridger position.`
  const url=getCarrierFoodUrl(code)
  const image=getCarrierFoodShareImageUrl(code)
  return {
    title,
    description,
    openGraph:{title,description,url,type:'website',images:[{url:image,width:1200,height:630,alt:'WEAVE Agent Carrier · Farm Produce + Agility + Electrolyte + Ember + Daisy Pastries'}]},
    twitter:{card:'summary_large_image',title,description,images:[image]},
  }
}

export default async function CarrierFoodDoorPage({params}:{params:Promise<{code:string}>}){
  const {code}=await params
  return <>
    <div className="bg-[#102017] px-4 py-3 text-center">
      <Link href="/food-store" className="text-xs font-black text-emerald-100">WEAVE Family Food Store · Rice, beans, groceries, Family Baskets, Agility, Electrolyte, Ember and Daisy Pastries</Link>
    </div>
    <div className="bg-[#09150d] px-4 py-4 text-white sm:px-8" data-carrier-family-products>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 sm:flex-nowrap">
        <img src="/weave-food/weave-family-products.avif" width={420} height={307} alt="WEAVE Family Food Store branded household grocery illustration" loading="lazy" className="w-full max-w-[260px] rounded-lg border border-emerald-300/20"/>
        <div>
          <p className="text-sm font-black">WEAVE Family Food Store · Household Essentials</p>
          <p className="mt-2 text-xs leading-5 text-stone-400">Rice, beans, garri, palm oil and other real supplier-listed products. The branded packaging shown is an illustration, not confirmation that this Agent currently holds each item.</p>
          <Link href="/food-store" className="mt-3 inline-flex text-xs font-black text-emerald-200">Browse the Family Food Store →</Link>
        </div>
      </div>
    </div>
    <section className="bg-[#07100b] px-4 pt-5 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 rounded-[1.2rem] border border-sky-300/20 bg-sky-300/[.05] px-4 py-3">
          <p className="text-[9px] font-black uppercase tracking-[.22em] text-sky-300">CUSTOMER ORDER UNIT</p>
          <p className="mt-1 text-sm font-black text-white">FARM PRODUCE · AGILITY · ELECTROLYTE · EMBER · CAKES</p>
          <p className="mt-1 text-xs font-black text-amber-200">CAKES · DAISY PASTRIES</p>
          <p className="mt-1 text-sm font-black text-sky-100">1 PACKAGE / BOWL / BOX OR MORE · NO CARTON MINIMUM</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">Farm produce comes from an Agent's verified farm account and shows the farm's reported available stock; customers request quantities and approve a real transport quote before arranging payment. Carton rules apply only when an Agent buys company stock from WEAVE. Agility, Electrolyte and Ember customers order packages or bowls from Agent stock. Daisy Pastries cakes retain their separate ordering and payment process.</p>
        </div>
        <p className="mb-3 text-[9px] font-black uppercase tracking-[.24em] text-slate-500">Customer food preview · see what you are ordering</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <figure className="overflow-hidden rounded-[1.4rem] border border-orange-300/20 bg-black/20">
            <a href="/weave-food/agility.jpeg" target="_blank" rel="noopener noreferrer" aria-label="Open Agility product image"><img src="/weave-food/agility.jpeg" alt="WEAVE Agility food package preview" className="h-auto max-h-[36rem] w-full bg-[#fffaf0] object-contain"/></a>
            <figcaption className="px-4 py-3 text-xs font-bold text-orange-100">AGILITY · WEAVE morning food package · customers order from 1 package</figcaption>
          </figure>
          <figure className="overflow-hidden rounded-[1.4rem] border border-emerald-300/20 bg-black/20">
            <a href="/weave-food/electrolyte.jpeg" target="_blank" rel="noopener noreferrer" aria-label="Open Electrolyte product image"><img src="/weave-food/electrolyte.jpeg" alt="WEAVE Electrolyte sliced food bowl preview" className="h-auto max-h-[36rem] w-full bg-[#fffaf0] object-contain"/></a>
            <figcaption className="px-4 py-3 text-xs font-bold text-emerald-100">ELECTROLYTE · Small Bowl ₦4,000 · Medium Bowl ₦6,000 · customers order from 1 bowl</figcaption>
          </figure>
          <figure className="overflow-hidden rounded-[1.4rem] border border-orange-400/25 bg-black/20">
            <a href="/weave-food/ember.jpg" target="_blank" rel="noopener noreferrer" aria-label="Open Ember image"><img src="/weave-food/ember.jpg" alt="WEAVE Ember rich evening food box, Small ₦6,000 and Large ₦12,000" className="mx-auto h-auto w-full max-w-[460px] bg-[#170b05] object-contain"/></a>
            <figcaption className="px-4 py-3 text-xs font-bold text-orange-100">EMBER · Small ₦6,000 · Large ₦12,000 · order from 1 box</figcaption>
          </figure>
        </div>
      </div>
    </section>
    <AgentFarmCarrierPublic referralCode={code}/>
    <AgentFoodCarrierPublic referralCode={code}/>
    <AgentCakeCarrierPublic referralCode={code}/>
  </>
}
