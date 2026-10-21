'use client'

import Link from 'next/link'
import {useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
import {Button} from '@/components/ui/button'

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
    <Link href="/weave/lifestyles" className="text-xs text-cyan-300">← Return to Lifestyle</Link>
    <p className="mt-7 text-xs font-black uppercase tracking-widest text-amber-300">WEAVE Distribution · Employment</p>
    <h1 className="mt-2 text-3xl font-black">Assistant Distribution Manager</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Six assistant positions, two for each of WEAVE's three Distribution Managers, support the company with outreach, campaign circulation, follow-ups and verified Agent/Bridger acquisition. The assistant remains an Agent or Bridger in WEAVE. Each three-person team (one main Manager and two assistants) shares a single 500-referral target each month.</p>
    <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Info label="Monthly salary term" value="₦30,000"/>
      <Info label="Shared monthly team target" value={String(target)}/>
      <Info label="Employment positions remaining" value={String(state?.remainingPositions??'—')}/>
    </section>
    <p className="mt-4 text-xs text-slate-400">Monthly salary begins only after appointment and is subject to company payroll. Application does not guarantee employment or trigger an automatic wallet payment. Qualifying referrals must be genuine and attributable.</p>
    {error&&<p role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</p>}
    {!data?.eligible&&<p className="mt-5 rounded-xl border border-amber-400/20 p-4 text-sm text-amber-100">Your Agent or Bridger position must be active to apply or carry this employment.</p>}
    {appointment ? <section className="mt-7 rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-5">
      <h2 className="text-lg font-black">Application status: {String(appointment.status).toUpperCase()}</h2>
      <p className="mt-2 text-sm text-slate-300">{appointed?'Your approved position is active. Work through your Distribution instruments and keep a verified monthly acquisition record.':appointment.status==='pending'?'Your application has been received. A Distribution Manager reviews applications and appoints up to two assistants.':'This appointment is no longer active.'}</p>
      {appointed&&<>
        <div className="mt-4 grid grid-cols-2 gap-3"><Info label="Team referrals this month" value={`${state.verifiedReferrals} / ${target}`}/><Info label="Team referrals remaining" value={String(state.remainingReferrals)}/></div>
        <div className="mt-3 text-sm text-slate-300">Your individual contribution: <strong className="text-white">{state.ownReferrals||0} referrals</strong>. There is no separate individual quota.</div>
        <div className="mt-3 space-y-2">{(state.teamMembers||[]).map((member:any)=><div key={member.userId} className="flex items-center justify-between gap-2 border-b border-white/10 py-2 text-xs text-slate-300"><span>{member.name} · {member.position==='manager'?'Main Manager':'Assistant'}</span><span className="font-black text-cyan-200">{member.referrals} referrals</span></div>)}</div>
        <div className="mt-5 flex flex-wrap gap-3 text-sm text-cyan-200"><Link href="/referrals">Referral movement →</Link><Link href="/distribution-studio">Distribution Studio →</Link><Link href="/video-ad-studio">Video Ad Studio →</Link><Link href="/event">Flame Event →</Link></div>
      </>}
    </section> : state?.canReview ? <section className="mt-7 rounded-2xl border border-amber-300/20 bg-amber-300/[.03] p-5">
      <h2 className="text-lg font-black">Distribution Manager position active</h2>
      <p className="mt-2 text-sm text-slate-300">Your existing Distribution Manager appointment carries the assistant selection and supervision desk. Lead Managers cannot also apply for assistant employment.</p>
      <Link href="/manager/dashboard" className="mt-4 inline-block text-sm font-black text-amber-200">Open assistant appointments →</Link>
    </section> : <section className="mt-7 rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <h2 className="text-lg font-black">Apply for one of six positions</h2>
      <p className="mt-2 text-sm text-slate-300">Describe your distribution experience and how you would contribute to your team’s shared 500 verified referrals each month.</p>
      <label className="mt-4 block text-xs font-bold text-slate-300" htmlFor="assistant-note">Distribution experience and monthly plan</label>
      <textarea id="assistant-note" maxLength={2000} rows={5} value={note} onChange={event=>setNote(event.target.value)} className="mt-2 w-full rounded-xl border border-white/20 bg-slate-950 p-3 text-sm text-white" placeholder="Explain how you will find, guide and follow up with new Agents and Bridgers."/>
      <Button className="mt-4 bg-cyan-700 text-white hover:bg-cyan-600" onClick={apply} disabled={!data?.eligible||submitting||note.trim().length<30||state?.remainingPositions===0}>{submitting?'Submitting…':'Submit application'}</Button>
      {state?.remainingPositions===0&&<p className="mt-2 text-xs text-slate-400">All six appointments are currently filled.</p>}
    </section>}
  </main>
}
function Info({label,value}:{label:string,value:string}){return <div className="rounded-xl border border-white/10 bg-white/[.035] p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-xl font-black text-white">{value}</p></div>}
