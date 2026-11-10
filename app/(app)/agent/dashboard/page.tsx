'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BriefcaseBusiness, Share2, Truck } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { WeaveDashboardWorld } from '@/components/world/weave-dashboard-world'
import { AgentWorkplace } from '@/components/agent/agent-workplace'
import { ArrowLeft } from 'lucide-react'
import { AgilityAgentLoginAd, AGILITY_AGENT_LOGIN_AD_KEY } from '@/components/agility-agent-login-ad'
import { Loop1AgentLoginAd, LOOP1_AGENT_LOGIN_AD_KEY } from '@/components/agent/loop1-agent-login-ad'
import { ManagerLifestyleEntry } from '@/components/manager-lifestyle-entry'
import { RegionalSystemSwitchGate } from '@/components/weave/regional-system-switch-gate'
import { useRouter } from 'next/navigation'

export default function AgentWorld() {
  const { user } = useAuth()
  const router = useRouter()
  const [originalWorld,setOriginalWorld]=useState(false)
  const [showLoop1Ad,setShowLoop1Ad]=useState(false)
  const [showAgilityAd,setShowAgilityAd]=useState(false)
  const [agilityQueued,setAgilityQueued]=useState(false)
  const [loginNotice,setLoginNotice]=useState<'loop1'|'agility'|null>(null)

  useEffect(()=>{
    if(!user)return
    if(user.role!=='agent'){router.replace('/dashboard');return}
    const loop=sessionStorage.getItem(LOOP1_AGENT_LOGIN_AD_KEY)==='1'
    const agility=sessionStorage.getItem(AGILITY_AGENT_LOGIN_AD_KEY)==='1'
    if(loop)sessionStorage.removeItem(LOOP1_AGENT_LOGIN_AD_KEY)
    if(agility)sessionStorage.removeItem(AGILITY_AGENT_LOGIN_AD_KEY)
    // A login announcement must never cover the Agent's first working screen.
    // Keep the existing detailed notices available only when the Agent chooses to read them.
    if(loop){setLoginNotice('loop1');setAgilityQueued(agility)}
    else if(agility)setLoginNotice('agility')
  },[user,router])

  if(!user||user.role!=='agent')return null

  return <>
    <Loop1AgentLoginAd
      open={showLoop1Ad}
      onOpenChange={open=>{setShowLoop1Ad(open);if(!open&&agilityQueued){setAgilityQueued(false);setShowAgilityAd(true)}}}
      onOpenContinuance={()=>{setShowLoop1Ad(false);router.push('/agent/commissions')}}
    />
    <AgilityAgentLoginAd open={showAgilityAd} onOpenChange={setShowAgilityAd} onBuy={()=>{setShowAgilityAd(false);router.push('/agility')}} />
    {loginNotice&&<aside data-agent-login-notice="non-blocking" aria-label="Stability company update"
      className="relative z-10 mx-auto mt-3 flex w-[calc(100%-1.5rem)] max-w-5xl flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-300/30 bg-[#102a3d] px-4 py-3 text-white shadow-md">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-sky-200">Administrations · A Time · Stability update</p>
        <p className="mt-1 text-sm text-slate-100">{loginNotice==='loop1'
          ? 'Your Burning River commission briefing is available. Continue your work now or read the update.'
          : 'Your Agility distribution briefing is available. Continue your work now or read the update.'}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button type="button" className="rounded-lg border border-white/25 px-3 py-2 text-xs font-semibold" onClick={()=>setLoginNotice(null)}>Later</button>
        <button type="button" className="rounded-lg bg-sky-200 px-3 py-2 text-xs font-bold text-[#102a3d]"
          onClick={()=>{const kind=loginNotice;setLoginNotice(null);if(kind==='loop1')setShowLoop1Ad(true);else setShowAgilityAd(true)}}>Read update</button>
      </div>
    </aside>}
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
