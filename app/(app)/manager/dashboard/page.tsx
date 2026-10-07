'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, BriefcaseBusiness, CalendarClock, CheckCircle2, Copy, FileSignature, LockKeyhole, Megaphone, Share2, Target, Users } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ManagerDashboardPage(){
  const {user,token,isInitialized,isLoading}=useAuth()
  const router=useRouter()
  const [state,setState]=useState<any>(null)
  const [terms,setTerms]=useState<any>(null)
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const [accepted,setAccepted]=useState(false)
  const [signature,setSignature]=useState('')
  const [copied,setCopied]=useState(false)

  const load=async()=>{
    if(!token)return
    const response=await fetch('/api/manager/employment',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
    const data=await response.json()
    if(!response.ok)throw new Error(data.error||'Unable to load Distribution Manager Lifestyle.')
    setState(data.state);setTerms(data.terms||null)
  }

  useEffect(()=>{
    if(!isInitialized||isLoading)return
    if(!user||!['agent','bridger'].includes(user.role||'')){router.replace('/login');return}
    load().catch(err=>setError(err instanceof Error?err.message:'Unable to load Distribution Manager Lifestyle.'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[user,token,isInitialized,isLoading,router])

  const subscribe=async()=>{
    if(!token)return
    setBusy(true);setError('')
    try{
      const response=await fetch('/api/manager/employment',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action:'subscribe_continuance'})})
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'Monthly position subscription could not be activated.')
      setState(data.state)
    }catch(err){setError(err instanceof Error?err.message:'Monthly position subscription could not be activated.')}
    finally{setBusy(false)}
  }

  const acceptDocument=async()=>{
    if(!token||!user)return
    if(!accepted){setError('Accept the Distribution Manager Lifestyle document to begin probation.');return}
    if(signature.trim().toLowerCase()!==String(user.name||'').trim().toLowerCase()){setError('Type your full account name exactly as your signature.');return}
    setBusy(true);setError('')
    try{
      const response=await fetch('/api/manager/employment',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action:'accept_document',accepted:true,documentVersion:terms?.documentVersion||2,signature:signature.trim()})})
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'Distribution Manager Lifestyle could not begin.')
      setState(data.state)
    }catch(err){setError(err instanceof Error?err.message:'Distribution Manager Lifestyle could not begin.')}
    finally{setBusy(false)}
  }

  const probationEnd=state?.employment?.probation_ends_at?new Date(state.employment.probation_ends_at):null
  const daysRemaining=useMemo(()=>probationEnd?Math.max(0,Math.ceil((probationEnd.getTime()-Date.now())/86400000)):0,[state?.employment?.probation_ends_at])
  const sharePath=state?.referralCode?`/register?ref=${encodeURIComponent(state.referralCode)}`:''
  const copyReferral=async()=>{if(!sharePath)return;try{await navigator.clipboard.writeText(`${window.location.origin}${sharePath}`);setCopied(true);window.setTimeout(()=>setCopied(false),1500)}catch{}}

  if(!isInitialized||isLoading||(!state&&!error))return <div className="flex min-h-[520px] items-center justify-center text-xs font-black uppercase tracking-widest text-amber-200">Restoring Distribution Manager Lifestyle…</div>
  if(error&&!state)return <main className="mx-auto max-w-3xl px-4 py-12"><div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-200">{error}</div></main>

  if(!state?.continuance?.active){
    const roleLabel=user?.role==='agent'?'Agent':'Bridger'
    return <main className="mx-auto max-w-3xl px-4 py-12" data-distribution-manager-lifestyle-locked="position-subscription">
      <section className="rounded-3xl border border-amber-300/20 bg-amber-300/[.035] p-6 md:p-8">
        <LockKeyhole className="h-8 w-8 text-amber-300"/>
        <p className="mt-4 text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Distribution Manager Lifestyle</p>
        <h1 className="mt-2 text-3xl font-black text-white">Your {roleLabel} monthly subscription opens Lifestyle.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">Distribution Manager does not have a second subscription. It is a WEAVE employment Lifestyle available to Agent and Bridger positions while their existing monthly position subscription is active.</p>
        {error&&<p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</p>}
        <div className="mt-6 grid gap-3 sm:grid-cols-3"><Metric icon={<BriefcaseBusiness className="h-4 w-4"/>} label="Distribution Manager salary" value="₦70,000/mo"/><Metric icon={<Target className="h-4 w-4"/>} label="Probation target" value="300"/><Metric icon={<CalendarClock className="h-4 w-4"/>} label="Probation" value="1 month"/></div>
        <Button onClick={subscribe} disabled={busy} className="mt-6 w-full bg-amber-600 font-black uppercase tracking-wider hover:bg-amber-700">{busy?'Renewing monthly subscription…':`Renew ${roleLabel} monthly subscription · ₦${Number(terms?.positionSubscriptionNgn||terms?.continuanceNgn||5000).toLocaleString('en-NG')}`}</Button>
        <p className="mt-3 text-center text-[10px] text-slate-500">This renews your underlying {roleLabel} subscription and therefore all Lifestyle access allowed by that position. It is not a Distribution Manager-only charge.</p>
      </section>
    </main>
  }

  if(!state?.employment||state.employment.status==='ended'){
    return <main className="mx-auto max-w-3xl px-4 py-10" data-distribution-manager-lifestyle-document="true">
      <section className="rounded-3xl border border-cyan-300/15 bg-cyan-300/[.025] p-6 md:p-8">
        <div className="flex items-center gap-2 text-cyan-300"><FileSignature className="h-5 w-5"/><p className="text-[10px] font-black uppercase tracking-[.2em]">Distribution Manager Lifestyle Document</p></div>
        <h1 className="mt-3 text-3xl font-black text-white">{user?.name}</h1>
        <p className="mt-2 text-sm text-slate-400">Your underlying WEAVE position remains {String(user?.role||'').toUpperCase()}. Distribution Manager is a Lifestyle carried through that identity while the same monthly position subscription remains active.</p>
        {error&&<p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</p>}
        <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm leading-6 text-slate-300">
          <p><strong className="text-white">Probation.</strong> Acceptance begins Day 1. Probation lasts one calendar month.</p>
          <p><strong className="text-white">Core duty.</strong> Distribute WEAVE across public channels, carry verified Agent and Bridger acquisition, coordinate campaigns and return distribution records to Administration.</p>
          <p><strong className="text-white">Field organization.</strong> Help Bridgers carry Prospect-to-Client movement and help Agents carry WEAVE distribution through their existing positions.</p>
          <p><strong className="text-white">Estimate.</strong> 300 verified Agent or Bridger registrations during the probation month.</p>
          <p><strong className="text-white">Salary.</strong> ₦70,000 monthly. Referral bonus remains separate.</p>
          <p><strong className="text-white">Lifestyle access.</strong> Distribution Manager is covered by the active Agent or Bridger monthly subscription. Expiry closes this Lifestyle while preserving the person’s underlying WEAVE role.</p>
        </div>
        <label className="mt-5 flex items-start gap-3 rounded-xl border border-white/10 p-3 text-xs text-slate-300"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} className="mt-1"/><span>I accept the Distribution Manager Lifestyle document and understand that acceptance begins my one-month probation.</span></label>
        <Input className="mt-4 border-slate-700 bg-slate-900/50" value={signature} onChange={e=>setSignature(e.target.value)} placeholder={user?.name||'Full account name'}/>
        <Button onClick={acceptDocument} disabled={busy||!accepted} className="mt-4 w-full bg-cyan-700 font-black uppercase tracking-wider hover:bg-cyan-600">{busy?'Recording…':<><CheckCircle2 className="mr-2 h-4 w-4"/>Accept · Begin Distribution Manager Lifestyle</>}</Button>
      </section>
    </main>
  }

  const employment=state.employment
  const statusLabel=employment.status==='probation'?'Probation':employment.status==='active'?'Active Distribution Manager':'Ended'
  return <main className="mx-auto max-w-6xl px-4 py-8 md:px-7 md:py-12" data-distribution-manager-lifestyle-room="true">
    <header className="border-b border-white/10 pb-6"><div className="flex flex-wrap items-start justify-between gap-5"><div><div className="flex items-center gap-2 text-amber-300"><BriefcaseBusiness className="h-5 w-5"/><p className="text-[10px] font-black uppercase tracking-[.2em]">WEAVE Distribution Manager Lifestyle</p></div><h1 className="mt-2 text-3xl font-black text-white">{user?.name}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Distribution Manager carries outward company distribution while your original {String(employment.source_role||user?.role).toUpperCase()} identity, referral movement and base-role responsibilities remain intact.</p></div><div className="rounded-2xl border border-amber-300/20 bg-amber-300/[.05] px-4 py-3 text-right"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Lifestyle standing</p><p className="mt-1 font-black text-amber-200">{statusLabel}</p><p className="mt-1 text-[9px] text-emerald-300">Position subscription active</p></div></div></header>
    <section className="mt-7 grid gap-4 md:grid-cols-4"><Metric icon={<CalendarClock className="h-4 w-4"/>} label="Probation remaining" value={employment.status==='probation'?`${daysRemaining} days`:statusLabel}/><Metric icon={<Target className="h-4 w-4"/>} label="Acquisition estimate" value={`${state.successfulReferrals} / ${state.target}`}/><Metric icon={<Users className="h-4 w-4"/>} label="Remaining" value={String(state.remaining)}/><Metric icon={<BriefcaseBusiness className="h-4 w-4"/>} label="Monthly salary" value={`₦${Number(state.monthlySalaryNgn||70000).toLocaleString('en-NG')}`}/></section>
    <section className="mt-6 rounded-2xl border border-emerald-300/15 bg-emerald-300/[.035] p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-emerald-300">Core duty · Distribute WEAVE</p><h2 className="mt-1 text-xl font-black text-white">Carry WEAVE outward and return the movement.</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-slate-400">Use public distribution, campaign tools and field coordination to create measurable movement. The probation acquisition estimate counts verified Agent or Bridger registrations attributed to your referral identity from document acceptance.</p></div><div className="min-w-[180px]"><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-emerald-300" style={{width:`${state.progressPercent}%`}}/></div><p className="mt-2 text-right text-xs font-black text-emerald-200">{state.progressPercent}%</p></div></div></section>
    <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_.8fr]"><div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[.035] p-5"><div className="flex items-center gap-2"><Share2 className="h-4 w-4 text-cyan-300"/><p className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">Distribution acquisition record</p></div><p className="mt-3 text-xs text-slate-400">Each qualifying verified Agent or Bridger referral keeps the staff referral bonus. Salary and referral bonus are separate; referral attribution is one measurable part of the broader Distribution Manager work.</p><div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3"><p className="break-all font-mono text-sm font-black text-white">{state.referralCode||'Resolving referral identity'}</p></div><div className="mt-3 grid gap-2 sm:grid-cols-2"><Button onClick={copyReferral} variant="outline" className="border-cyan-300/20 bg-cyan-300/[.04] text-cyan-100"><Copy className="mr-2 h-4 w-4"/>{copied?'Referral link copied':'Copy referral link'}</Button><Button asChild variant="outline" className="border-cyan-300/20 bg-cyan-300/[.04] text-cyan-100"><Link href="/referrals">Open Referral Record<ArrowRight className="ml-2 h-4 w-4"/></Link></Button></div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl border border-white/10 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-500">Per verified referral</p><p className="mt-1 text-lg font-black text-white">₦{Number(state.referralBonusNgn||500).toLocaleString('en-NG')}</p></div><div className="rounded-xl border border-white/10 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-500">Referral bonus record</p><p className="mt-1 text-lg font-black text-white">₦{Number(state.totalReferralBonusNgn||0).toLocaleString('en-NG')}</p></div></div></div><div className="rounded-2xl border border-amber-300/15 bg-amber-300/[.035] p-5"><div className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-amber-300"/><p className="text-[9px] font-black uppercase tracking-[.18em] text-amber-300">Distribution instruments</p></div><div className="mt-4 divide-y divide-white/10">{[['/distribution-studio','Distribution Studio','Plan and operate outward social distribution.'],['/video-ad-studio','Video Ad Studio','Produce WEAVE and customer campaign video.'],['/referrals','Referral Movement','Track attributed Agent and Bridger acquisition.'],['/event','Flame Event','Carry the current live WEAVE movement outward.']].map(([href,label,detail])=><Link key={href} href={href} className="group flex items-center justify-between gap-3 py-3"><span><span className="block text-sm font-black text-white">{label}</span><span className="mt-1 block text-[10px] text-slate-500">{detail}</span></span><ArrowRight className="h-4 w-4 text-slate-600 transition group-hover:translate-x-1 group-hover:text-amber-200"/></Link>)}</div></div></section>
    <footer className="mt-8 flex flex-wrap gap-3 border-t border-white/10 pt-5 text-xs"><Link href={user?.role==='agent'?'/agent/dashboard':'/bridger/dashboard'} className="text-sky-300">Return to {user?.role==='agent'?'Agent':'Bridger'} world</Link><span className="text-slate-700">·</span><Link href="/weave/lifestyles" className="text-yellow-300">Lifestyle</Link><span className="text-slate-700">·</span><span className="text-slate-500">Document accepted {new Date(employment.document_accepted_at).toLocaleDateString('en-NG')} · Probation ends {new Date(employment.probation_ends_at).toLocaleDateString('en-NG')}</span></footer>
  </main>
}

function Metric({icon,label,value}:{icon:ReactNode,label:string,value:string}){return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="flex items-center gap-2 text-slate-500">{icon}<p className="text-[9px] font-black uppercase tracking-widest">{label}</p></div><p className="mt-3 text-xl font-black text-white">{value}</p></div>}
