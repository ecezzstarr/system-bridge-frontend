'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, BriefcaseBusiness, CalendarClock, Copy, Megaphone, Share2, Target, Users } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'

export default function ManagerDashboardPage(){
  const {user,token,isInitialized,isLoading}=useAuth()
  const router=useRouter()
  const [state,setState]=useState<any>(null)
  const [error,setError]=useState('')
  const [copied,setCopied]=useState(false)

  useEffect(()=>{
    if(!isInitialized||isLoading)return
    if(!user||!['agent','bridger'].includes(user.role||'')){router.replace('/manager/login');return}
    if(!token)return
    fetch('/api/manager/employment',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
      .then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||'Unable to load Manager employment.');if(!data.state){router.replace('/manager/register');return}setState(data.state)})
      .catch(err=>setError(err instanceof Error?err.message:'Unable to load Manager employment.'))
  },[user,token,isInitialized,isLoading,router])

  const probationEnd=state?.employment?.probation_ends_at?new Date(state.employment.probation_ends_at):null
  const daysRemaining=useMemo(()=>probationEnd?Math.max(0,Math.ceil((probationEnd.getTime()-Date.now())/86400000)):0,[state?.employment?.probation_ends_at])
  const sharePath=state?.referralCode?`/register?ref=${encodeURIComponent(state.referralCode)}`:''

  const copyReferral=async()=>{
    if(!sharePath)return
    try{await navigator.clipboard.writeText(`${window.location.origin}${sharePath}`);setCopied(true);window.setTimeout(()=>setCopied(false),1500)}catch{}
  }

  if(!isInitialized||isLoading||(!state&&!error))return <div className="flex min-h-[520px] items-center justify-center text-xs font-black uppercase tracking-widest text-amber-200">Restoring Manager employment…</div>

  if(error)return <main className="mx-auto max-w-3xl px-4 py-12"><div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-200">{error}</div></main>

  const employment=state.employment
  const statusLabel=employment.status==='probation'?'Probation':employment.status==='review_due'?'Administration Review Due':employment.status==='active'?'Active Manager':'Ended'

  return <main className="mx-auto max-w-6xl px-4 py-8 md:px-7 md:py-12" data-manager-employment-room="true">
    <header className="border-b border-white/10 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div><div className="flex items-center gap-2 text-amber-300"><BriefcaseBusiness className="h-5 w-5"/><p className="text-[10px] font-black uppercase tracking-[.2em]">WEAVE Manager Employment</p></div><h1 className="mt-2 text-3xl font-black text-white">{user?.name}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Manager carries marketing responsibility while your original {String(employment.source_role||user?.role).toUpperCase()} identity, referral code and role access remain intact.</p></div>
        <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[.05] px-4 py-3 text-right"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Employment standing</p><p className="mt-1 font-black text-amber-200">{statusLabel}</p></div>
      </div>
    </header>

    <section className="mt-7 grid gap-4 md:grid-cols-4">
      <Metric icon={<CalendarClock className="h-4 w-4"/>} label="Probation remaining" value={employment.status==='probation'?`${daysRemaining} days`:statusLabel}/>
      <Metric icon={<Target className="h-4 w-4"/>} label="First-month estimate" value={`${state.successfulReferrals} / ${state.target}`}/>
      <Metric icon={<Users className="h-4 w-4"/>} label="Remaining to estimate" value={String(state.remaining)}/>
      <Metric icon={<BriefcaseBusiness className="h-4 w-4"/>} label="Monthly salary" value={`₦${Number(state.monthlySalaryNgn||150000).toLocaleString('en-NG')}`}/>
    </section>

    <section className="mt-6 rounded-2xl border border-emerald-300/15 bg-emerald-300/[.035] p-5">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-emerald-300">Core duty · Marketing WEAVE</p><h2 className="mt-1 text-xl font-black text-white">Carry Agents and Bridgers into WEAVE.</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-slate-400">Probation performance counts verified Agent or Bridger registrations attributed to your referral identity from the moment you accepted the employment document.</p></div><div className="min-w-[180px]"><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-emerald-300" style={{width:`${state.progressPercent}%`}}/></div><p className="mt-2 text-right text-xs font-black text-emerald-200">{state.progressPercent}%</p></div></div>
    </section>

    <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
      <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[.035] p-5"><div className="flex items-center gap-2"><Share2 className="h-4 w-4 text-cyan-300"/><p className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">Manager Referral Movement</p></div><p className="mt-3 text-xs text-slate-400">Each qualifying verified Agent or Bridger referral keeps the current staff referral bonus. Salary and referral bonus are separate.</p><div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3"><p className="break-all font-mono text-sm font-black text-white">{state.referralCode||'Resolving referral identity'}</p></div><div className="mt-3 grid gap-2 sm:grid-cols-2"><Button onClick={copyReferral} variant="outline" className="border-cyan-300/20 bg-cyan-300/[.04] text-cyan-100"><Copy className="mr-2 h-4 w-4"/>{copied?'Referral link copied':'Copy referral link'}</Button><Button asChild variant="outline" className="border-cyan-300/20 bg-cyan-300/[.04] text-cyan-100"><Link href="/referrals">Open Referral Record<ArrowRight className="ml-2 h-4 w-4"/></Link></Button></div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl border border-white/10 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-500">Per verified referral</p><p className="mt-1 text-lg font-black text-white">₦{Number(state.referralBonusNgn||500).toLocaleString('en-NG')}</p></div><div className="rounded-xl border border-white/10 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-500">Referral bonus record</p><p className="mt-1 text-lg font-black text-white">₦{Number(state.totalReferralBonusNgn||0).toLocaleString('en-NG')}</p></div></div></div>

      <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[.035] p-5"><div className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-amber-300"/><p className="text-[9px] font-black uppercase tracking-[.18em] text-amber-300">Marketing instruments</p></div><div className="mt-4 divide-y divide-white/10">{[
        ['/distribution-studio','Social Presence','Plan and schedule outward social movement.'],
        ['/video-ad-studio','Video Ad Studio','Produce WEAVE and customer-facing campaign video.'],
        ['/referrals','Referral Movement','Track attributed Agent and Bridger acquisition.'],
        ['/event','Flame Event','Carry current live WEAVE movement.'],
      ].map(([href,label,detail])=><Link key={href} href={href} className="group flex items-center justify-between gap-3 py-3"><span><span className="block text-sm font-black text-white">{label}</span><span className="mt-1 block text-[10px] text-slate-500">{detail}</span></span><ArrowRight className="h-4 w-4 text-slate-600 transition group-hover:translate-x-1 group-hover:text-amber-200"/></Link>)}</div></div>
    </section>

    <footer className="mt-8 flex flex-wrap gap-3 border-t border-white/10 pt-5 text-xs"><Link href={user?.role==='agent'?'/agent/dashboard':'/bridger/dashboard'} className="text-sky-300">Return to {user?.role==='agent'?'Agent':'Bridger'} world</Link><span className="text-slate-700">·</span><span className="text-slate-500">Document accepted {new Date(employment.document_accepted_at).toLocaleDateString('en-NG')} · Probation ends {new Date(employment.probation_ends_at).toLocaleDateString('en-NG')}</span></footer>
  </main>
}

function Metric({icon,label,value}:{icon:React.ReactNode,label:string,value:string}){return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="flex items-center gap-2 text-slate-500">{icon}<p className="text-[9px] font-black uppercase tracking-widest">{label}</p></div><p className="mt-3 text-xl font-black text-white">{value}</p></div>}
