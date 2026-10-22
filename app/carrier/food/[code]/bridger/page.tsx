import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CircleDollarSign, ShieldCheck, Users } from 'lucide-react'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { WORLD_RULES } from '@/lib/world/constants'
import { AGENTIC_BRIDGER_EARNING_RATE } from '@/lib/weave-lifestyle'
import {
  getAgentByCarrierFoodCode,
  getCarrierFoodBridgerJoinUrl,
  getCarrierFoodUrl,
} from '@/lib/carrier-food'

export async function generateMetadata({params}:{params:Promise<{code:string}>}):Promise<Metadata>{
  const {code}=await params
  const agent=await getAgentByCarrierFoodCode(code).catch(()=>null)
  const agentName=agent?.name||agent?.username||'WEAVE Agent'
  return {
    title:`Understand the Bridger position · ${agentName}`,
    description:`Understand what a WEAVE Bridger does, how a Bridger earns, and how ${agentName} earns as the attached Agent before registration.`,
  }
}

const pct=(value:number)=>`${Math.round(value*100)}%`

export default async function CarrierBridgerExplanationPage({params}:{params:Promise<{code:string}>}){
  const {code}=await params
  const agent=await getAgentByCarrierFoodCode(code).catch(()=>null)
  if(!agent)notFound()

  const agentName=String(agent.name||agent.username||'WEAVE Agent')
  const joinUrl=getCarrierFoodBridgerJoinUrl(String(agent.referral_code||code))
  const carrierUrl=getCarrierFoodUrl(String(agent.referral_code||code))

  return <main className="min-h-screen bg-[#07100b] px-4 py-8 text-white sm:px-7 sm:py-12">
    <div className="mx-auto max-w-5xl">
      <Link href={carrierUrl} className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-white"><ArrowLeft className="h-4 w-4"/>Back to Carrier Door</Link>

      <header className="mt-6 border-b border-cyan-300/15 pb-7">
        <p className="text-[10px] font-black uppercase tracking-[.28em] text-cyan-300">WEAVE · Hope · Bridger position</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-6xl">UNDERSTAND BEFORE YOU ENTER</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">You came through <strong className="text-white">{agentName}</strong>&apos;s Carrier Door. If you continue, WEAVE will register you as a Bridger and attach your Bridger position to this Agent. Read the relationship first.</p>
      </header>

      <section className="mt-7 grid gap-4 lg:grid-cols-2">
        <article className="border border-cyan-300/20 bg-cyan-300/[.035] p-6">
          <div className="flex items-center gap-2 text-cyan-300"><Users className="h-5 w-5"/><p className="text-[9px] font-black uppercase tracking-[.22em]">What a Bridger is</p></div>
          <h2 className="mt-3 text-2xl font-black">HOPE WORKS AT THE HUMAN CROSSING</h2>
          <p className="mt-3 text-sm leading-7 text-slate-400">A Bridger works with Prospect possibilities, attempts real human contact, recognizes who is actually interested, introduces WEAVE, and carries a willing person toward becoming a Client through a File Folder purchase. A Prospect is not a guaranteed customer.</p>
          <p className="mt-3 text-sm leading-7 text-slate-400">The Bridger is an independent operational partner inside WEAVE, not the owner of a Client&apos;s business and not the owner of the Client&apos;s File Folder.</p>
        </article>

        <article className="border border-emerald-300/20 bg-emerald-300/[.035] p-6">
          <div className="flex items-center gap-2 text-emerald-300"><CircleDollarSign className="h-5 w-5"/><p className="text-[9px] font-black uppercase tracking-[.22em]">How the Bridger earns</p></div>
          <h2 className="mt-3 text-2xl font-black">EARN WHEN A REAL CROSSING COMPLETES</h2>
          <p className="mt-3 text-sm leading-7 text-slate-400">An ordinary Bridger earns <strong className="text-white">{pct(WORLD_RULES.BRIDGER_YIELD_RATE)}</strong> of the actual verified File Folder purchase value when a Prospect the Bridger guides becomes a WEAVE Client.</p>
          <p className="mt-3 text-sm leading-7 text-slate-400">Agentic-Bridger is a one-time <strong className="text-white">{WORLD_RULES.AGENTIC_BRIDGER_ONE_TIME_FLAME_COIN} Flame Coin</strong> purchase that opens Lifestyle, Ace and eligible jobs. Its eligible File Folder and Arena earning rate is <strong className="text-white">{pct(AGENTIC_BRIDGER_EARNING_RATE)}</strong>. Ordinary Bridger work has no subscription.</p>
          <p className="mt-3 text-xs leading-6 text-slate-500">The earning comes from verified movement. Buying or receiving a Prospect does not guarantee a response or income.</p>
        </article>
      </section>

      <section className="mt-4 border border-amber-300/20 bg-amber-300/[.035] p-6 sm:p-7">
        <div className="flex items-center gap-2 text-amber-300"><BriefcaseBusiness className="h-5 w-5"/><p className="text-[9px] font-black uppercase tracking-[.22em]">How {agentName} earns as your Agent</p></div>
        <h2 className="mt-3 text-2xl font-black">THE AGENT EARNS FROM THE MOVEMENT ATTACHED TO THE BRIDGER</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="border border-white/10 bg-black/20 p-4"><p className="text-3xl font-black text-amber-200">{pct(WORLD_RULES.AGENT_LEAD_YIELD_RATE)}</p><p className="mt-2 text-sm leading-6 text-slate-400">on qualifying Prospect purchases made by an attached Bridger through the Prospect Market.</p></div>
          <div className="border border-white/10 bg-black/20 p-4"><p className="text-3xl font-black text-amber-200">{pct(WORLD_RULES.AGENT_CROSSING_YIELD_RATE)}</p><p className="mt-2 text-sm leading-6 text-slate-400">of the verified File Folder value when that Bridger completes a Client crossing. This is the Agent&apos;s defined share from WEAVE&apos;s company side of the crossing.</p></div>
        </div>
        <p className="mt-4 text-sm leading-7 text-slate-400">Being attached to {agentName} does not transfer ownership of your Bridger account to the Agent. The Agent relationship lets WEAVE attribute your Prospect activity and completed Client crossings correctly so both positions receive their defined earnings.</p>
      </section>

      <section className="mt-4 border border-white/10 bg-white/[.025] p-6 sm:p-7">
        <div className="flex items-center gap-2 text-slate-300"><ShieldCheck className="h-5 w-5"/><p className="text-[9px] font-black uppercase tracking-[.22em]">What happens if you continue</p></div>
        <p className="mt-3 text-sm leading-7 text-slate-400">Registration opens as <strong className="text-white">Bridger</strong> with {agentName}&apos;s referral identity already carried. After registration, WEAVE writes {agentName} into your assigned Agent relationship so your Agent dashboard connection and qualifying earning attribution are not lost.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild className="h-12 bg-cyan-300 px-6 font-black text-slate-950 hover:bg-cyan-200"><a href={joinUrl}>I UNDERSTAND — CONTINUE TO REGISTRATION <ArrowRight className="ml-2 h-4 w-4"/></a></Button>
          <Button asChild variant="outline" className="h-12 border-white/15 text-white"><Link href={carrierUrl}>RETURN TO FOOD DOOR</Link></Button>
        </div>
      </section>
    </div>
  </main>
}
