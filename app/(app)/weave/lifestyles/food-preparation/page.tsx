'use client'
import { useCallback,useEffect,useState,type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowLeft,ClipboardList,PackageCheck,Truck,ChefHat,RefreshCcw,ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { EmploymentActions } from '@/components/employment/employment-actions'

type PreparationTask={
  id:string;product:'agility'|'electrolyte'|'ember'|'daisy';source_order_id:string;stage:string;next_stage:string|null;
  item:string;package_count:number;delivery_location:string|null;delivery_phone:string|null;
  customer_name?:string|null;purchasing_agent?:string|null;occasion?:string|null;size_option?:string|null;
  payment_status:string;recorded_handoffs:number;assigned_at:string;
  assigned_appointment_id:string;assigned_position:FoodPosition;assigned_staff_name:string
}
type FoodPosition='manager'|'assistant'
type Appointment={id:string;position:FoodPosition;status:'pending'|'approved'|'rejected'|'revoked';application_note:string;review_note?:string|null;monthly_salary_ngn:string}
type Staff={id:string;agent_id:string;position:FoodPosition;name:string;username:string}
type State={eligible:boolean;appointment:Appointment|null;openings:Record<FoodPosition,{capacity:number;remaining:number}>;tasks:PreparationTask[];team:Staff[];isLead:boolean;duties:string[];salaryNgn:number|null;payrollStatus:string}
const money=(amount:number)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(amount)
const productName=(product:string)=>product==='daisy'?'Daisy Pastries':product==='electrolyte'?'Electrolyte':product==='ember'?'Ember':'Agility'

export default function FoodPreparationManagerPage(){
  const {user,token,isInitialized}=useAuth()
  const [data,setData]=useState<State|null>(null)
  const [note,setNote]=useState('')
  const [position,setPosition]=useState<FoodPosition>('manager')
  const [handoffs,setHandoffs]=useState<Record<string,string>>({})
  const [assignees,setAssignees]=useState<Record<string,string>>({})
  const [assignmentNotes,setAssignmentNotes]=useState<Record<string,string>>({})
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const load=useCallback(async()=>{
    if(!token)return
    try{
      const result=await fetch('/api/weave/lifestyles/food-preparation',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
      const body=await result.json()
      if(!result.ok)throw new Error(body.error||'Food Preparation Manager unavailable')
      setData(body);setError('')
    }catch(cause){setError(cause instanceof Error?cause.message:'Unable to load position')}
  },[token])
  useEffect(()=>{void load()},[load])
  async function apply(event:FormEvent){
    event.preventDefault()
    if(!token)return
    setBusy('apply');setError('');setMessage('')
    try{
      const result=await fetch('/api/weave/lifestyles/food-preparation',{
        method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body:JSON.stringify({applicationNote:note,position}),
      })
      const body=await result.json()
      if(!result.ok)throw new Error(body.error||'Application was not recorded')
      setMessage(body.message);setNote('');await load()
    }catch(cause){setError(cause instanceof Error?cause.message:'Application was not recorded')}
    finally{setBusy('')}
  }
  async function move(task:PreparationTask){
    if(!token||!task.next_stage)return
    setBusy(task.id);setError('');setMessage('')
    try{
      const result=await fetch('/api/weave/lifestyles/food-preparation',{
        method:'PATCH',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body:JSON.stringify({taskId:task.id,stage:task.next_stage,note:handoffs[task.id]||''}),
      })
      const body=await result.json()
      if(!result.ok)throw new Error(body.error||'Work handoff could not be recorded')
      setMessage(body.message);setHandoffs(current=>({...current,[task.id]:''}))
      await load()
    }catch(cause){setError(cause instanceof Error?cause.message:'Work handoff could not be recorded')}
    finally{setBusy('')}
  }
  async function assign(task:PreparationTask){
    if(!token||!data?.isLead)return
    const assigneeId=assignees[task.id]||data.appointment?.id
    setBusy(task.id);setError('');setMessage('')
    try{
      const result=await fetch('/api/weave/lifestyles/food-preparation',{
        method:'PATCH',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body:JSON.stringify({action:'assign',taskId:task.id,assigneeId,note:assignmentNotes[task.id]||''}),
      })
      const body=await result.json()
      if(!result.ok)throw new Error(body.error||'Stability assignment failed')
      setMessage(body.message);setAssignmentNotes(v=>({...v,[task.id]:''}));await load()
    }catch(cause){setError(cause instanceof Error?cause.message:'Unable to assign work')}
    finally{setBusy('')}
  }
  if(!isInitialized)return <main className="p-6 text-white">Opening Food Preparation Manager Lifestyle…</main>
  if(!user||user.role!=='agent')return <main className="p-6 text-white"><h1 className="text-2xl font-black">Food Preparation Manager</h1><p className="mt-4 text-sm">Only registered Agents may apply for this position.</p></main>
  return <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 text-white" data-weave-food-preparation-manager="agent-employment">
    <div className="flex flex-wrap items-center gap-4 text-xs text-amber-200"><Link href="/weave/lifestyles" className="inline-flex items-center gap-2"><ArrowLeft className="h-4 w-4"/> WEAVE Lifestyle</Link><Link href="/weave/lifestyles/work">My approved workspaces →</Link></div>
    <header className="mt-6 border-b border-white/10 pb-6">
      <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-amber-200"><ChefHat className="h-4 w-4"/> Agent Employment · Food Operations</p>
      <h1 className="mt-2 text-3xl font-black md:text-5xl">FOOD PREPARATION TEAM</h1>
      <p className="mt-4 text-sm text-emerald-200">One Stability Lead Manager heads the Agent food department and assigns verified orders to two Assistant Food Preparation Managers.</p>
      {data?.appointment && data.salaryNgn !== null && <p data-applicant-salary="submitted-application" className="mt-4 text-2xl font-black text-emerald-200">{money(data.salaryNgn)} <span className="text-sm font-normal text-stone-300">monthly employment terms · {data.appointment.position==='manager'?'Manager':'Assistant Manager'}</span></p>}
      <p className="mt-3 max-w-4xl text-sm leading-6 text-stone-300">
        Coordinate and support preparation, packaging and dispatch of Agility, Electrolyte, Ember and Daisy Pastries for verified customer and Agent supply orders.
        Your work follows actual verified orders. The Lead controls team assignments, and each preparation and dispatch handoff is recorded.
      </p>
      <p className="mt-3 text-xs leading-5 text-amber-100">Administration verifies Food Preparation employment applications. Approval opens the position, while the approved Stability Lead organizes day-to-day preparation and assigns tasks to assistants. The salary is an employment term, not an automatic wallet transfer.</p>
    </header>
    {error&&<p role="alert" className="mt-5 border border-rose-300/20 px-4 py-3 text-xs text-rose-200">{error}</p>}
    {message&&<p role="status" className="mt-5 border border-emerald-300/20 px-4 py-3 text-xs text-emerald-200">{message}</p>}
    <div className="mt-6 grid gap-3 md:grid-cols-4">
      {[
        ['1','Receive a verified order'],['2','Prepare to specification'],
        ['3','Package, seal and label'],['4','Dispatch and record handoff'],
      ].map(([n,label])=><div key={n} className="border border-white/10 p-4">
        <p className="text-sm font-black text-amber-200">{n}</p><p className="mt-3 text-xs font-bold text-white">{label}</p>
      </div>)}
    </div>
    <section className="mt-8 grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
      <div>
        <h2 className="text-xl font-black">Your position</h2>
        {data?.appointment?<div className="mt-4 border border-white/10 p-5">
          <p className="text-xs font-black uppercase text-amber-200">{data.appointment.position==='manager'?'Food Preparation Manager':'Assistant Food Preparation Manager'} · Appointment: {data.appointment.status==='pending'?'Application awaiting Administration review':data.appointment.status==='approved'?'Approved employment':data.appointment.status==='rejected'?'Application declined':data.appointment.status==='revoked'?'Position ended':data.appointment.status}</p>
          <EmploymentActions position="food_preparation" onStatusChange={()=>void load()}/>
          {data.appointment.review_note&&<p className="mt-3 text-xs text-stone-400">Administration: {data.appointment.review_note}</p>}
          {data.appointment.status==='approved'&&<p className="mt-3 text-xs text-emerald-200">{data.appointment.position==='manager'?'You lead WEAVE Stability food operations. Assign work to approved assistants or prepare the order yourself.':'The WEAVE Stability Lead Manager assigns your preparation orders. You may only move orders assigned to you.'}</p>}
        </div>:<p className="mt-4 text-xs text-stone-500">No food preparation position application recorded yet.</p>}
        {data?.eligible && (!data.appointment||['rejected','revoked'].includes(data.appointment.status))&&
        <form onSubmit={apply} className="mt-4 border border-amber-300/20 p-5">
          <h3 className="text-sm font-black">Apply for one available position</h3>
          <section data-food-preparation-employment-document="before-application" className="mt-4 space-y-2 border border-amber-300/25 bg-amber-300/[.035] p-4">
            <p className="text-xs font-black uppercase tracking-wide text-amber-200">Position employment terms · Read before applying</p>
            <p className="text-sm text-stone-200">Selected: {position==='manager'?'Food Preparation Manager':'Assistant Food Preparation Manager'}</p>
            <p className="text-2xl font-black text-white">{position==='manager'?'₦70,000':'₦40,000'} <span className="text-xs font-normal text-stone-300">monthly salary term</span></p>
            <p className="text-xs leading-5 text-stone-300">Lead duties: coordinate verified food orders and allocate preparation to approved assistants. Assistant duties: prepare, package, and dispatch only assigned orders. Employment requires Administration approval. This stated monthly term is not an automatic wallet credit; actual payroll processing and verification remain separate.</p>
          </section>
          <div className="mt-3 grid gap-2">
            {(['manager','assistant'] as const).map(role=><label key={role} className="flex items-center gap-3 border border-white/10 p-3 text-xs">
              <input type="radio" name="foodPosition" value={role} checked={position===role}
                disabled={!data.openings[role].remaining} onChange={()=>setPosition(role)}/>
              <span>{role==='manager'?'Food Preparation Manager':'Assistant Food Preparation Manager'} · {data.openings[role].remaining} of {data.openings[role].capacity} application places available</span>
            </label>)}
          </div>
          <label className="mt-3 block text-xs leading-5 text-stone-300">Describe your food-handling experience, preparation and packaging ability, available work hours and how you can organize delivery.
            <textarea required minLength={40} maxLength={2000} rows={6} value={note} onChange={e=>setNote(e.target.value)}
              className="mt-3 block w-full border border-white/15 bg-[#151920] p-3 text-sm text-white"/>
          </label>
          <button type="submit" disabled={busy==='apply'||note.trim().length<40||!data.openings[position].remaining} className="mt-4 bg-amber-300 px-4 py-3 text-xs font-black text-black disabled:opacity-40">Submit application to Administration</button>
        </form>}
        {data&&!data.eligible&&<p className="mt-4 text-xs text-stone-500">An active Agent account is required before an application can proceed.</p>}
        <h2 className="mt-8 text-lg font-black">Daily responsibilities</h2>
        <div className="mt-3 space-y-3">{[
          'Receive verified Agility, Electrolyte and Ember orders; the Manager coordinates the kitchen while Assistants support assigned work.',
          'Prepare fresh Ember boxes, bowls and packages to the correct ingredient and size specification.',
          'Prepare Daisy Pastries only after the cake order payment is verified.',
          'Check ordered quantities, labels, packaging and delivery destinations.',
          'Dispatch orders to the correct Agent or customer and record each handoff.',
          'Report delays, damage, food safety concerns and missing stock to Administration.',
        ].map((d,i)=><p key={i} className="border-l border-amber-300/20 pl-3 text-xs leading-6 text-stone-300">{d}</p>)}</div>
      </div>
      <div data-food-preparation-work-queue>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-[10px] uppercase tracking-[.15em] text-stone-500">Approved orders only</p><h2 className="mt-2 text-xl font-black">{data?.isLead?'Stability team · assignment and delivery queue':'My preparation & delivery queue'}</h2></div>
          <button type="button" onClick={()=>void load()} className="inline-flex items-center gap-2 border border-white/15 px-4 py-2 text-xs"><RefreshCcw className="h-4 w-4"/> Refresh</button>
        </div>
        {!data?.appointment||data.appointment.status!=='approved'?
          <p className="mt-5 border border-dashed border-white/10 p-6 text-xs leading-6 text-stone-500">The work desk opens after Administration approves your employment. The approved Stability Lead assigns verified paid food orders to the preparation team.</p>:
          !data.tasks.length?<p className="mt-5 border border-dashed border-white/10 p-6 text-xs text-stone-500">No preparation orders have been assigned to you.</p>:
          <div className="mt-4 space-y-4">{data.tasks.map(task=><article key={task.id} className="border border-white/10 bg-white/[.025] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200">{productName(task.product)} · {task.stage?.replaceAll('_',' ')}</p>
              <p className="text-[10px] text-stone-500">{task.recorded_handoffs} recorded handoffs</p>
            </div>
            <h3 className="mt-3 text-lg font-black">{task.item}{task.occasion?` · ${task.occasion}`:''}</h3>
            <p className="mt-2 text-xs leading-5 text-stone-400">Packages: {task.package_count} · Ordering Agent: {task.purchasing_agent||'WEAVE Agent'}</p>
            {data?.isLead&&<p className="mt-2 text-xs font-semibold text-amber-200">Assigned to {task.assigned_staff_name||task.assigned_position} ({task.assigned_position==='assistant'?'Assistant':'Lead Manager'})</p>}
            {data?.isLead&&task.next_stage&&<div className="mt-4 space-y-3 border border-amber-300/20 p-3" data-stability-lead-assignment>
              <p className="text-xs font-black text-amber-200">Head of Agent Department · Assign to Assistant</p>
              <label className="block text-xs text-stone-300">Responsible preparation staff
                <select className="mt-2 block w-full border border-white/10 bg-[#141b1a] p-3 text-white"
                  value={assignees[task.id]||task.assigned_appointment_id}
                  onChange={e=>setAssignees(v=>({...v,[task.id]:e.target.value}))}>
                  <option value={data.appointment?.id||''}>Lead Manager · Keep or reclaim</option>
                  {data.team.map(person=><option key={person.id} value={person.id}>{person.name||person.username} · Assistant Manager</option>)}
                </select>
              </label>
              <label className="block text-xs text-stone-300">Assignment / handoff reason
                <textarea minLength={12} maxLength={800} rows={2} value={assignmentNotes[task.id]||''}
                  onChange={e=>setAssignmentNotes(v=>({...v,[task.id]:e.target.value}))}
                  className="mt-2 block w-full border border-white/15 bg-[#141b1a] p-3 text-white"/>
              </label>
              <button type="button" disabled={busy===task.id||(assignmentNotes[task.id]||'').trim().length<12}
                onClick={()=>void assign(task)} className="bg-amber-300 px-4 py-3 text-xs font-black text-black disabled:opacity-40">
                Assign / Reassign preparation order
              </button>
            </div>}
            {task.customer_name&&<p className="mt-1 text-xs text-stone-400">Daisy customer: {task.customer_name}</p>}
            <p className="mt-2 text-xs text-stone-400">Receiving location: {task.delivery_location||'Confirm with Administration'}</p>
            <p className="mt-1 text-xs text-stone-400">Recipient contact: {task.delivery_phone||'Ask Administration'}</p>
            {task.next_stage&&task.assigned_appointment_id===data.appointment?.id?<div className="mt-4 border-t border-white/10 pt-4">
              <p className="text-xs font-bold text-amber-200">Next: {task.next_stage.replaceAll('_',' ')}</p>
              <label className="mt-3 block text-xs text-stone-300">Work completed / packaging check / dispatcher or waybill details (required)
                <textarea rows={3} minLength={12} maxLength={800} value={handoffs[task.id]||''}
                  onChange={e=>setHandoffs(current=>({...current,[task.id]:e.target.value}))}
                  className="mt-2 w-full border border-white/15 bg-[#141b1a] p-3 text-sm text-white"/>
              </label>
              <button type="button" onClick={()=>void move(task)} disabled={busy===task.id||(handoffs[task.id]||'').trim().length<12}
                className="mt-3 inline-flex items-center gap-2 bg-emerald-300 px-4 py-3 text-xs font-black text-black disabled:opacity-40">
                <PackageCheck className="h-4 w-4"/> Record {task.next_stage.replaceAll('_',' ')}
              </button>
            </div>:<p className="mt-3 inline-flex items-center gap-2 text-xs text-sky-200"><Truck className="h-4 w-4"/> {task.next_stage?'Assigned staff handle preparation and dispatch.':'Production handoff complete. Final delivery/receipt is confirmed separately.'}</p>}
          </article>)}</div>}
      </div>
    </section>
  </main>
}
