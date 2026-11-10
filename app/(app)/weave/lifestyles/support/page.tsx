'use client'
import Link from 'next/link'
import {useCallback,useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
type Person={id:string;name:string;role?:string;managerKinds?:string[]}
type SupportCase={id:string;worker_id:string;manager_id:string;worker_name:string;manager_name:string;purpose:string;description:string;task_reference:string|null;status:string;requested_amount:number;offered_amount:number|null;terms:string|null;principal:number|null;repaid:number|null;currency:string|null;funding_reference:string|null;created_at:string}
type Message={id:string;message:string;author_id:string;author_name:string;created_at:string}
type Workspace={cases:SupportCase[];managers:Person[];kinds:string[];team:Person[];candidates:Person[]}
const money=(v:unknown)=>Number(v||0).toLocaleString('en-NG',{maximumFractionDigits:2})
const purposeLabel=(p:string)=>p==='food_stock'?'Food stock (NGN)':p==='system_switch'?'System Switch credit':'Work guidance'
export default function CompanySupportWorkspace(){
 const {user,token}=useAuth()
 const [state,setState]=useState<Workspace>({cases:[],managers:[],kinds:[],team:[],candidates:[]})
 const [selected,setSelected]=useState<string>('')
 const [messages,setMessages]=useState<Message[]>([])
 const [managerId,setManagerId]=useState('')
 const [purpose,setPurpose]=useState('guidance')
 const [description,setDescription]=useState('')
 const [reference,setReference]=useState('')
 const [amount,setAmount]=useState('')
 const [message,setMessage]=useState('')
 const [terms,setTerms]=useState('')
 const [offerAmount,setOfferAmount]=useState('')
 const [proof,setProof]=useState('')
 const [repayAmount,setRepayAmount]=useState('')
 const [search,setSearch]=useState('')
 const [workerAssign,setWorkerAssign]=useState('')
 const [managerAssign,setManagerAssign]=useState('')
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [loading,setLoading]=useState(true)
 const auth=useCallback(()=>({Authorization:'Bearer '+token,'Content-Type':'application/json'}),[token])
 const load=useCallback(async()=>{
  if(!token)return
  try{
   const response=await fetch('/api/company-support',{headers:auth(),cache:'no-store'})
   const data=await response.json()
   if(!response.ok)throw new Error(data.error||'Support unavailable')
   setState({cases:data.cases||[],managers:data.managers||[],kinds:data.kinds||[],team:data.team||[],candidates:[]})
   setSelected(current=>current&&data.cases?.some((c:SupportCase)=>c.id===current)?current:(data.cases?.[0]?.id||''))
   setError('')
  }catch(e){setError(e instanceof Error?e.message:'Support unavailable')}
  finally{setLoading(false)}
 },[token,auth])
 const loadMessages=useCallback(async(id:string)=>{
  if(!id||!token)return
  const res=await fetch('/api/company-support?caseId='+encodeURIComponent(id),{headers:auth(),cache:'no-store'})
  const data=await res.json()
  if(res.ok)setMessages(data.messages||[])
 },[token,auth])
 useEffect(()=>{void load()},[load])
 useEffect(()=>{if(selected)void loadMessages(selected)},[selected,loadMessages])
 const act=async(action:string,extra:Record<string,unknown>={})=>{
  if(!token||busy)return
  setBusy(true);setError('');setNotice('')
  try{
   const res=await fetch('/api/company-support',{method:'POST',headers:auth(),body:JSON.stringify({action,caseId:selected,...extra})})
   const data=await res.json()
   if(!res.ok)throw new Error(data.error||'Action failed')
   setNotice(action.replaceAll('_',' ')+' recorded.')
   if(action==='message')setMessage('')
   if(action==='create'){setDescription('');setAmount('');setReference('');setSelected(data.case.id)}
   await load()
   if(selected||data.case?.id)await loadMessages(data.case?.id||selected)
  }catch(e){setError(e instanceof Error?e.message:'Unable to save')}
  finally{setBusy(false)}
 }
 const lookup=async()=>{
  if(!token||search.trim().length<2)return
  try{
   const res=await fetch('/api/company-support?search='+encodeURIComponent(search),{headers:auth(),cache:'no-store'})
   const data=await res.json()
   if(!res.ok)throw new Error(data.error||'Search failed')
   setState(current=>({...current,candidates:data.candidates||[]}))
  }catch(e){setError(e instanceof Error?e.message:'Search failed')}
 }
 const active=state.cases.find(c=>c.id===selected)
 const isWorker=active?.worker_id===user?.id
 const isManager=active?.manager_id===user?.id && state.kinds.length>0
 const isAdmin=user?.role==='admin'
 const canOffer=(isManager||isAdmin)&&active?.status==='open'
 const due=Math.max(0,Number(active?.principal||0)-Number(active?.repaid||0))
 return <main className="weave-operating-environment mx-auto max-w-6xl space-y-5 px-3 py-6 text-white sm:px-6" data-company-manager-support="true">
  <Link href={isAdmin?'/admin/dashboard':'/weave/lifestyles/work'} className="text-xs font-bold text-cyan-200">← Company workspace</Link>
  <header className="rounded-2xl border border-cyan-200/25 bg-gradient-to-br from-[#092e3e] to-[#080f1c] p-5">
   <p className="text-[10px] font-black uppercase tracking-[.18em] text-amber-200">Weave of Presence · A Time · Company work</p>
   <h1 className="mt-2 text-2xl font-black sm:text-3xl">Manager Support & Work Continuity</h1>
   <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">Speak privately about a task that cannot be completed. Record the obstacle, agree on the next action, and follow an authorized advance through funding and verified recovery.</p>
   <p className="mt-2 text-xs text-amber-100">System Switch support is a recoverable internal credit funded by a real wallet. NGN stock support requires independent payment verification; off-platform cash is never automatically collected.</p>
  </header>
  {loading&&<p className="text-sm text-slate-300">Opening verified support assignments…</p>}
  {error&&<p role="alert" className="rounded-xl border border-rose-300/30 p-3 text-sm text-rose-200">{error}</p>}
  {notice&&<p role="status" className="rounded-xl border border-emerald-300/30 p-3 text-sm text-emerald-100">{notice}</p>}
  {user?.role!=='admin'&&state.managers.length>0&&<section className="rounded-2xl border border-white/15 bg-slate-950/60 p-4">
   <h2 className="text-lg font-black">Request one-to-one work support</h2>
   <p className="mt-1 text-xs text-slate-300">Choose the authorized manager assigned to you and explain what is stopping the current task.</p>
   <div className="mt-3 grid gap-3 sm:grid-cols-2">
    <label className="text-xs font-bold">My manager<select className="mt-1 w-full rounded-lg border border-white/20 bg-slate-900 p-3" value={managerId} onChange={e=>setManagerId(e.target.value)}>
     <option value="">Choose assigned manager</option>{state.managers.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
    </select></label>
    <label className="text-xs font-bold">Support needed<select className="mt-1 w-full rounded-lg border border-white/20 bg-slate-900 p-3" value={purpose} onChange={e=>setPurpose(e.target.value)}>
     <option value="guidance">Guidance · no money</option><option value="system_switch">System Switch credit</option><option value="food_stock">Food stock · NGN</option>
    </select></label>
    <label className="text-xs font-bold">Task or order reference<input className="mt-1 w-full rounded-lg border border-white/20 bg-slate-900 p-3" placeholder="Customer order, prospect or job ID" value={reference} onChange={e=>setReference(e.target.value)}/></label>
    {purpose!=='guidance'&&<label className="text-xs font-bold">Requested amount ({purpose==='food_stock'?'₦':'System Switch'})<input type="number" min=".000001" step="any" className="mt-1 w-full rounded-lg border border-white/20 bg-slate-900 p-3" value={amount} onChange={e=>setAmount(e.target.value)}/></label>}
   </div>
   <label className="mt-3 block text-xs font-bold">What needs help?<textarea rows={3} maxLength={1800} className="mt-1 w-full rounded-lg border border-white/20 bg-slate-900 p-3" placeholder="Explain the task, what you have already done and the obstacle." value={description} onChange={e=>setDescription(e.target.value)}/></label>
   <button disabled={busy||!managerId||description.trim().length<15} onClick={()=>void act('create',{managerId,purpose,description,taskReference:reference,amount:purpose==='guidance'?0:Number(amount)})} className="mt-3 min-h-11 rounded-lg bg-cyan-300 px-5 text-sm font-black text-slate-950 disabled:opacity-40">Send support request</button>
  </section>}
  {user?.role!=='admin'&&!state.managers.length&&!state.kinds.length&&!loading&&<p className="rounded-xl border border-amber-300/25 p-4 text-sm text-amber-100">You do not have an assigned support manager yet. Administrations must assign your manager, or a verified distribution-team relationship must exist.</p>}
  {isAdmin&&<section className="rounded-2xl border border-amber-300/25 p-4">
   <h2 className="text-lg font-black">Administrations · Employee to Manager assignments</h2>
   <p className="mt-1 text-xs text-slate-300">Search by employee name, then assign an active Agent or Bridger to a verified Manager. Assigned managers receive support messages only within their authorized cases.</p>
   <div className="mt-3 flex gap-2"><input className="min-w-0 flex-1 rounded-lg border border-white/20 bg-slate-900 p-3 text-sm" placeholder="Search workers and managers" value={search} onChange={e=>setSearch(e.target.value)}/><button onClick={()=>void lookup()} className="rounded-lg border border-cyan-200/50 px-4 text-sm">Search</button></div>
   <div className="mt-3 grid gap-3 sm:grid-cols-2">
    <label className="text-xs">Employee<select className="mt-1 w-full rounded-lg border border-white/20 bg-slate-900 p-3" value={workerAssign} onChange={e=>setWorkerAssign(e.target.value)}>
     <option value="">Select employee</option>{state.candidates.map(p=><option key={p.id} value={p.id}>{p.name} · {p.role}</option>)}
    </select></label>
    <label className="text-xs">Approved manager<select className="mt-1 w-full rounded-lg border border-white/20 bg-slate-900 p-3" value={managerAssign} onChange={e=>setManagerAssign(e.target.value)}>
     <option value="">Select manager</option>{state.candidates.filter(p=>(p.managerKinds||[]).length>0).map(p=><option key={p.id} value={p.id}>{p.name} · {(p.managerKinds||[]).join(', ')}</option>)}
    </select></label>
   </div>
   <p className="mt-2 text-xs text-slate-400">For managers not present in this name search, search their name separately, then choose the employee and manager within the same search result. Assignments are auditable.</p>
   <button disabled={busy||!workerAssign||!managerAssign} onClick={()=>void act('assign',{workerId:workerAssign,managerId:managerAssign,active:true})} className="mt-3 min-h-11 rounded-lg bg-amber-200 px-4 text-sm font-bold text-slate-950 disabled:opacity-40">Authorize assignment</button>
  </section>}
  <div className="grid gap-4 lg:grid-cols-[minmax(15rem,.75fr)_minmax(0,1.25fr)]">
   <section className="rounded-2xl border border-white/15 p-3">
    <div className="flex items-center justify-between gap-3 p-2"><h2 className="font-bold">Support conversations</h2><button onClick={()=>void load()} className="text-xs text-cyan-200">Refresh</button></div>
    <div className="max-h-[38rem] space-y-2 overflow-y-auto">{state.cases.map(c=><button key={c.id} onClick={()=>setSelected(c.id)} className={'w-full rounded-xl border p-3 text-left '+(selected===c.id?'border-cyan-200/60 bg-cyan-200/10':'border-white/10 bg-white/[.025]')}>
      <div className="flex justify-between gap-2"><strong className="text-sm">{c.worker_name} · {purposeLabel(c.purpose)}</strong><span className="text-[10px] text-amber-200">{c.status}</span></div>
      <p className="mt-1 text-xs text-slate-300">{c.manager_name} · {new Date(c.created_at).toLocaleDateString('en-NG')}</p>
      <p className="mt-2 line-clamp-2 text-xs text-slate-400">{c.description}</p>
     </button>)}
     {!state.cases.length&&!loading&&<p className="p-3 text-xs text-slate-400">No support requests yet.</p>}
    </div>
   </section>
   {active&&<section className="min-w-0 space-y-4 rounded-2xl border border-cyan-200/20 p-4">
    <header>
     <h2 className="text-lg font-black">{active.worker_name} · {purposeLabel(active.purpose)}</h2>
     <p className="mt-1 text-xs text-slate-300">Manager: {active.manager_name} · Status: {active.status}</p>
     <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-100">{active.description}</p>
     {active.task_reference&&<p className="mt-1 text-xs text-amber-200">Task reference: {active.task_reference}</p>}
     <p className="mt-2 text-xs">Requested: {active.purpose==='guidance'?'Guidance':money(active.requested_amount)+(active.purpose==='food_stock'?' NGN':' System Switch')}</p>
     {active.terms&&<div className="mt-3 rounded-lg border border-amber-200/25 p-3"><p className="text-xs font-black text-amber-100">Written support terms · {active.offered_amount?money(active.offered_amount):'Guidance only'}</p><p className="mt-2 whitespace-pre-wrap text-xs leading-5">{active.terms}</p></div>}
     {active.principal!=null&&<p className="mt-3 text-sm font-bold text-cyan-100">Recoverable principal: {money(active.principal)} {active.currency} · Repaid: {money(active.repaid)} · Outstanding: {money(due)}</p>}
    </header>
    <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/40 p-3">
     {messages.map(m=><div key={m.id} className={'rounded-lg border p-3 '+(m.author_id===user?.id?'border-cyan-200/30 bg-cyan-200/10':'border-white/10')}>
       <p className="text-[10px] text-cyan-200">{m.author_name} · {new Date(m.created_at).toLocaleString('en-NG')}</p>
       <p className="mt-2 whitespace-pre-wrap break-words text-sm">{m.message}</p>
     </div>)}
    </div>
    <label className="block text-xs font-bold">Private reply<textarea className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3" maxLength={2500} rows={3} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Clarify a task, request a record, or provide instructions."/></label>
    <button disabled={busy||message.trim().length<2} onClick={()=>void act('message',{message})} className="min-h-11 rounded-lg border border-cyan-200/50 px-5 text-sm font-bold disabled:opacity-40">Send private reply</button>
    {canOffer&&<div className="space-y-2 border-t border-white/15 pt-4">
     <h3 className="font-bold">Offer authorized support</h3>
     {active.purpose!=='guidance'&&<label className="block text-xs">Principal ({active.purpose==='food_stock'?'NGN':'System Switch'})<input type="number" min=".000001" step="any" value={offerAmount} onChange={e=>setOfferAmount(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-slate-900 p-3"/></label>}
     <label className="block text-xs">Repayment and task agreement<textarea rows={4} maxLength={1600} value={terms} onChange={e=>setTerms(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-slate-900 p-3" placeholder="State the supported service, principal, currency, zero-interest terms, recovery from eligible earnings, and dispute process."/></label>
     <button disabled={busy} onClick={()=>void act('offer',{amount:active.purpose==='guidance'?0:Number(offerAmount),terms})} className="min-h-11 rounded-lg bg-cyan-300 px-4 text-xs font-bold text-slate-950 disabled:opacity-40">Send offer for worker acceptance</button>
    </div>}
    {isWorker&&active.status==='offered'&&<div className="space-y-2 border-t border-white/15 pt-4">
     <p className="text-xs text-amber-100">Read the terms carefully. Accepting creates the agreed repayment obligation only if funds are actually advanced.</p>
     <div className="flex flex-wrap gap-2"><button onClick={()=>void act('accept')} disabled={busy} className="min-h-11 rounded-lg bg-emerald-300 px-4 text-xs font-black text-slate-950">Accept terms</button><button disabled={busy} onClick={()=>void act('decline')} className="min-h-11 rounded-lg border border-white/25 px-4 text-xs">Decline</button></div>
    </div>}
    {(isManager||isAdmin)&&active.status==='accepted'&&active.purpose==='system_switch'&&<div className="border-t border-white/15 pt-4">
     <p className="text-xs text-amber-100">Funding debits your own funded System Switch wallet and credits the employee. This is not a company treasury transfer.</p>
     <button onClick={()=>void act('fund')} disabled={busy} className="mt-2 min-h-11 rounded-lg bg-amber-200 px-4 text-xs font-black text-slate-950">Fund accepted advance from my wallet</button>
    </div>}
    {isAdmin&&active.status==='accepted'&&active.purpose==='food_stock'&&<div className="space-y-2 border-t border-white/15 pt-4">
     <p className="text-xs font-black">Verify real stock funding</p><input value={proof} onChange={e=>setProof(e.target.value)} placeholder="Unique verified supplier/payment reference" className="w-full rounded-lg border border-white/20 bg-slate-900 p-3 text-xs"/>
     <button disabled={busy||proof.length<12} onClick={()=>void act('record_stock_funding',{reference:proof})} className="min-h-11 rounded-lg bg-amber-200 px-4 text-xs font-bold text-slate-950">Record verified stock support</button>
    </div>}
    {isAdmin&&active.currency==='NGN'&&due>0&&<div className="space-y-2 border-t border-white/15 pt-4">
     <p className="text-xs font-black">Verify actual NGN repayment</p>
     <input value={repayAmount} onChange={e=>setRepayAmount(e.target.value)} type="number" min="0.01" step="0.01" placeholder="Verified amount" className="w-full rounded-lg border border-white/20 bg-slate-900 p-3 text-xs"/>
     <input value={proof} onChange={e=>setProof(e.target.value)} placeholder="Unique received payment reference" className="w-full rounded-lg border border-white/20 bg-slate-900 p-3 text-xs"/>
     <button disabled={busy||proof.length<12} onClick={()=>void act('record_stock_repayment',{amount:Number(repayAmount),reference:proof})} className="min-h-11 rounded-lg border border-cyan-200/50 px-4 text-xs">Record verified repayment</button>
    </div>}
    {['open','accepted','funded'].includes(active.status)&&due===0&&<button disabled={busy} onClick={()=>void act('resolve')} className="min-h-11 rounded-lg border border-white/20 px-4 text-xs">Resolve completed support case</button>}
   </section>}
  </div>
  <p className="text-xs text-slate-400">All approval, worker acceptance, funding and repayment actions are recorded. Managers cannot authorize third-party debits, invent stock payments or collect another worker’s earnings without the accepted terms.</p>
 </main>
}
