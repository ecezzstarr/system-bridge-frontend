import type { Metadata } from 'next'
import { AgentFoodCarrierPublic } from '@/components/carrier/agent-food-carrier-public'
import { getAgentByCarrierFoodCode, getCarrierFoodShareImageUrl, getCarrierFoodUrl } from '@/lib/carrier-food'

export async function generateMetadata({params}:{params:Promise<{code:string}>}):Promise<Metadata>{
  const {code}=await params
  const agent=await getAgentByCarrierFoodCode(code).catch(()=>null)
  const agentName=agent?.name||agent?.username||'WEAVE Agent'
  const title=`WEAVE Food · ${agentName}`
  const description=`Order Agility and Electrolyte through ${agentName}'s Carrier Door or enter WEAVE as this Agent's Bridger.`
  const url=getCarrierFoodUrl(code)
  const image=getCarrierFoodShareImageUrl(code)
  return {
    title,
    description,
    openGraph:{title,description,url,type:'website',images:[{url:image,width:1200,height:630,alt:'WEAVE Food · Agility + Electrolyte'}]},
    twitter:{card:'summary_large_image',title,description,images:[image]},
  }
}

export default async function CarrierFoodDoorPage({params}:{params:Promise<{code:string}>}){
  const {code}=await params
  return <>
    <section className="bg-[#07100b] px-4 pt-5 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 rounded-[1.2rem] border border-sky-300/20 bg-sky-300/[.05] px-4 py-3">
          <p className="text-[9px] font-black uppercase tracking-[.22em] text-sky-300">CUSTOMER ORDER UNIT</p>
          <p className="mt-1 text-sm font-black text-white">1 PACKAGE / BOWL OR MORE · NO CARTON MINIMUM</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">Carton rules apply only when an Agent buys company stock from WEAVE. Customers order individual Agility packs or Electrolyte bowls through the Agent, subject to available stock.</p>
        </div>
        <p className="mb-3 text-[9px] font-black uppercase tracking-[.24em] text-slate-500">Customer food preview · see what you are ordering</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <figure className="overflow-hidden rounded-[1.4rem] border border-orange-300/20 bg-black/20">
            <img src="/weave-food/agility-preview.svg" alt="WEAVE Agility food package preview" className="aspect-[3/2] w-full object-cover"/>
            <figcaption className="px-4 py-3 text-xs font-bold text-orange-100">AGILITY · WEAVE morning food package</figcaption>
          </figure>
          <figure className="overflow-hidden rounded-[1.4rem] border border-emerald-300/20 bg-black/20">
            <img src="/weave-food/electrolyte-preview.svg" alt="WEAVE Electrolyte sliced food bowl preview" className="aspect-[3/2] w-full object-cover"/>
            <figcaption className="px-4 py-3 text-xs font-bold text-emerald-100">ELECTROLYTE · Small Bowl ₦4,000 · Medium Bowl ₦6,000</figcaption>
          </figure>
        </div>
      </div>
    </section>
    <AgentFoodCarrierPublic referralCode={code}/>
  </>
}
