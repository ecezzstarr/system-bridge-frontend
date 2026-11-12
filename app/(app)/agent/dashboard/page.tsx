'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BriefcaseBusiness, Share2, Truck } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { WeaveDashboardWorld } from '@/components/world/weave-dashboard-world'
import { AgentWorkplace } from '@/components/agent/agent-workplace'
import { ArrowLeft } from 'lucide-react'
import { ManagerLifestyleEntry } from '@/components/manager-lifestyle-entry'
import { RegionalSystemSwitchGate } from '@/components/weave/regional-system-switch-gate'
import { useRouter } from 'next/navigation'

export default function AgentWorld() {
  const { user } = useAuth()
  const router = useRouter()
  const [originalWorld,setOriginalWorld]=useState(false)

  useEffect(()=>{
    if(!user)return
    if(user.role!=='agent'){router.replace('/dashboard');return}
  },[user,router])

  if(!user||user.role!=='agent')return null

  return <>
    <div className="mx-auto w-full max-w-5xl px-3 sm:px-5"><RegionalSystemSwitchGate compact /></div>
    {originalWorld ? (
      <div data-agent-original-district-world="preserved">
        <button type="button" onClick={()=>setOriginalWorld(false)}
          className="relative z-30 m-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-300/40 bg-[#142334] px-4 py-2 text-sm font-semibold text-amber-100">
          <ArrowLeft className="h-4 w-4"/> Return to Work Desk
        </button>
        <WeaveDashboardWorld role="agent" userName={user.name} />
      </div>
    ) : (
      <AgentWorkplace userName={user.name} onOpenDistricts={()=>setOriginalWorld(true)}/>
    )}
    <ManagerLifestyleEntry />
    <div className="sr-only focus-within:not-sr-only">
      <Link href="/agility">Agility home</Link>
      <Link href="/electrolyte">Electrolyte home</Link>
    </div>
    <Link href="/agent/work" data-core-function="agent-work" className="fixed bottom-60 right-4 z-30 inline-flex items-center gap-2 rounded-full border border-pink-300/25 bg-[#160b11]/95 px-4 py-3 text-[10px] font-black uppercase tracking-[.12em] text-pink-100 shadow-2xl backdrop-blur md:right-7">
      <BriefcaseBusiness className="h-4 w-4"/>Agent Work · Agility · Electrolyte · Commission · Daisy Pastries
    </Link>
    <Link href="/agent/distribution" data-core-function="agent-distribution" className="fixed bottom-40 right-4 z-30 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-[#07141a]/95 px-4 py-3 text-[10px] font-black uppercase tracking-[.12em] text-cyan-100 shadow-2xl backdrop-blur md:right-7">
      <Truck className="h-4 w-4"/>Distribution Route · Supply Outlets
    </Link>
    <Link href="/referrals" data-core-function="referral-movement" className="fixed bottom-24 right-4 z-30 inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-[#071711]/95 px-4 py-3 text-[10px] font-black uppercase tracking-[.12em] text-emerald-100 shadow-2xl backdrop-blur md:right-7">
      <Share2 className="h-4 w-4"/>Referral Movement · ₦500
    </Link>
  </>
}
