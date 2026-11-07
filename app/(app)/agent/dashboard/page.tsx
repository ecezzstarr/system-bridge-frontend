'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BriefcaseBusiness, Share2, Truck } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { WeaveDashboardWorld } from '@/components/world/weave-dashboard-world'
import { AgentWorkplace } from '@/components/agent/agent-workplace'
import { ArrowLeft } from 'lucide-react'
import { AgilityAgentLoginAd } from '@/components/agility-agent-login-ad'
import { Loop1AgentLoginAd } from '@/components/agent/loop1-agent-login-ad'
import { ManagerLifestyleEntry } from '@/components/manager-lifestyle-entry'
import { useRouter } from 'next/navigation'

export default function AgentWorld() {
  const { user } = useAuth()
  const router = useRouter()
  const [originalWorld,setOriginalWorld]=useState(false)
  const [briefing, setBriefing] = useState<'commissions' | 'distribution' | null>(null)

  useEffect(() => {
    if (user && user.role !== 'agent') router.replace('/dashboard')
  }, [user, router])

  if(!user||user.role!=='agent')return null

  return <>
    <Loop1AgentLoginAd
      open={briefing === 'commissions'}
      onOpenChange={open => { if (!open) setBriefing(null) }}
      onOpenContinuance={()=>{setBriefing(null);router.push('/agent/commissions')}}
    />
    <AgilityAgentLoginAd
      open={briefing === 'distribution'}
      onOpenChange={open => { if (!open) setBriefing(null) }}
      onBuy={()=>{setBriefing(null);router.push('/agility')}}
    />
    {originalWorld ? (
      <div data-agent-original-district-world="preserved">
        <button type="button" onClick={()=>setOriginalWorld(false)}
          className="relative z-30 m-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-300/40 bg-[#142334] px-4 py-2 text-sm font-semibold text-amber-100">
          <ArrowLeft className="h-4 w-4"/> Return to Work Desk
        </button>
        <WeaveDashboardWorld role="agent" userName={user.name} />
      </div>
    ) : (
      <AgentWorkplace userName={user.name} onOpenDistricts={()=>setOriginalWorld(true)} onOpenBriefing={setBriefing} />
    )}
    <ManagerLifestyleEntry />
    <div className="sr-only focus-within:not-sr-only">
      <Link href="/agility">Agility home</Link>
      <Link href="/electrolyte">Electrolyte home</Link>
    </div>
    <nav aria-label="Agent shortcuts" className="mx-auto flex w-full max-w-[1580px] flex-wrap gap-2 px-4 pb-12 sm:px-8 lg:px-12">
      <Link href="/agent/work" data-core-function="agent-work" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#d0b783] bg-[#fffefa] px-4 py-2 text-sm font-semibold text-[#493b26]">
        <BriefcaseBusiness className="h-4 w-4 shrink-0"/> <span>Agent Work · Agility · Electrolyte · Commission · Daisy Pastries</span>
      </Link>
      <Link href="/agent/distribution" data-core-function="agent-distribution" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#d0b783] bg-[#fffefa] px-4 py-2 text-sm font-semibold text-[#493b26]">
        <Truck className="h-4 w-4 shrink-0"/> Distribution Route
      </Link>
      <Link href="/referrals" data-core-function="referral-movement" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#d0b783] bg-[#fffefa] px-4 py-2 text-sm font-semibold text-[#493b26]">
        <Share2 className="h-4 w-4 shrink-0"/> Referral Movement · ₦500
      </Link>
    </nav>
  </>
}
