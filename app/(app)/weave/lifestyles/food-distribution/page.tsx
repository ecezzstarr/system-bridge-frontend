'use client'
import Link from 'next/link'
import {useCallback,useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
import {Button} from '@/components/ui/button'

type Manager={user_id:string;name:string}
type Appointment={user_id:string;position:'manager'|'assistant';status:string;application_note:string;manager_user_id:string|null;manager_name?:string|null;administration_note?:string|null;created_at:string}
export default function FoodDistributionEmploymentPage(){
  const {user,token,isInitialized,isLoading}=useAuth()
  const [eligible,setEligible]=useState(false)
  const [appointment,setAppointment]=useState<Appointment|null>(null)
  const [managers,setManagers]=useState<Manager[]>([])
  const [position,setPosition]=useState<'manager'|'assistant'>('manager')
  const [managerUserId,setManagerUserId]=useState('')
  const [note,setNote]=useState('')
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const load=useCallback(async()=>{
    if(!token)return
    const response=await fetch('/api/food-distribution/employment',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
    const data=await response.json()
    if(!response.ok)throw new Error(data.error||'Unable to load food distribution employment')
    setEligible(Boolean(data.eligible));setAppointment(data.appointment||null);setManagers(data.managers||[])
    setManagerUserId(current=>current||data.managers?.[0]?.user_id||'')
  },[token])
  useEffect(()=>{if(!isInitialized||isLoading)return;if(user?.role!=='agent'){setError('Food Distribution employment belongs to the Agent Department.');setLoading(false);return}load().catch(e=>setError(e.message)).finally(()=>setLoading(false))},[isInitialized,isLoading,user?.id,user?.role,load])
  const apply=async()=>{
    if(!token||note.trim().length<30)return
    setSaving(true);setError('')
    try{
      const response=await fetch('/api/food-distribution/employment',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({position,managerUserId:position==='assistant'?managerUserId:null,applicationNote:note})})
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'Application failed')
      setAppointment(data.appointment);setNote('');await load()
    }catch(e){setError(e instanceof Error?e.message:'Application failed')}
    finally{setSaving(false)}
  }
  if(!isInitialized||isLoading||loading)return <main className="p-6 text-sm text-slate-200">Opening Food Distribution employment…</main>
  return <main className="weave-operating-environment mx-auto min-h-screen max-w-4xl px-4 py-8 text-white" data-food-distribution-employment="agent">
    <div className="flex flex-wrap gap-4 text-xs text-cyan-200"><Link href="/weave/lifestyles">← Lifestyle</Link><Link href="/weave/lifestyles/work">My approved workspaces →</Link></div>
    <p className="mt-7 text-[10px] font-black uppercase tracking-[.2em] text-amber-200">Stability · Agent Department employment</p>
    <h1 className="mt-2 text-3xl font-black">Food Distribution Manager</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">This is the Agent food logistics path, separate from Bridger Distribution Manager employment and from Food Preparation. The work coordinates available stock, food outlets, order handoffs, carrier movement and delivery confirmation across the existing WEAVE food systems. The monthly operating target is 200 recorded food distributions; every count must be supported by a verifiable order or delivery record.</p>
    <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="border border-white/10 p-4"><p className="text-[10px] uppercase tracking-wider text-slate-400">Lead appointment</p><p className="mt-2 text-lg font-black">Food Distribution Manager</p><p className="mt-1 text-xs text-slate-400">Plan supply, outlet coverage and delivery coordination.</p></div><div className="border border-white/10 p-4"><p className="text-[10px] uppercase tracking-wider text-slate-400">Supporting appointment</p><p className="mt-2 text-lg font-black">Assistant Food Distribution Manager</p><p className="mt-1 text-xs text-slate-400">Carry assigned stock, outlet and delivery handoffs under an approved lead.</p></div></div>
    {error&&<p role="alert" className="mt-4 border border-rose-400/30 p-3 text-sm text-rose-200">{error}</p>}
    {!eligible&&<p className="mt-4 border border-amber-300/20 p-3 text-sm text-amber-100">An active Agent position without exclusive Legion service is required.</p>}
    {appointment&&<section className="mt-6 border border-cyan-300/20 bg-cyan-300/[.04] p-5">
      <p className="text-[10px] font-black uppercase tracking-wider text-cyan-200">Your application</p>
      <h2 className="mt-2 text-xl font-black">{appointment.position==='manager'?'Food Distribution Manager':'Assistant Food Distribution Manager'} · {appointment.status.replaceAll('_',' ')}</h2>
      {appointment.manager_name&&<p className="mt-2 text-sm text-slate-300">Lead Manager: {appointment.manager_name}</p>}
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{appointment.application_note}</p>
      {appointment.administration_note&&<p className="mt-3 text-xs text-amber-100">Administration review: {appointment.administration_note}</p>}
      {appointment.status==='approved'&&<div className="mt-4"><p className="text-sm text-emerald-200">Administration has approved this appointment.</p><Link href="/weave/lifestyles/work" className="mt-3 inline-block text-sm font-black text-cyan-200">Open approved workspaces →</Link></div>}
    </section>}
    {(!appointment||['rejected','ended'].includes(appointment.status))&&<section className="mt-6 border border-white/10 p-5">
      <h2 className="text-lg font-black">{appointment?'Submit a new application':'Apply for food distribution employment'}</h2>
      <label className="mt-4 block text-xs font-bold text-slate-300">Appointment</label>
      <select value={position} onChange={e=>setPosition(e.target.value as 'manager'|'assistant')} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-sm text-white">
        <option value="manager">Food Distribution Manager</option><option value="assistant">Assistant Food Distribution Manager</option>
      </select>
      {position==='assistant'&&<><label className="mt-4 block text-xs font-bold text-slate-300">Approved lead Manager</label><select value={managerUserId} onChange={e=>setManagerUserId(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-sm text-white"><option value="">Choose a Food Distribution Manager</option>{managers.map(m=><option key={m.user_id} value={m.user_id}>{m.name}</option>)}</select>{!managers.length&&<p className="mt-2 text-xs text-amber-200">No approved Food Distribution Manager is available for assistant applications yet.</p>}</>}
      <label className="mt-4 block text-xs font-bold text-slate-300">Experience and operating plan</label>
      <textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={2000} rows={5} placeholder="Explain how you will track food stock, supply outlets, coordinate delivery handoffs and record completed distributions." className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-sm text-white"/>
      <Button className="mt-4" disabled={!eligible||saving||note.trim().length<30||(position==='assistant'&&(!managerUserId||!managers.length))} onClick={()=>void apply()}>{saving?'Submitting…':'Submit for Administration review'}</Button>
      <p className="mt-3 text-xs leading-5 text-slate-500">Application is not an appointment. Administration must approve it before the role becomes active. Do not count a distribution until its supporting order or delivery evidence is recorded.</p>
    </section>}
  </main>
}
