'use client'
import { useCallback,useEffect,useState } from 'react'
import Link from 'next/link'
import { ArrowLeft,ChefHat,RefreshCcw,ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { EmploymentActions } from '@/components/employment/employment-actions'
type Manager={
  id:string;agent_id:string;status:string;position:'manager'|'assistant';application_note:string;review_note?:string|null;
  name:string;username:string;email:string;is_active:boolean;role:string;monthly_salary_ngn:string
}
export default function AdminFoodPreparationManagerPage(){
  const {user,token,isInitialized}=useAuth()
  const [staff,setStaff]=useState<Manager[]>([])
  const [allocation,setAllocation]=useState<{order_count:number;package_count:number;allocated_ngn:string}|null>(null)
  const [notes,setNotes]=useState<Record<string,string>>({})
  const [busy,setBusy]=useState('')
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const load=useCallback(async()=>{
    if(!token||user?.role!=='admin')return
    try{
      const res=await fetch('/api/admin/food-preparation-manager',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
      const data=await res.json()
      if(!res.ok)throw new Error(data.error||'Unable to load food preparation positions')
      setStaff(data.applications||[]);setAllocation(data.allocation||null);setError('')
    }catch(cause){setError(cause instanceof Error?cause.message:'Unable to open food preparation')}
  },[token,user?.role])
  useEffect(()=>{void load()},[load])
  async function update(body:Record<string,unknown>,key:string,success:string){
    if(!token)return
    setBusy(key);setMessage('');setError('')
    try{
      const res=await fetch('/api/admin/food-preparation-manager',{
        method:'PATCH',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body:JSON.stringify(body),
      })
      const data=await res.json()
      if(!res.ok)throw new Error(data.error||'Unable to complete Administration action')
      setMessage(success);await load()
    }catch(cause){setError(cause instanceof Error?cause.message:'Action failed')}
    finally{setBusy('')}
  }
  if(!isInitialized)return <main className="p-6 text-white">Opening Administration food desk…</main>
  if(user?.role!=='admin')return <main className="p-6 text-white">Administration access required.</main>
  const pending=staff.filter(person=>person.status==='pending')
  const approved=staff.filter(person=>person.status==='approved'&&person.is_active&&person.role==='agent')
  const approvedAssistants=staff.filter(person=>person.status==='approved'&&person.position==='assistant').length
  return <main className="mx-auto max-w-7xl space-y-8 px-4 pb-20 pt-6 text-white" data-admin-food-preparation="assignments">
    <header className="border-b border-white/10 pb-6">
      <Link href="/admin/agility" className="inline-flex items-center gap-2 text-xs text-amber-200"><ArrowLeft className="h-4 w-4"/> Agility Administration</Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-amber-200"><ShieldCheck className="h-4 w-4"/> Administration · Company Kitchen</p>
          <h1 className="mt-2 text-3xl font-black">Food Preparation Management Team</h1>
          <p className="mt-3 text-xl font-black text-emerald-200">1 Manager · ₦70,000/month | 2 Assistants · ₦40,000/month each</p>
          <p className="mt-2 text-xs text-amber-200">Approved: {approved.filter(person=>person.position==='manager').length}/1 Manager · {approvedAssistants}/2 Assistants</p>
          <p className="mt-2 max-w-3xl text-xs leading-6 text-stone-400">Review Agent applications and appointments. The Food Preparation Manager is the Head of WEAVE Stability food operations and exclusively assigns approved assistants. Administration does not assign kitchen work. Payroll is not automatically disbursed.</p>
        </div>
        <button type="button" onClick={()=>void load()} className="inline-flex items-center gap-2 border border-white/10 px-4 py-2 text-xs"><RefreshCcw className="h-4 w-4"/> Refresh</button>
      </div>
    </header>
    {approvedAssistants>2&&<p role="alert" className="border border-amber-300/30 bg-amber-300/5 px-4 py-3 text-xs text-amber-200" data-food-assistant-overcapacity="true">There are {approvedAssistants} previously approved Assistant Food Preparation Managers, above the limit of two. Existing appointments and assigned food orders have been preserved. Administration must review the surplus appointments and record any changes with reasons. New assistant approvals are blocked until staffing is within the limit.</p>}
    {error&&<p role="alert" className="border border-rose-300/20 px-4 py-3 text-xs text-rose-200">{error}</p>}
    {message&&<p role="status" className="border border-emerald-300/20 px-4 py-3 text-xs text-emerald-200">{message}</p>}
    <section className="border border-white/10 p-4" data-food-admin-allocation-summary>
      <h2 className="font-black text-amber-200">Administration allocation · ₦800 per verified food bowl/package</h2>
      <p className="mt-2 text-xs text-stone-400">Calculated per verified stock package. Forensics handles external bank transfer and independently records payment references. The amount shown is an allocation, not proof of bank settlement.</p>
      <p className="mt-3 text-xl font-black">{new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(allocation?.allocated_ngn||0))} <span className="text-xs font-normal text-stone-400">allocated across {Number(allocation?.package_count||0)} packages in {Number(allocation?.order_count||0)} verified stock orders</span></p>
    </section>
    <section>
      <h2 className="text-xl font-black">Applications awaiting review · {pending.length}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {pending.map(person=><article key={person.id} className="border border-white/10 p-5">
          <p className="flex items-center gap-2 text-xs text-amber-200"><ChefHat className="h-4 w-4"/> {person.position==='manager'?'Manager application':'Assistant Manager application'}</p>
          <h3 className="mt-2 text-lg font-black">{person.name||person.username}</h3>
          <p className="mt-1 text-xs text-stone-500">{person.email} · {person.is_active?'Active':'Inactive'} · ₦{Number(person.monthly_salary_ngn).toLocaleString('en-NG')}/month after appointment</p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-300">{person.application_note}</p>
           <EmploymentActions position="food_preparation" employeeId={person.agent_id} administration onStatusChange={()=>void load()}/>
          <label className="mt-4 block text-xs text-stone-300">Appointment verification findings and decision reason
            <textarea minLength={15} maxLength={2000} rows={3} value={notes[person.id]||''}
              onChange={e=>setNotes(v=>({...v,[person.id]:e.target.value}))}
              className="mt-2 w-full border border-white/15 bg-[#161c1b] p-3 text-white"/>
          </label>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" disabled={busy===person.id||!person.is_active||(person.position==='assistant'&&approvedAssistants>=2)||(notes[person.id]||'').trim().length<15}
              onClick={()=>void update({action:'review',appointmentId:person.id,decision:'approved',reviewNote:notes[person.id]},person.id,'Administration approved this Food Preparation appointment. The Stability Lead directs daily work assignments.')}
              className="border border-emerald-300/30 px-4 py-2 text-xs text-emerald-200 disabled:opacity-40">Approve appointment</button>
            <button type="button" disabled={busy===person.id||(notes[person.id]||'').trim().length<15}
              onClick={()=>void update({action:'review',appointmentId:person.id,decision:'rejected',reviewNote:notes[person.id]},person.id,'Application declined.')}
              className="border border-rose-300/30 px-4 py-2 text-xs text-rose-200 disabled:opacity-40">Decline application</button>
          </div>
        </article>)}
        {!pending.length&&<p className="border border-dashed border-white/10 p-6 text-xs text-stone-500">No pending applications.</p>}
      </div>
    </section>
    <section className="border-t border-white/10 pt-6">
      <h2 className="text-xl font-black">Administration-approved Food Preparation staff · {approved.length}/3</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {staff.filter(p=>p.status==='approved').map(person=><div key={person.id} className="border border-white/10 p-4">
          <p className="text-sm font-black">{person.name||person.username} · {person.position==='manager'?'Manager':'Assistant Manager'}</p>
          <p className="mt-2 text-xs text-stone-400">Agent · {person.is_active?'Active':'Inactive'} · salary ₦{Number(person.monthly_salary_ngn).toLocaleString('en-NG')} per month</p>
          <EmploymentActions position="food_preparation" employeeId={person.agent_id} administration onStatusChange={()=>void load()}/>
        </div>)}
      </div>
    </section>
    <section className="border-t border-white/10 pt-6" data-food-employment-history="private">
      <h2 className="text-xl font-black">Former staff and application correspondence</h2>
      <p className="mt-2 text-xs leading-6 text-stone-400">Resignations, dismissals and declined applications remain visible to Administration. Replies stay available after a position ends, without restoring employment or kitchen access.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {staff.filter(person=>['revoked','rejected'].includes(person.status)).map(person=><article key={person.id} className="border border-white/10 p-4">
          <p className="text-sm font-black">{person.name||person.username} · {person.position==='manager'?'Manager':'Assistant'}</p>
          <p className="mt-2 text-xs text-stone-400">{person.status.toUpperCase()} · {person.email}</p>
          <EmploymentActions position="food_preparation" employeeId={person.agent_id} administration onStatusChange={()=>void load()}/>
        </article>)}
      </div>
    </section>
  </main>
}
