'use client'

import Link from 'next/link'
import {useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
import {Button} from '@/components/ui/button'
import {DistributionTeamWorkspace} from '@/components/distribution/team-workspace'
import {EmploymentActions} from '@/components/employment/employment-actions'

export default function DistributionAssistantLifestylePage(){
  const {user,token,isInitialized,isLoading}=useAuth()
  const [data,setData]=useState<any>(null)
  const [loading,setLoading]=useState(true)
  const [submitting,setSubmitting]=useState(false)
  const [note,setNote]=useState('')
  const [error,setError]=useState('')
  const load=async()=>{
    if(!token)return
    const response=await fetch('/api/manager/assistant',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
    const result=await response.json()
    if(!response.ok)throw new Error(result.error||'Unable to load assistant employment')
    setData(result)
  }
  useEffect(()=>{
    if(!isInitialized||isLoading)return
    if(!user||!['agent','bridger'].includes(user.role||'')){setLoading(false);return}
    load().catch(err=>setError(err.message)).finally(()=>setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[isInitialized,isLoading,user?.id,token])
  const apply=async()=>{
    if(!token||note.trim().length<30)return
    setSubmitting(true);setError('')
    try{
      const response=await fetch('/api/manager/assistant',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'apply',applicationNote:note})})
      const result=await response.json()
      if(!response.ok)throw new Error(result.error||'Application failed')
      await load()
    }catch(err){setError(err instanceof Error?err.message:'Application failed')}
    finally{setSubmitting(false)}
  }
  const state=data?.state
  const appointment=state?.appointment
  const appointed=appointment?.status==='approved'
  const target=Number(state?.teamTarget||500)
  if(!isInitialized||isLoading||loading)return <main className="p-7 text-sm text-slate-200">Opening Distribution Assistant employment…</main>
  return <main className="weave-operating-environment mx-auto min-h-screen max-w-4xl px-4 py-8 text-white" data-distribution-assistant-lifestyle="true">
    <div className="flex flex-wrap gap-4 text-xs text-cyan-300"><Link href="/weave/lifestyles">← Return to Lifestyle</Link><Link href="/weave/lifestyles/work">My approved workspaces →</Link></div>
    <p className="mt-7 text-xs font-black uppercase tracking-widest text-amber-300">WEAVE Distribution · Employment</p>
    <h1 className="mt-2 text-3xl font-black">Assistant Distribution Manager</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Six assistant positions, two for each of WEAVE's three Distribution Managers, support the company with outreach, campaign circulation, follow-ups and verified Agent/Bridger acquisition. The assistant remains an Agent or Bridger in WEAVE. A lead Manager must first be verified by Administration before appointing assistants or beginning their probation. Each three-person team (one main Manager and two assistants) shares a 300-referral target in its first probation month and a 500-referral target in each later team employment month.</p>
    <section className="mt-6 grid grid-cols-2 gap-3">
      <Info label="Shared team target" value={appointed?String(target):"300 probation → 500 regular"}/>
      <Info label="Employment positions remaining" value={String(state?.remainingPositions??'—')}/>
    </section>
    {error&&<p role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</p>}
    {!data?.eligible&&<p className="mt-5 rounded-xl border border-amber-400/20 p-4 text-sm text-amber-100">Your Agent or Bridger position must be active to apply or carry this employment.</p>}
    {appointment && <section className="mt-7 rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-5">
      <h2 className="text-lg font-black">{appointment.status==='pending'?'Application under review':appointment.status==='approved'?'Assistant appointment active':appointment.exit_kind==='withdrawn'?'Application withdrawn':appointment.exit_kind==='resigned'?'Resigned from assistant position':appointment.exit_kind==='fired'?'Appointment ended by Administration':appointment.exit_kind==='lead_departed'?'Appointment ended after lead Manager departure':appointment.status==='rejected'?'Application declined':'Assistant appointment ended'}</h2>
      <EmploymentActions position="distribution_assistant" onStatusChange={()=>void load()}/>
      <p data-distribution-assistant-signed-salary="applicant-only" className="mt-2 text-sm font-semibold text-cyan-100">Recorded employment salary term: ₦{Number(appointment.monthly_salary_ngn||state?.monthlySalaryNgn||40000).toLocaleString('en-NG')} monthly, subject to the agreed team target and payroll verification.</p>
      <p className="mt-2 text-sm text-slate-300">{appointed?'Your approved position is active. Work through your Distribution instruments and keep a verified monthly acquisition record.':appointment.status==='pending'?"Your application is awaiting Administration eligibility verification. After verification, a lead Distribution Manager can review the application and decide on appointment. Submitting an application does not start employment or payroll.":'This position is no longer active. You can review the recorded decision and send a message to Administration in the employment desk.'}</p>
      {appointed&&<>
        <div className="mt-4 grid grid-cols-2 gap-3"><Info label="Team referrals this month" value={`${state.verifiedReferrals} / ${target}`}/><Info label="Team referrals remaining" value={String(state.remainingReferrals)}/></div>
        <div className="mt-3 text-sm text-slate-300">Your individual contribution: <strong className="text-white">{state.ownReferrals||0} referrals</strong>. There is no separate individual quota.</div>
        <div className="mt-3 space-y-2">{(state.teamMembers||[]).map((member:any)=><div key={member.userId} className="flex items-center justify-between gap-2 border-b border-white/10 py-2 text-xs text-slate-300"><span>{member.name} · {member.position==='manager'?'Main Manager':'Assistant'}</span><span className="font-black text-cyan-200">{member.referrals} referrals</span></div>)}</div>
        <div className="mt-4 grid grid-cols-2 gap-3"><Info label="Salary eligibility (provisional)" value={`₦${Number(state.compensation?.salaryEntitlementNgn||0).toLocaleString('en-NG')}`}/><Info label="Your referral bonus value" value={`₦${Number(state.compensation?.individualReferralBonusNgn||0).toLocaleString('en-NG')}`}/></div><p className="mt-3 text-xs text-slate-400">{state.compensation?.teamQualified?'Your team has reached its applicable target; full salary is provisionally eligible pending month-end verification.':'Your team is below its current target of '+target+' verified referrals; only your personally qualifying referral bonuses apply for this month.'} Figures do not confirm a salary transfer; referral bonuses follow the existing ledger.</p>
        <DistributionTeamWorkspace/>
        <div className="mt-5 flex flex-wrap gap-3 text-sm text-cyan-200"><Link href="/referrals">Referral movement →</Link><Link href="/distribution-studio">Distribution Studio →</Link><Link href="/video-ad-studio">Video Ad Studio →</Link><Link href="/event">Flame Event →</Link></div>
      </>}
    </section>}
    {state?.canReview && !appointment && <section className="mt-7 rounded-2xl border border-amber-300/20 bg-amber-300/[.03] p-5">
      <h2 className="text-lg font-black">Distribution Manager appointment verified</h2>
      <p className="mt-2 text-sm text-slate-300">Your Administration-verified Distribution Manager appointment carries the assistant selection and supervision desk. Lead Managers cannot also apply for assistant employment.</p>
      <Link href="/manager/dashboard" className="mt-4 inline-block text-sm font-black text-amber-200">Open assistant appointments →</Link>
    </section>}
    {(!appointment || ['rejected','ended'].includes(appointment.status)) && !state?.canReview && <section className="mt-7 rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <h2 className="text-lg font-black">{appointment?'Apply again for a vacant assistant position':'Apply for an Assistant Distribution Manager position'}</h2>
        <section data-distribution-assistant-employment-document="before-application" className="mt-4 space-y-3 border border-cyan-300/25 bg-cyan-300/[.035] p-4">
          <h3 className="text-sm font-black text-cyan-100">Employment terms · Read before applying</h3>
          <p className="text-xl font-black text-white">₦40,000 <span className="text-xs font-normal text-slate-300">monthly salary term</span></p>
          <p className="text-xs leading-6 text-slate-200">The main Manager and up to two appointed assistants share a target of 300 verified Agent/Bridger referrals during the Manager's first one-month probation and 500 each later team month. The ₦40,000 full monthly salary is provisionally eligible only when the team reaches the applicable target. Below target, you receive only the existing ₦500 bonus for each qualifying referral you personally brought.</p>
          <p className="text-xs leading-6 text-slate-300">A verified Distribution Manager reviews and appoints assistants. Applying does not start employment or create any automatic payment. Salaries require month-end payroll and Forensics verification; referral bonuses must not be credited twice.</p>
        </section>
      <p className="mt-2 text-sm text-slate-300">{appointment?'A former appointment does not automatically reopen your position. Any new employment requires a fresh application and a verified Manager’s decision. ':' '}Describe your distribution experience and how you would contribute to the shared 300-referral probation target and 500-referral later-month target.</p>
      <label className="mt-4 block text-xs font-bold text-slate-300" htmlFor="assistant-note">Distribution experience and monthly plan</label>
      <textarea id="assistant-note" maxLength={2000} rows={5} value={note} onChange={event=>setNote(event.target.value)} className="mt-2 w-full rounded-xl border border-white/20 bg-slate-950 p-3 text-sm text-white" placeholder="Explain how you will find, guide and follow up with new Agents and Bridgers."/>
      <Button className="mt-4 bg-cyan-700 text-white hover:bg-cyan-600" onClick={apply} disabled={!data?.eligible||submitting||note.trim().length<30||state?.remainingPositions===0}>{submitting?'Submitting…':'Submit application'}</Button>
      {state?.remainingPositions===0&&<p className="mt-2 text-xs text-slate-400">All six appointments are currently filled.</p>}
    </section>}
  </main>
}
function Info({label,value}:{label:string,value:string}){return <div className="rounded-xl border border-white/10 bg-white/[.035] p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-xl font-black text-white">{value}</p></div>}
