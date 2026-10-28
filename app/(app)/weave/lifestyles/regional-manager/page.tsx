'use client'
import Link from 'next/link'
import {useCallback,useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
import {Button} from '@/components/ui/button'

type Application={user_id:string;source_role:string;region:string;experience:string;motivation:string;status:string;submitted_at:string;reviewed_at?:string|null;review_note?:string|null}
type Appointment={status:string;appointed_at:string}
export default function RegionalManagerApplicationPage(){
  const {user,token,isInitialized,isLoading}=useAuth()
  const [application,setApplication]=useState<Application|null>(null)
  const [appointment,setAppointment]=useState<Appointment|null>(null)
  const [region,setRegion]=useState('')
  const [experience,setExperience]=useState('')
  const [motivation,setMotivation]=useState('')
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const eligible=['client','bridger','agent'].includes(user?.role||'')
  const load=useCallback(async()=>{
    if(!token)return
    const response=await fetch('/api/regional-manager/applications',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
    const data=await response.json()
    if(!response.ok)throw new Error(data.error||'Unable to load Regional Manager application')
    setApplication(data.application||null);setAppointment(data.appointment||null)
    if(data.application){setRegion(data.application.region||'');setExperience(data.application.experience||'');setMotivation(data.application.motivation||'')}
  },[token])
  useEffect(()=>{if(!isInitialized||isLoading)return;if(!eligible){setError('Only Clients, Bridgers, and Agents can apply.');setLoading(false);return}load().catch(e=>setError(e.message)).finally(()=>setLoading(false))},[isInitialized,isLoading,eligible,load])
  const submit=async()=>{
    if(!token)return
    setSaving(true);setError('');setMessage('')
    try{
      const response=await fetch('/api/regional-manager/applications',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({region,experience,motivation})})
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'Application could not be submitted')
      setApplication(data.application);setMessage('Application submitted to Administration for review.')
    }catch(e){setError(e instanceof Error?e.message:'Application could not be submitted')}
    finally{setSaving(false)}
  }
  if(!isInitialized||isLoading||loading)return <main className="p-6 text-sm text-slate-200">Opening Regional Manager application…</main>
  return <main className="weave-operating-environment mx-auto min-h-screen max-w-4xl px-4 py-8 text-white" data-regional-manager-application="true">
    <div className="flex flex-wrap gap-4 text-xs text-cyan-200"><Link href="/weave/lifestyles">← Lifestyle</Link><Link href="/weave/lifestyles/work">My approved workspaces →</Link></div>
    <p className="mt-7 text-[10px] font-black uppercase tracking-[.2em] text-amber-200">The Company of Time · Regional leadership</p>
    <h1 className="mt-2 text-3xl font-black">Apply to become a Regional Manager</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Clients, Bridgers, and Agents may apply while retaining their existing identity. Application volume is not limited by the number of Regional Manager appointments. Administration reviews each application; submission does not itself create an appointment.</p>
    <div className="mt-5 grid gap-3 sm:grid-cols-3">{[['Eligible applicants','Client · Bridger · Agent'],['Team capacity','Up to 10 lead managers'],['Supporting team','Up to 20 assistants']].map(([label,value])=><div key={label} className="border border-white/10 p-4"><p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-sm font-black">{value}</p></div>)}</div>
    {error&&<p role="alert" className="mt-4 border border-rose-400/30 p-3 text-sm text-rose-200">{error}</p>}
    {message&&<p role="status" className="mt-4 border border-emerald-300/20 p-3 text-sm text-emerald-200">{message}</p>}
    {appointment?.status==='active'&&<section className="mt-6 border border-emerald-300/25 p-5"><h2 className="text-xl font-black">Regional Manager appointment active</h2><p className="mt-2 text-sm text-slate-300">Administration has recorded your appointment. Team assignments remain subject to the defined capacity.</p></section>}
    {application&&<section className="mt-6 border border-cyan-300/20 bg-cyan-300/[.04] p-5">
      <p className="text-[10px] font-black uppercase tracking-wider text-cyan-200">Your application · {application.status.replaceAll('_',' ')}</p>
      <h2 className="mt-2 text-xl font-black">{application.region}</h2>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{application.experience}</p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{application.motivation}</p>
      {application.review_note&&<p className="mt-3 border-t border-white/10 pt-3 text-sm text-amber-100">Administration note: {application.review_note}</p>}
    </section>}
    {(!application||['rejected','withdrawn'].includes(application.status))&&!appointment?.status?.includes('active')&&<section className="mt-6 border border-white/10 p-5">
      <h2 className="text-lg font-black">{application?'Submit a new application':'Application details'}</h2>
      <label className="mt-4 block text-xs font-bold text-slate-300" htmlFor="regional-manager-region">Region of responsibility</label>
      <input id="regional-manager-region" value={region} onChange={e=>setRegion(e.target.value)} maxLength={120} placeholder="State, city, or defined region" className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-sm text-white"/>
      <label className="mt-4 block text-xs font-bold text-slate-300" htmlFor="regional-manager-experience">Relevant experience and team leadership</label>
      <textarea id="regional-manager-experience" value={experience} onChange={e=>setExperience(e.target.value)} maxLength={4000} rows={5} placeholder="Describe your business, community, recruitment, distribution, or team leadership experience." className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-sm text-white"/>
      <label className="mt-4 block text-xs font-bold text-slate-300" htmlFor="regional-manager-motivation">Regional operating plan</label>
      <textarea id="regional-manager-motivation" value={motivation} onChange={e=>setMotivation(e.target.value)} maxLength={4000} rows={5} placeholder="Explain how you would support Bridgers, supervise team leads, verify work, and report regional progress." className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-sm text-white"/>
      <Button className="mt-4" disabled={saving||region.trim().length<2||experience.trim().length<20||motivation.trim().length<20} onClick={()=>void submit()}>{saving?'Submitting application…':'Submit Regional Manager application'}</Button>
    </section>}
    <p className="mt-6 text-xs leading-5 text-slate-500">Application records are reviewed in paginated batches. The 10-lead and 20-assistant limits control approved team assignments, not how many people may apply.</p>
  </main>
}
