'use client'
import { useCallback,useEffect,useState } from 'react'
import Link from 'next/link'
import { ArrowLeft,ChefHat,RefreshCcw,ShieldCheck,Truck } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
type Manager={
  id:string;agent_id:string;status:string;position:'manager'|'assistant';application_note:string;review_note?:string|null;
  name:string;username:string;email:string;is_active:boolean;role:string;monthly_salary_ngn:string
}
type Order={id:string;product:'agility'|'electrolyte'|'ember'|'daisy';variant_id:string;stage:string;payment_status:string;
  package_count:number;destination:string;buying_agent:string;manager_id:string|null;task_id:string|null;preparation_released_at?:string|null}
const productLabels={agility:'Agility',electrolyte:'Electrolyte',ember:'Ember',daisy:'Daisy Pastries'}
export default function AdminFoodPreparationManagerPage(){
  const {user,token,isInitialized}=useAuth()
  const [staff,setStaff]=useState<Manager[]>([])
  const [orders,setOrders]=useState<Order[]>([])
  const [notes,setNotes]=useState<Record<string,string>>({})
  const [assignees,setAssignees]=useState<Record<string,string>>({})
  const [busy,setBusy]=useState('')
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const load=useCallback(async()=>{
    if(!token||user?.role!=='admin')return
    try{
      const res=await fetch('/api/admin/food-preparation-manager',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
      const data=await res.json()
      if(!res.ok)throw new Error(data.error||'Unable to load food preparation positions')
      setStaff(data.applications||[]);setOrders(data.orders||[]);setError('')
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
  return <main className="mx-auto max-w-7xl space-y-8 px-4 pb-20 pt-6 text-white" data-admin-food-preparation="assignments">
    <header className="border-b border-white/10 pb-6">
      <Link href="/admin/agility" className="inline-flex items-center gap-2 text-xs text-amber-200"><ArrowLeft className="h-4 w-4"/> Agility Administration</Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-amber-200"><ShieldCheck className="h-4 w-4"/> Administration · Company Kitchen</p>
          <h1 className="mt-2 text-3xl font-black">Food Preparation Management Team</h1>
          <p className="mt-3 text-xl font-black text-emerald-200">1 Manager · ₦70,000/month | 5 Assistants · ₦40,000/month each</p>
          <p className="mt-2 text-xs text-amber-200">Approved: {approved.filter(person=>person.position==='manager').length}/1 Manager · {approved.filter(person=>person.position==='assistant').length}/5 Assistants</p>
          <p className="mt-2 max-w-3xl text-xs leading-6 text-stone-400">Review Agent applicants, authorize appointment, and assign paid Agility, Electrolyte and Daisy Pastries orders. Each preparation and dispatch handoff stays attached to the original order. Salary terms are informational until an authorized payroll process is established.</p>
        </div>
        <button type="button" onClick={()=>void load()} className="inline-flex items-center gap-2 border border-white/10 px-4 py-2 text-xs"><RefreshCcw className="h-4 w-4"/> Refresh</button>
      </div>
    </header>
    {error&&<p role="alert" className="border border-rose-300/20 px-4 py-3 text-xs text-rose-200">{error}</p>}
    {message&&<p role="status" className="border border-emerald-300/20 px-4 py-3 text-xs text-emerald-200">{message}</p>}
    <section>
      <h2 className="text-xl font-black">Applications awaiting review · {pending.length}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {pending.map(person=><article key={person.id} className="border border-white/10 p-5">
          <p className="flex items-center gap-2 text-xs text-amber-200"><ChefHat className="h-4 w-4"/> {person.position==='manager'?'Manager application':'Assistant Manager application'}</p>
          <h3 className="mt-2 text-lg font-black">{person.name||person.username}</h3>
          <p className="mt-1 text-xs text-stone-500">{person.email} · {person.is_active?'Active':'Inactive'} · ₦{Number(person.monthly_salary_ngn).toLocaleString('en-NG')}/month after appointment</p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-300">{person.application_note}</p>
          <label className="mt-4 block text-xs text-stone-300">Verification, availability and decision reason
            <textarea minLength={15} maxLength={2000} rows={3} value={notes[person.id]||''}
              onChange={e=>setNotes(v=>({...v,[person.id]:e.target.value}))}
              className="mt-2 w-full border border-white/15 bg-[#161c1b] p-3 text-white"/>
          </label>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" disabled={busy===person.id||!person.is_active||(notes[person.id]||'').trim().length<15}
              onClick={()=>void update({action:'review',appointmentId:person.id,decision:'approved',reviewNote:notes[person.id]},person.id,'Agent approved for the selected Food Preparation position.')}
              className="border border-emerald-300/30 px-4 py-2 text-xs text-emerald-200 disabled:opacity-40">Approve</button>
            <button type="button" disabled={busy===person.id||(notes[person.id]||'').trim().length<15}
              onClick={()=>void update({action:'review',appointmentId:person.id,decision:'rejected',reviewNote:notes[person.id]},person.id,'Application declined.')}
              className="border border-rose-300/30 px-4 py-2 text-xs text-rose-200 disabled:opacity-40">Decline</button>
          </div>
        </article>)}
        {!pending.length&&<p className="border border-dashed border-white/10 p-6 text-xs text-stone-500">No pending applications.</p>}
      </div>
    </section>
    <section className="border-t border-white/10 pt-6">
      <h2 className="text-xl font-black">Approved kitchen staff · {approved.length}/6</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {staff.filter(p=>p.status==='approved').map(person=><div key={person.id} className="border border-white/10 p-4">
          <p className="text-sm font-black">{person.name||person.username} · {person.position==='manager'?'Manager':'Assistant Manager'}</p>
          <p className="mt-2 text-xs text-stone-400">Agent · {person.is_active?'Active':'Inactive'} · salary ₦{Number(person.monthly_salary_ngn).toLocaleString('en-NG')} per month</p>
          <label className="mt-3 block text-xs text-stone-300">Reason to revoke access
            <textarea minLength={15} maxLength={2000} rows={2} value={notes[person.id]||''} onChange={e=>setNotes(v=>({...v,[person.id]:e.target.value}))} className="mt-2 w-full border border-white/10 bg-[#161c1b] p-3"/>
          </label>
          <button type="button" disabled={busy===person.id||(notes[person.id]||'').trim().length<15}
            onClick={()=>void update({action:'review',appointmentId:person.id,decision:'revoked',reviewNote:notes[person.id]},person.id,'Manager appointment revoked.')}
            className="mt-3 border border-rose-300/30 px-4 py-2 text-xs text-rose-200 disabled:opacity-40">Revoke appointment</button>
        </div>)}
      </div>
    </section>
    <section className="border-t border-white/10 pt-6" data-food-preparation-assignment-queue>
      <h2 className="flex items-center gap-2 text-xl font-black"><Truck className="h-5 w-5 text-amber-200"/> Assign paid kitchen orders</h2>
      <p className="mt-3 max-w-3xl text-xs leading-6 text-stone-400">Only paid stock or cake orders in a preparation stage can be assigned. A job can be reassigned if a manager changes. Managers cannot verify payments or mark delivery confirmed.</p>
      <div className="mt-4 space-y-3">
        {orders.map(order=><article key={order.product+order.id} className="flex flex-wrap items-end justify-between gap-4 border border-white/10 p-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-200">{productLabels[order.product]} · {order.stage.replaceAll('_',' ')}</p>
            <h3 className="mt-2 font-black">{order.variant_id}</h3>
            <p className="mt-2 max-w-lg text-xs text-stone-400">To: {order.buying_agent||'Agent'} · {order.destination||'Destination on original order'}</p>
            {order.task_id&&<p className="mt-1 text-[10px] text-emerald-200">Already assigned · change Manager to reassign</p>}
            {order.product==='daisy'&&!order.preparation_released_at&&<p className="mt-2 text-xs text-amber-200">Administration must confirm the Agent-reported cake payment first. <Link href="/admin/cakes" className="underline">Open Daisy Pastries verification</Link></p>}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-stone-300">Manager
              <select value={assignees[order.product+order.id]||order.manager_id||''}
                onChange={e=>setAssignees(v=>({...v,[order.product+order.id]:e.target.value}))}
                className="mt-2 block min-w-56 border border-white/10 bg-[#17221d] p-3">
                <option value="">Choose approved kitchen staff</option>
                {approved.map(person=><option value={person.id} key={person.id}>{person.name||person.username}</option>)}
              </select>
            </label>
            <button type="button" disabled={busy===order.id||!(assignees[order.product+order.id]||order.manager_id)||(order.product==='daisy'&&!order.preparation_released_at)}
              onClick={()=>void update({action:'assign',managerId:assignees[order.product+order.id]||order.manager_id,product:order.product,orderId:order.id},order.id,'Paid food order assigned to selected Manager.')}
              className="bg-amber-300 px-4 py-3 text-xs font-black text-black disabled:opacity-40">Assign order</button>
          </div>
        </article>)}
        {!orders.length&&<p className="border border-dashed border-white/10 p-7 text-xs text-stone-500">No paid uncompleted food orders are available for assignment.</p>}
      </div>
    </section>
  </main>
}
