'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, BriefcaseBusiness, CalendarClock, CheckCircle2, FileSignature, LockKeyhole, Megaphone, Target, Users } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DistributionTeamWorkspace } from '@/components/distribution/team-workspace'
import { FoodDistributionDesk } from '@/components/distribution/food-distribution-desk'
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

  const load=async()=>{
    if(!token)return
    const response=await fetch('/api/manager/employment',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
    const data=await response.json()
    if(!response.ok)throw new Error(data.error||'Unable to load Food Distribution Manager Lifestyle.')
    setState(data.state);setTerms(data.terms||null)
    const assistants=await fetch('/api/manager/assistant',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'}).catch(()=>null)
    if(assistants?.ok){
      try{const body=await assistants.json();setAssistantState(body.state)}
      catch(error){console.error('[food-distribution-manager] assistant report unavailable',error)}
    }
  }

  useEffect(()=>{
    if(!isInitialized||isLoading)return
    if(!user||!['agent','bridger'].includes(user.role||'')){router.replace('/login');return}
    load().catch(err=>setError(err instanceof Error?err.message:'Unable to load Food Distribution Manager Lifestyle.'))
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
    if(!accepted){setError('Accept the Food Distribution Manager Lifestyle document for Administration verification.');return}
    if(signature.trim().toLowerCase()!==String(user.name||'').trim().toLowerCase()){setError('Type your full account name exactly as your signature.');return}
    setBusy(true);setError('')
    try{
      const response=await fetch('/api/manager/employment',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action:'accept_document',accepted:true,documentVersion:terms?.documentVersion||3,signature:signature.trim()})})
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'Food Distribution Manager application could not be recorded.')
      setState(data.state)
    }catch(err){setError(err instanceof Error?err.message:'Food Distribution Manager application could not be recorded.')}
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

  useEffect(()=>{
    if(!assistantState?.pending?.length)return
    const id=new URLSearchParams(window.location.search).get('assistantId')
    if(!id)return
    window.requestAnimationFrame(()=>document.getElementById('assistant-application-'+id)?.scrollIntoView({behavior:'smooth',block:'center'}))
  },[assistantState])
    const probationEnd=state?.employment?.probation_ends_at?new Date(state.employment.probation_ends_at):null
  const daysRemaining=useMemo(()=>probationEnd?Math.max(0,Math.ceil((probationEnd.getTime()-Date.now())/86400000)):0,[state?.employment?.probation_ends_at])
  const agentFree=user?.role==='agent'

  if(!isInitialized||isLoading||(!state&&!error))return <div className="flex min-h-[520px] items-center justify-center text-xs font-black uppercase tracking-widest text-amber-200">Restoring Food Distribution Manager Lifestyle…</div>
  if(error&&!state)return <main className="mx-auto max-w-3xl px-4 py-12"><div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-200">{error}</div></main>

  if(!state?.continuance?.active){
    const roleLabel=agentFree?'Agent':'Bridger'
    return <main className="mx-auto max-w-3xl px-4 py-12" data-distribution-manager-lifestyle-locked={agentFree?'agent-position':'agentic-bridger'}>
      <section className="rounded-3xl border border-amber-300/20 bg-amber-300/[.035] p-6 md:p-8">
        <LockKeyhole className="h-8 w-8 text-amber-300"/>
        <p className="mt-4 text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Food Distribution Manager Lifestyle</p>
        <h1 className="mt-2 text-3xl font-black text-white">{agentFree?'Your Agent account must be active.':'Attain Agentic-Bridger to enable Lifestyle.'}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">{agentFree?'Agents use WEAVE Lifestyle, Ace and Food Distribution Manager through the Agent company position with no monthly subscription. Restore the Agent account position to continue.':'Pay 11 Flame Coin once to attain Agentic-Bridger. Agentic-Bridger enables Lifestyle and applications for eligible employment positions; appointments require separate approval. No monthly subscription.'}</p>
        {error&&<p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</p>}
        {state?.employment&&<EmploymentActions position="distribution_manager" onStatusChange={()=>void load()}/>}
        <div className="mt-6 grid gap-3 sm:grid-cols-2"><Metric icon={<Target className="h-4 w-4"/>} label="Food distribution target" value="200 handoffs / month"/><Metric icon={<CalendarClock className="h-4 w-4"/>} label="Employment document" value="Terms after access"/></div>
        {agentFree?<Button asChild className="mt-6 w-full bg-amber-600 font-black uppercase tracking-wider hover:bg-amber-700"><Link href="/agent/dashboard">RETURN TO AGENT POSITION</Link></Button>:<><Button onClick={subscribe} disabled={busy} className="mt-6 w-full bg-amber-600 font-black uppercase tracking-wider hover:bg-amber-700">{busy?'Activating Agentic-Bridger…':'Attain Agentic-Bridger · 11 Flame Coin once'}</Button><p className="mt-3 text-center text-[10px] text-slate-500">Agentic-Bridger attainment costs 11 Flame Coin once. It is not a recurring subscription or automatic Manager employment.</p></>}
      </section>
    </main>
  }

  if(!state?.employment||['ended','rejected'].includes(state.employment.status)){
    return <main className="mx-auto max-w-3xl px-4 py-10" data-distribution-manager-lifestyle-document="true">
      <section className="rounded-3xl border border-cyan-300/15 bg-cyan-300/[.025] p-6 md:p-8">
        <div className="flex items-center gap-2 text-cyan-300"><FileSignature className="h-5 w-5"/><p className="text-[10px] font-black uppercase tracking-[.2em]">Food Distribution Manager Lifestyle Document</p></div>
        <h1 className="mt-3 text-3xl font-black text-white">{user?.name}</h1>
        {['ended','rejected'].includes(state?.employment?.status||'')&&<EmploymentActions position="distribution_manager" onStatusChange={()=>void load()}/>}
        {state?.employment?.status==='rejected'&&<p className="mt-3 border border-rose-300/25 p-3 text-xs text-rose-200">Administration did not approve the previous application. {state.employment.verification_note||'You may sign a new application after reviewing the requirements.'}</p>}
        <p className="mt-2 text-sm text-slate-400">Your underlying WEAVE position remains {String(user?.role||'').toUpperCase()}. {agentFree?'As an Agent, Food Distribution Manager is carried through your active Agent position with no monthly subscription.':'Food Distribution Manager access is permanently available through your purchased Agentic-Bridger identity.'}</p>
        {error&&<p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</p>}
        <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm leading-6 text-slate-300">
          <p><strong className="text-white">Administration verification.</strong> Signing submits your application for review. One-month probation begins only when Administration verifies the appointment, not when you sign.</p>
          <p><strong className="text-white">Core duty.</strong> Distribute WEAVE food products to consumers and businesses, coordinate stock availability and delivery handoffs, and return evidence-backed distribution records to Administration.</p>
          <p><strong className="text-white">Field organization.</strong> Coordinate food-product availability, business orders, consumer orders, delivery routes, dispatch handoffs and follow-up across WEAVE's existing food channels.</p>
          <p><strong className="text-white">Team authority.</strong> After verification, you select up to two Assistant Food Distribution Managers. Coordinate plans, responsibilities and handoffs directly in the team communication workspace. The Food Distribution Desk records each completed consumer or business handoff for Administration verification.</p>
          <p><strong className="text-white">Administration oversight.</strong> Administration reviews your signed appointment, verified food distributions and team reports, but does not join or overwrite internal team messages. Normal institutional compliance and payment approvals remain in force.</p>
          <p><strong className="text-white">Monthly target.</strong> 200 verified food distribution handoffs per calendar month, shared by the Food Distribution Manager and up to two appointed assistants. Every WEAVE food product type counts; each distinct completed consumer or business handoff counts once after Administration verifies its order or receipt reference.</p>
          <p><strong className="text-white">Salary condition.</strong> ₦70,000 monthly salary is provisionally eligible when the team reaches 200 verified food distributions in the calendar month, subject to Administration verification and month-end payroll approval. Recruitment and referral activity does not count toward the food-distribution target.</p>
          <p><strong className="text-white">Lifestyle access.</strong> {agentFree?'Agent position access is free. Food Distribution Manager remains open while the Agent account is active.':'The one-time 11 Flame Coin payment attains Agentic-Bridger, which enables Lifestyle access permanently while your Bridger position remains eligible and active. Employment still requires approval.'}</p>
        </div>
        <label className="mt-5 flex items-start gap-3 rounded-xl border border-white/10 p-3 text-xs text-slate-300"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} className="mt-1"/><span>I accept the Food Distribution Manager Lifestyle document and understand that Administration must approve the signed application before probation begins.</span></label>
        <label htmlFor="distribution-manager-signature" className="mt-4 block text-sm font-semibold text-white">Sign with your full account name</label>
        <Input id="distribution-manager-signature" name="signature" type="text" autoComplete="name" aria-label="Food Distribution Manager document signature" className="mt-2 min-h-12 w-full border-slate-700 bg-slate-900/50 text-white" value={signature} onChange={e=>setSignature(e.target.value)} placeholder={user?.name||'Full account name'}/>
        <Button onClick={acceptDocument} disabled={busy||!accepted} className="mt-4 w-full bg-cyan-700 font-black uppercase tracking-wider hover:bg-cyan-600">{busy?'Recording…':<><CheckCircle2 className="mr-2 h-4 w-4"/>Accept · Request Administration Verification</>}</Button>
      </section>
    </main>
  }

  if(state.employment.status==='pending_verification') {
    return <main className="mx-auto max-w-3xl px-4 py-10" data-distribution-manager-awaiting-administration="true">
      <section className="border border-amber-300/25 bg-amber-300/[.04] p-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-amber-200">Awaiting Administration verification</p>
        <h1 className="mt-3 text-2xl font-black text-white">Signed Food Distribution Manager application received</h1>
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
  const statusLabel=employment.status==='probation'?'Probation':employment.status==='active'?'Active Food Distribution Manager':'Ended'
  return <main className="mx-auto max-w-6xl px-4 py-8 md:px-7 md:py-12" data-distribution-manager-lifestyle-room="true">
    <header className="border-b border-white/10 pb-6"><div className="flex flex-wrap items-start justify-between gap-5"><div><div className="flex items-center gap-2 text-amber-300"><BriefcaseBusiness className="h-5 w-5"/><p className="text-[10px] font-black uppercase tracking-[.2em]">WEAVE Food Distribution Manager Lifestyle</p></div><h1 className="mt-2 text-3xl font-black text-white">{user?.name}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Food Distribution Manager coordinates WEAVE food-product distribution while your original {String(employment.source_role||user?.role).toUpperCase()} identity and base-role responsibilities remain intact.</p></div><div className="rounded-2xl border border-amber-300/20 bg-amber-300/[.05] px-4 py-3 text-right"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Lifestyle standing</p><p className="mt-1 font-black text-amber-200">{statusLabel}</p><p className="mt-1 text-[9px] text-emerald-300">{agentFree?'Agent position access · no subscription':'Agentic-Bridger owned'}</p></div></div></header>
    {state.metricsAvailable===false&&<p role="status" className="mt-5 rounded-xl border border-amber-300/25 p-3 text-xs text-amber-100">The food distribution report is temporarily unavailable. Your appointment remains recorded; distribution figures are not verified until the report returns.</p>}
    <section className="mt-7 grid gap-4 md:grid-cols-4"><Metric icon={<CalendarClock className="h-4 w-4"/>} label="Probation remaining" value={employment.status==='probation'?`${daysRemaining} days`:statusLabel}/><Metric icon={<Target className="h-4 w-4"/>} label={"Verified food distributions this month"} value={`${state.verifiedFoodDistributions} / ${state.target}`}/><Metric icon={<Users className="h-4 w-4"/>} label="Food distributions remaining" value={String(state.remaining)}/><Metric icon={<BriefcaseBusiness className="h-4 w-4"/>} label="Potential full salary" value={`₦${Number(state.monthlySalaryNgn||70000).toLocaleString('en-NG')}`}/></section>
    <section className="mt-6 rounded-2xl border border-emerald-300/15 bg-emerald-300/[.035] p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-emerald-300">Core duty · Distribute WEAVE foods</p><h2 className="mt-1 text-xl font-black text-white">Deliver WEAVE foods to consumers and businesses.</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-slate-400">Coordinate completed handoffs of WEAVE food products to consumers and businesses. The shared monthly target is 200 Administration-verified distributions across you and up to two Assistant Food Distribution Managers. All food product types count; each distinct handoff counts once, regardless of quantity.</p></div><div className="min-w-[180px]"><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-emerald-300" style={{width:`${state.progressPercent}%`}}/></div><p className="mt-2 text-right text-xs font-black text-emerald-200">{state.progressPercent}%</p></div></div></section>
    <section className="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/[.035] p-5" data-distribution-manager-pay-rule="team-performance"><h2 className="text-sm font-black text-white">Current month · Payment qualification</h2><p className="mt-2 text-sm text-slate-300">{state.compensation?.teamQualified?'Your team has reached 200 verified food distributions. The ₦70,000 salary is provisionally eligible, subject to Administration verification and month-end payroll approval.':'Your team has not yet reached 200 verified food distributions. Salary eligibility remains provisional until the monthly target is reached and the records are verified.'}</p><div className="mt-3 grid grid-cols-2 gap-3"><Metric icon={<BriefcaseBusiness className="h-4 w-4"/>} label="Salary eligibility (provisional)" value={`₦${Number(state.compensation?.salaryEntitlementNgn||0).toLocaleString('en-NG')}`}/><Metric icon={<Users className="h-4 w-4"/>} label="Verified food distributions" value={String(state.verifiedFoodDistributions||0)}/></div><p className="mt-3 text-xs text-slate-500">This is a performance preview, not confirmation of a salary transfer. Food distribution records count only after Administration verifies them.</p></section>
    <Link href="/weave/lifestyles/work" className="my-4 inline-flex min-h-11 items-center border border-cyan-300/25 px-4 py-2 text-xs font-black text-cyan-200">My approved company workspaces →</Link>
    <DistributionTeamWorkspace/>
    <EmploymentActions position="distribution_manager" onStatusChange={()=>void load()}/>
    {assistantState?.canReview&&<section className="mt-6 rounded-2xl border border-amber-300/15 bg-amber-300/[.03] p-5" data-distribution-assistant-review="true">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-[10px] font-black uppercase tracking-widest text-amber-300">Assistant Food Distribution Managers</p><h2 className="mt-2 text-xl font-black text-white">Your distribution support team</h2><p className="mt-2 text-sm text-slate-400">Six assistant appointments across WEAVE, two reporting to each of the three Food Distribution Managers. Each receives a ₦40,000 monthly salary term after appointment. Each three-person team shares a target of 200 verified food distributions per calendar month across all WEAVE food product types. Salary eligibility requires the verified target and month-end payroll approval.</p></div>
        <div className="rounded-xl border border-white/10 p-3 text-right text-sm font-black text-white">{assistantState.team?.length||0} / {assistantState.assistantPositionsPerManager} your team · {assistantState.employed} / {assistantState.positions} company-wide</div>
      </div>
      {error&&<p className="mt-3 text-sm text-rose-200">{error}</p>}
      <div className="mt-4 space-y-2">
        {(assistantState.team||[]).map((member:any)=><div key={member.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 p-3 text-sm"><span className="font-bold text-white">{member.name} <span className="text-xs text-slate-400">· {member.role}</span></span><span className="text-xs text-emerald-300">Appointed {new Date(member.hired_at).toLocaleDateString('en-NG')}</span></div>)}
        {!assistantState.team?.length&&<p className="text-sm text-slate-400">No assistant appointments yet.</p>}
        <div className="rounded-xl border border-emerald-300/20 p-3 text-sm text-emerald-100">Shared team progress: {state.verifiedFoodDistributions} / {state.target} verified food distributions this month. Your contribution: {state.myFoodDistributions||0}.</div>
        {(state.teamMembers||[]).map((member:any)=><div key={member.userId} className="flex items-center justify-between gap-3 border-b border-white/10 py-2 text-xs text-slate-300"><span>{member.name} · {member.position==='manager'?'Main Manager':'Assistant'}</span><span className="font-black text-emerald-200">{member.verifiedDistributions||0} food distributions</span></div>)}
      </div>
      <h3 className="mt-6 text-sm font-black text-white">Pending applications</h3>
      <div className="mt-3 space-y-3">
        {(assistantState.pending||[]).map((candidate:any)=><div id={`assistant-application-${candidate.user_id}`} key={candidate.user_id} className="scroll-mt-24 rounded-xl border border-white/10 p-4">
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
    <FoodDistributionDesk/>
    <footer className="mt-8 flex flex-wrap gap-3 border-t border-white/10 pt-5 text-xs"><Link href={user?.role==='agent'?'/agent/dashboard':'/bridger/dashboard'} className="text-sky-300">Return to {user?.role==='agent'?'Agent':'Bridger'} world</Link><span className="text-slate-700">·</span><Link href="/weave/lifestyles" className="text-yellow-300">Lifestyle</Link><span className="text-slate-700">·</span><span className="text-slate-500">Document accepted {new Date(employment.document_accepted_at).toLocaleDateString('en-NG')} · Probation ends {new Date(employment.probation_ends_at).toLocaleDateString('en-NG')}</span></footer>
  </main>
}

function Metric({icon,label,value}:{icon:ReactNode,label:string,value:string}){return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="flex items-center gap-2 text-slate-500">{icon}<p className="text-[9px] font-black uppercase tracking-widest">{label}</p></div><p className="mt-3 text-xl font-black text-white">{value}</p></div>}
