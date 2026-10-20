'use client'

import { useAuth } from '@/lib/auth-provider'
import Link from 'next/link'
import {ArrowLeft,Store} from 'lucide-react'
import { AgentOutletTrainingVideo } from '@/components/agent/agent-outlet-training-video'
import { ELECTROLYTE_VARIANTS } from '@/lib/electrolyte-catalog'
import { EMBER_VARIANTS } from '@/lib/ember-catalog'

const money=(price:number)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(price)
const productPricing=[...ELECTROLYTE_VARIANTS,...EMBER_VARIANTS].map(variant=>`${variant.name} ${money(Number(variant.agentSellingUnitPriceNgn))}`).join('; ')
const topics=[
  {label:'Approach',detail:'Visit a real shop, observe customers and ask which food sells.'},
  {label:'Prices',detail:'Agents supply at WEAVE price. Independent stores choose their resale price.'},
  {label:'Products',detail:productPricing},
  {label:'Records',detail:'Use Distribution Route to register the outlet, supply received stock and record settlement.'},
]
export default function AgentOutletTrainingPage(){
 const { user, isInitialized, isLoading } = useAuth()
 if (!isInitialized || isLoading) return <main role="status" className="p-8 text-sm text-cyan-100">Checking Agent access…</main>
 if (user?.role !== 'agent') return <main role="alert" className="p-8 text-sm text-amber-200">This training is available to active WEAVE Agents only.</main>
 return <main className="mx-auto max-w-4xl space-y-6 px-4 pb-24 pt-6 text-white" data-agent-training="outlet-stability">
  <Link href="/agent/work" className="inline-flex items-center gap-2 text-xs text-emerald-300"><ArrowLeft size={16}/>Agent Work</Link>
  <header>
   <p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300">Stability · Agent training</p>
   <h1 className="mt-2 text-3xl font-black">Daily Carton Outlet Training</h1>
   <p className="mt-3 text-sm leading-6 text-stone-300">Watch before visiting a shop. Agents sell to individuals and supply stores at official WEAVE prices. The independent store sets its own markup.</p>
  </header>
  <AgentOutletTrainingVideo />
  <div className="grid gap-3 sm:grid-cols-2">
   {topics.map(topic=><section key={topic.label} className="rounded-xl border border-white/10 bg-white/[.03] p-4">
    <p className="text-sm font-bold text-emerald-200">{topic.label}</p>
    <p className="mt-2 text-xs leading-5 text-stone-300">{topic.detail}</p>
   </section>)}
  </div>
  <p className="text-xs leading-5 text-stone-400">The video illustrates the process. Stock availability, payment verification, fresh-food handling, and outlet demand determine real orders. Daisy Pastries are handled per cake order.</p>
  <Link href="/agent/distribution" className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/40 px-4 py-3 text-sm font-bold text-emerald-200"><Store size={16}/>Open Agent Distribution Route</Link>
 </main>
}
