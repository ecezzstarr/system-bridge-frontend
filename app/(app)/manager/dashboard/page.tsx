'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, BriefcaseBusiness, CalendarClock, CheckCircle2, Copy, FileSignature, LockKeyhole, Megaphone, Share2, Target, Users } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DistributionTeamWorkspace } from '@/components/distribution/team-workspace'
import { EmploymentActions } from '@/components/employment/employment-actions'

export default function ManagerDashboardPage(){
  const {user,token,isInitialized,isLoading}=useAuth()
  const router=useRouter()
  const [state,setState]=useState<any>(null)
  const [assistantState,setAssistantState]=useState<any>(null)
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
    const assistants=await fetch('/api/manager/assistant',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'}).catch(()=>null)
    if(assistants?.ok){
      try{const body=await assistants.json();setAssistantState(body.state)}
      catch(error){console.error('[distribution-manager] assistant report unavailable',error)}
    }
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
      const response=await fetch('/api/manager/employment',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action:'buy_agentic_bridger'})})
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'Agentic-Bridger purchase could not be completed.')
      setState(data.state)
    }catch(err){setError(err instanceof Error?err.message:'Agentic-Bridger purchase could not be completed.')}
    finally{setBusy(false)}
  }

  const acceptDocument=async()=>{
    if(!token||!user)return
    if(!accepted){setError('Accept the Distribution Manager Lifestyle document for Administration verification.');return}
    if(signature.trim().toLowerCase()!==String(user.name||'').trim().toLowerCase()){setError('Type your full account name exactly as your signature.');return}
    setBusy(true);setError('')
    try{
      const response=await fetch('/api/manager/employment',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action:'accept_document',accepted:true,documentVersion:terms?.documentVersion||3,signature:signature.trim()})})
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'Distribution Manager application could not be recorded.')
      setState(data.state)
    }catch(err){setError(err instanceof Error?err.message:'Distribution Manager application could not be recorded.')}
    finally{setBusy(false)}
  }

  const reviewAssistant=async(applicantId:string,action:'approve'|'reject')=>{
    if(!token)return
    setBusy(true);setError('')
    try{
      const response=await fetch('/api/manager/assistant',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({action,applicantId})})
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Assistant review unavailable')
      setAssistantState(body.state)
    }catch(err){setError(err instanceof Error?err.message:'Assistant review unavailable')}
    finally{setBusy(false)}
  }

  const probationEnd=state?.employment?.probation_ends_at?new Date(state.employment.probation_ends_at):null
  const daysRemaining=useMemo(()=>probationEnd?Math.max(0,Math.ceil((probationEnd.getTime()-Date.now())/86400000)):0,[state?.employment?.probation_ends_at])
  const sharePath=state?.referralCode?`/register?ref=${encodeURIComponent(state.referralCode)}`:''
  const copyReferral=async()=>{if(!sharePath)return;try{await navigator.clipboard.writeText(`${window.location.origin}${sharePath}`);setCopied(true);window.setTimeout(()=>setCopied(false),1500)}catch{}}
  const agentFree=user?.role==='agent'

  if(!isInitialized||isLoading||(!state&&!error))return <div className="flex min-h-[520px] items-center justify-center text-xs font-black uppercase tracking-widest text-amber-200">Restoring Distribution Manager Lifestyle…</div>
  if(error&&!state)return <main className="mx-auto max-w-3xl px-4 py-12"><div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-200">{error}</div></main>

  if(!state?.continuance?.active){
    const roleLabel=agentFree?'Agent':'Bridger'
    return <main className="mx-auto max-w-3xl px-4 py-12" data-distribution-manager-lifestyle-locked={agentFree?'agent-position':'agentic-bridger'}>
      <section className="rounded-3xl border border-amber-300/20 bg-amber-300/[.035] p-6 md:p-8">
        <LockKeyhole className="h-8 w-8 text-amber-300"/>
        <p className="mt-4 text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Distribution Manager Lifestyle</p>
        <h1 className="mt-2 text-3xl font-black text-white">{agentFree?'Your Agent account must be active.':'Attain Agentic-Bridger to enable Lifestyle.'}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">{agentFree?'Agents use WEAVE Lifestyle, Ace and Distribution Manager through the Agent company position with no monthly subscription. Restore the Agent account position to continue.':'Pay 20 Flame Coin once to attain Agentic-Bridger. Agentic-Bridger enables Lifestyle and applications for eligible employment positions; appointments require separate approval. No monthly subscription.'}</p>
        {error&&<p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</p>}
        {state?.employment&&<EmploymentActions position="distribution_manager" onStatusChange={()=>void load()}/>}
        <div className="mt-6 grid gap-3 sm:grid-cols-2"><Metric icon={<Target className="h-4 w-4"/>} label="Company distribution" value="Team outreach"/><Metric icon={<CalendarClock className="h-4 w-4"/>} label="Employment document" value="Terms after access"/></div>
        {agentFree?<Button asChild className="mt-6 w-full bg-amber-600 font-black uppercase tracking-wider hover:bg-amber-700"><Link href="/agent/dashboard">RETURN TO AGENT POSITION</Link></Button>:<><Button onClick={subscribe} disabled={busy} className="mt-6 w-full bg-amber-600 font-black uppercase tracking-wider hover:bg-amber-700">{busy?'Activating Agentic-Bridger…':'Attain Agentic-Bridger · 20 Flame Coin once'}</Button><p className="mt-3 text-center text-[10px] text-slate-500">Agentic-Bridger attainment costs 20 Flame Coin once. It is not a recurring subscription or automatic Manager employment.</p></>}
      </section>
    </main>
  }

  if(!state?.employment||['ended','rejected'].includes(state.employment.status)){
    return <main className="mx-auto max-w-3xl px-4 py-10" data-distribution-manager-lifestyle-document="true">
      <section className="rounded-3xl border border-cyan-300/15 bg-cyan-300/[.025] p-6 md:p-8">
        <div className="flex items-center gap-2 text-cyan-300"><FileSignature className="h-5 w-5"/><p className="text-[10px] font-black uppercase tracking-[.2em]">Distribution Manager Lifestyle Document</p></div>
        <h1 className="mt-3 text-3xl font-black text-white">{user?.name}</h1>
        {['ended','rejected'].includes(state?.employment?.status||'')&&<EmploymentActions position="distribution_manager" onStatusChange={()=>void load()}/>}
        {state?.employment?.status==='rejected'&&<p className="mt-3 border border-rose-300/25 p-3 text-xs text-rose-200">Administration did not approve the previous application. {state.employment.verification_note||'You may sign a new application after reviewing the requirements.'}</p>}
        <p className="mt-2 text-sm text-slate-400">Your underlying WEAVE position remains {String(user?.role||'').toUpperCase()}. {agentFree?'As an Agent, Distribution Manager is carried through your active Agent position with no monthly subscription.':'Distribution Manager access is permanently available through your purchased Agentic-Bridger identity.'}</p>
        {error&&<p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</p>}
        <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm leading-6 text-slate-300">
          <p><strong className="text-white">Administration verification.</strong> Signing submits your application for review. One-month probation begins only when Administration verifies the appointment, not when you sign.</p>
          <p><strong className="text-white">Core duty.</strong> Distribute WEAVE across public channels, carry verified Agent and Bridger acquisition, coordinate campaigns and return distribution records to Administration.</p>
          <p><strong className="text-white">Field organization.</strong> Help Bridgers carry Prospect-to-Client movement and help Agents carry WEAVE distribution through their existing positions.</p>
          <p><strong className="text-white">Team authority.</strong> After verification, you select up to two Assistant Distribution Managers. Coordinate plans, responsibilities and handoffs directly in the team communication workspace. Distribution Studio and existing WEAVE campaign tools perform the work.</p>
          <p><strong className="text-white">Administration oversight.</strong> Administration reviews your signed appointment, verified referrals and team reports, but does not join or overwrite internal team messages. Normal institutional compliance and payment approvals remain in force.</p>
          <p><strong className="text-white">Monthly target.</strong> 300 verified Agent or Bridger referrals shared by the Manager and up to two appointed assistants in their first one-month probation period, then 500 each subsequent team employment month. No separate individual quota.</p>
          <p><strong className="text-white">Salary condition.</strong> ₦70,000 full monthly salary when the team reaches 300 verified referrals in the first probation month, or 500 in a later team employment month. Below the applicable target, receive only ₦500 for each qualifying referral you personally made; no full salary. Salary requires month-end payroll verification and referral bonuses are never paid twice.</p>
          <p><strong className="text-white">Lifestyle access.</strong> {agentFree?'Agent position access is free. Distribution Manager remains open while the Agent account is active.':'The one-time 20 Flame Coin payment attains Agentic-Bridger, which enables Lifestyle access permanently while your Bridger position remains eligible and active. Employment still requires approval.'}</p>
        </div>
        <label className="mt-5 flex items-start gap-3 rounded-xl border border-white/10 p-3 text-xs text-slate-300"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} className="mt-1"/><span>I accept the Distribution Manager Lifestyle document and understand that Administration must approve the signed application before probation begins.</span></label>
        <label htmlFor="distribution-manager-signature" className="mt-4 block text-sm font-semibold text-white">Sign with your full account name</label>
        <Input id="distribution-manager-signature" name="signature" type="text" autoComplete="name" aria-label="Distribution Manager document signature" className="mt-2 min-h-12 w-full border-slate-700 bg-slate-900/50 text-white" value={signature} onChange={e=>setSignature(e.target.value)} placeholder={user?.name||'Full account name'}/>
        <Button onClick={acceptDocument} disabled={busy||!accepted} className="mt-4 w-full bg-cyan-700 font-black uppercase tracking-wider hover:bg-cyan-600">{busy?'Recording…':<><CheckCircle2 className="mr-2 h-4 w-4"/>Accept · Request Administration Verification</>}</Button>
      </section>
    </main>
  }

  if(state.employment.status==='pending_verification') {
    return <main className="mx-auto max-w-3xl px-4 py-10" data-distribution-manager-awaiting-administration="true">
      <section className="border border-amber-300/25 bg-amber-300/[.04] p-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-amber-200">Awaiting Administration verification</p>
        <h1 className="mt-3 text-2xl font-black text-white">Signed Distribution Manager application received</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">Administration must verify your appointment before probation, Manager pay qualification, and team-assistant hiring can begin. Your signed application is saved; your original Agent or Bridger work remains available.</p>
        <p className="mt-3 text-xs text-slate-400">Signed: {new Date(state.employment.document_accepted_at).toLocaleString('en-NG')} · Probation has not started · No Manager team actions are authorized yet.</p>
        <Button type="button" onClick={()=>load().catch(err=>setError(err.message))} className="mt-5 bg-amber-700 text-white">Refresh verification status</Button>
        {error&&<p role="alert" className="mt-3 text-xs text-rose-200">{error}</p>}
        <EmploymentActions position="distribution_manager" onStatusChange={()=>void load()}/>
        <Link href="/weave/lifestyles" className="mt-4 block text-xs text-cyan-200">Return to Lifestyle →</Link>
      </section>
    </main>
  }

  const employment=state.employment
  const statusLabel=employment.status==='probation'?'Probation':employment.status==='active'?'Active Distribution Manager':'Ended'
  return <main className="mx-auto max-w-6xl px-4 py-8 md:px-7 md:py-12" data-distribution-manager-lifestyle-room="true">
    <header className="border-b border-white/10 pb-6"><div className="flex flex-wrap items-start justify-between gap-5"><div><div className="flex items-center gap-2 text-amber-300"><BriefcaseBusiness className="h-5 w-5"/><p className="text-[10px] font-black uppercase tracking-[.2em]">WEAVE Distribution Manager Lifestyle</p></div><h1 className="mt-2 text-3xl font-black text-white">{user?.name}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Distribution Manager carries outward company distribution while your original {String(employment.source_role||user?.role).toUpperCase()} identity, referral movement and base-role responsibilities remain intact.</p></div><div className="rounded-2xl border border-amber-300/20 bg-amber-300/[.05] px-4 py-3 text-right"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Lifestyle standing</p><p className="mt-1 font-black text-amber-200">{statusLabel}</p><p className="mt-1 text-[9px] text-emerald-300">{agentFree?'Agent position access · no subscription':'Agentic-Bridger owned'}</p></div></div></header>
    {state.metricsAvailable===false&&<p role="status" className="mt-5 rounded-xl border border-amber-300/25 p-3 text-xs text-amber-100">The referral report is temporarily unavailable. Your Distribution Manager appointment remains recorded; figures below are not verified until the report returns.</p>}
    <section className="mt-7 grid gap-4 md:grid-cols-4"><Metric icon={<CalendarClock className="h-4 w-4"/>} label="Probation remaining" value={employment.status==='probation'?`${daysRemaining} days`:statusLabel}/><Metric icon={<Target className="h-4 w-4"/>} label={state.probationPeriod?"Probation team referrals":"Monthly team referrals"} value={`${state.successfulReferrals} / ${state.target}`}/><Metric icon={<Users className="h-4 w-4"/>} label="Team referrals remaining" value={String(state.remaining)}/><Metric icon={<BriefcaseBusiness className="h-4 w-4"/>} label="Potential full salary" value={`₦${Number(state.monthlySalaryNgn||70000).toLocaleString('en-NG')}`}/></section>
    <section className="mt-6 rounded-2xl border border-emerald-300/15 bg-emerald-300/[.035] p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-emerald-300">Core duty · Distribute WEAVE</p><h2 className="mt-1 text-xl font-black text-white">Carry WEAVE outward and return the movement.</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-slate-400">Use public distribution, campaign tools and field coordination to create measurable movement. The shared target is 300 referrals in your first probation month and 500 every subsequent team employment month, across you and your two assigned Assistant Distribution Managers. Each qualifying referral counts once, credited to the person who referred them after starting the position.</p></div><div className="min-w-[180px]"><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-emerald-300" style={{width:`${state.progressPercent}%`}}/></div><p className="mt-2 text-right text-xs font-black text-emerald-200">{state.progressPercent}%</p></div></div></section>
    <section className="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/[.035] p-5" data-distribution-manager-pay-rule="team-performance"><h2 className="text-sm font-black text-white">Current month · Payment qualification</h2><p className="mt-2 text-sm text-slate-300">{state.compensation?.teamQualified?'Your team has reached its applicable monthly target. Full Manager salary of ₦70,000 is provisionally eligible, subject to month-end verification and payroll approval.':'Your team has not yet reached its applicable monthly target. No full Manager salary is currently eligible; you receive only the existing ₦500 bonus for each qualifying referral you brought.'}</p><div className="mt-3 grid grid-cols-2 gap-3"><Metric icon={<BriefcaseBusiness className="h-4 w-4"/>} label="Salary eligibility (provisional)" value={`₦${Number(state.compensation?.salaryEntitlementNgn||0).toLocaleString('en-NG')}`}/><Metric icon={<Users className="h-4 w-4"/>} label="Your referral bonus value" value={`₦${Number(state.compensation?.individualReferralBonusNgn||0).toLocaleString('en-NG')}`}/></div><p className="mt-3 text-xs text-slate-500">This is a performance preview, not confirmation of a salary transfer. Referral bonus settlement is handled separately by Weave’s existing referral ledger.</p></section>
    <DistributionTeamWorkspace/>
    <EmploymentActions position="distribution_manager" onStatusChange={()=>void load()}/>
    {assistantState?.canReview&&<section className="mt-6 rounded-2xl border border-amber-300/15 bg-amber-300/[.03] p-5" data-distribution-assistant-review="true">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-[10px] font-black uppercase tracking-widest text-amber-300">Assistant Distribution Managers</p><h2 className="mt-2 text-xl font-black text-white">Your distribution support team</h2><p className="mt-2 text-sm text-slate-400">Six assistant appointments across WEAVE, two reporting to each of the three Distribution Managers. Each receives a ₦40,000 monthly salary term after appointment. Your full three-person team shares one target of 300 verified Agent/Bridger referrals in the first probation month, then 500 in subsequent team employment months. Full salaries apply only when the applicable target is met; otherwise individuals receive only their qualifying ₦500 referral bonuses.</p></div>
        <div className="rounded-xl border border-white/10 p-3 text-right text-sm font-black text-white">{assistantState.team?.length||0} / {assistantState.assistantPositionsPerManager} your team · {assistantState.employed} / {assistantState.positions} company-wide</div>
      </div>
      {error&&<p className="mt-3 text-sm text-rose-200">{error}</p>}
      <div className="mt-4 space-y-2">
        {(assistantState.team||[]).map((member:any)=><div key={member.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 p-3 text-sm"><span className="font-bold text-white">{member.name} <span className="text-xs text-slate-400">· {member.role}</span></span><span className="text-xs text-emerald-300">Appointed {new Date(member.hired_at).toLocaleDateString('en-NG')}</span></div>)}
        {!assistantState.team?.length&&<p className="text-sm text-slate-400">No assistant appointments yet.</p>}
        <div className="rounded-xl border border-emerald-300/20 p-3 text-sm text-emerald-100">Shared team progress: {state.successfulReferrals} / {state.target} verified referrals this month. Your contribution: {state.myReferrals||0}.</div>
        {(state.teamMembers||[]).map((member:any)=><div key={member.userId} className="flex items-center justify-between gap-3 border-b border-white/10 py-2 text-xs text-slate-300"><span>{member.name} · {member.position==='manager'?'Main Manager':'Assistant'}</span><span className="font-black text-emerald-200">{member.referrals} referrals</span></div>)}
      </div>
      <h3 className="mt-6 text-sm font-black text-white">Pending applications</h3>
      <div className="mt-3 space-y-3">
        {(assistantState.pending||[]).map((candidate:any)=><div key={candidate.user_id} className="rounded-xl border border-white/10 p-4">
          <p className="text-sm font-black text-white">{candidate.name} · {candidate.role}</p>
          <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-400">{candidate.application_note}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" disabled={busy||assistantState.remainingPositions===0||assistantState.managerTeamRemaining===0} onClick={()=>reviewAssistant(candidate.user_id,'approve')} className="bg-emerald-700 text-white hover:bg-emerald-600">Appoint assistant</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={()=>reviewAssistant(candidate.user_id,'reject')}>Decline</Button>
          </div>
        </div>)}
        {!assistantState.pending?.length&&<p className="text-sm text-slate-400">No applications are awaiting review.</p>}
      </div>
    </section>}
    <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_.8fr]"><div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[.035] p-5"><div className="flex items-center gap-2"><Share2 className="h-4 w-4 text-cyan-300"/><p className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">Distribution acquisition record</p></div><p className="mt-3 text-xs text-slate-400">Each qualifying verified Agent or Bridger referral keeps the staff referral bonus. Salary and referral bonus are separate; referral attribution is one measurable part of the broader Distribution Manager work.</p><div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3"><p className="break-all font-mono text-sm font-black text-white">{state.referralCode||'Resolving referral identity'}</p></div><div className="mt-3 grid gap-2 sm:grid-cols-2"><Button onClick={copyReferral} variant="outline" className="border-cyan-300/20 bg-cyan-300/[.04] text-cyan-100"><Copy className="mr-2 h-4 w-4"/>{copied?'Referral link copied':'Copy referral link'}</Button><Button asChild variant="outline" className="border-cyan-300/20 bg-cyan-300/[.04] text-cyan-100"><Link href="/referrals">Open Referral Record<ArrowRight className="ml-2 h-4 w-4"/></Link></Button></div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl border border-white/10 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-500">Per verified referral</p><p className="mt-1 text-lg font-black text-white">₦{Number(state.referralBonusNgn||500).toLocaleString('en-NG')}</p></div><div className="rounded-xl border border-white/10 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-500">Referral bonus record</p><p className="mt-1 text-lg font-black text-white">₦{Number(state.totalReferralBonusNgn||0).toLocaleString('en-NG')}</p></div></div></div><div className="rounded-2xl border border-amber-300/15 bg-amber-300/[.035] p-5"><div className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-amber-300"/><p className="text-[9px] font-black uppercase tracking-[.18em] text-amber-300">Distribution instruments</p></div><div className="mt-4 divide-y divide-white/10">{[['/distribution-studio','Distribution Studio','Plan and operate outward social distribution.'],['/video-ad-studio','Video Ad Studio','Produce WEAVE and customer campaign video.'],['/referrals','Referral Movement','Track attributed Agent and Bridger acquisition.'],['/event','Flame Event','Carry the current live WEAVE movement outward.']].map(([href,label,detail])=><Link key={href} href={href} className="group flex items-center justify-between gap-3 py-3"><span><span className="block text-sm font-black text-white">{label}</span><span className="mt-1 block text-[10px] text-slate-500">{detail}</span></span><ArrowRight className="h-4 w-4 text-slate-600 transition group-hover:translate-x-1 group-hover:text-amber-200"/></Link>)}</div></div></section>
    <footer className="mt-8 flex flex-wrap gap-3 border-t border-white/10 pt-5 text-xs"><Link href={user?.role==='agent'?'/agent/dashboard':'/bridger/dashboard'} className="text-sky-300">Return to {user?.role==='agent'?'Agent':'Bridger'} world</Link><span className="text-slate-700">·</span><Link href="/weave/lifestyles" className="text-yellow-300">Lifestyle</Link><span className="text-slate-700">·</span><span className="text-slate-500">Document accepted {new Date(employment.document_accepted_at).toLocaleDateString('en-NG')} · Probation ends {new Date(employment.probation_ends_at).toLocaleDateString('en-NG')}</span></footer>
  </main>
}

function Metric({icon,label,value}:{icon:ReactNode,label:string,value:string}){return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="flex items-center gap-2 text-slate-500">{icon}<p className="text-[9px] font-black uppercase tracking-widest">{label}</p></div><p className="mt-3 text-xl font-black text-white">{value}</p></div>}
