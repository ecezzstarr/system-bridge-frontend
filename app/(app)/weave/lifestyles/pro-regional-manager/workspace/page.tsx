'use client'
import Link from 'next/link'
import {useCallback,useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
import {ClientFileFolder3D} from '@/components/system-switch/client-file-folder-3d'
import FileFolderOpenWorld from '@/components/system-switch/file-folder-open-world'
import ClientCustomerDoorPanel from '@/components/system-switch/client-customer-door-panel'

type Surface='command'|'builds'|'business'|'enterprise'|'sound'
type ProData={
 active:boolean;position:{type:string;originalRole:'agent'|'bridger';department:string;
  workScope:string;dailyWork:string;businessName:string;fileNumber:string|null;
  territory:{country:string;region:string;city:string;address:string};
  businessPlan:Record<string,string>;dailyWorkPlan:string;
  agreedMonthlySalaryUSDT:number;employmentTermsReference:string;
  applicationStatus:string;activationStatus:string};
 world?:any;businessStore?:any;
 activity?:Array<{id:string;activity_type:string;title:string;organization:string|null;
  details:string|null;next_action:string|null;status:string;created_at:string}>;
 message?:string
}
const workTypes=[
 ['business_contact','Business contact'],['partnership','Enterprise partnership'],
 ['department_operation','Department operations'],['customer_service','Customer service'],
 ['follow_up','Follow-up'],['company_report','Company report'],
] as const
const statuses=['planned','in_progress','completed','blocked']
const headers=(token:string)=>({Authorization:'Bearer '+token,'Content-Type':'application/json'})
const formatType=(value:string)=>value.replaceAll('_',' ')

export default function ProRegionalManagerWorkspace(){
 const {user,token,isInitialized}=useAuth()
 const [data,setData]=useState<ProData|null>(null)
 const [surface,setSurface]=useState<Surface>('command')
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [draft,setDraft]=useState({activityType:'business_contact',title:'',organization:'',
  details:'',nextAction:''})
 const load=useCallback(async()=>{
  if(!token)return
  const response=await fetch('/api/pro-regional-manager/workspace',{
   headers:{Authorization:'Bearer '+token},cache:'no-store'})
  const body=await response.json()
  if(!response.ok)throw new Error(body.error||'Pro workspace unavailable')
  setData(body)
 },[token])
 useEffect(()=>{
  if(!isInitialized||!token){if(isInitialized)setLoading(false);return}
  void load().catch(e=>setError(e instanceof Error?e.message:'Pro workspace unavailable'))
   .finally(()=>setLoading(false))
 },[isInitialized,token,load])
 async function record(){
  if(!token)return
  setBusy(true);setError('');setNotice('')
  try{
   const response=await fetch('/api/pro-regional-manager/workspace',{
    method:'POST',headers:headers(token),body:JSON.stringify(draft)})
   const body=await response.json()
   if(!response.ok)throw new Error(body.error||'Work record not saved')
   setDraft({activityType:'business_contact',title:'',organization:'',details:'',nextAction:''})
   setNotice('Daily company work saved.')
   await load()
  }catch(e){setError(e instanceof Error?e.message:'Unable to record work')}
  finally{setBusy(false)}
 }
 async function changeWork(id:string,status:string,nextAction:string|null){
  if(!token)return
  setBusy(true);setError('')
  try{
   const response=await fetch('/api/pro-regional-manager/workspace',{
    method:'PATCH',headers:headers(token),
    body:JSON.stringify({id,status,nextAction:nextAction||''})})
   const body=await response.json()
   if(!response.ok)throw new Error(body.error||'Unable to update work')
   await load()
  }catch(e){setError(e instanceof Error?e.message:'Unable to update work')}
  finally{setBusy(false)}
 }
 const move=(next:Surface)=>{
  setSurface(next)
  const panel=next==='business'?'pro-customer-door':next==='builds'?'pro-file-folder-builds':
   next==='enterprise'?'pro-business-progress':'pro-work-today'
  document.getElementById(panel)?.scrollIntoView({behavior:'smooth',block:'start'})
 }
 const position=data?.position
 const world=data?.world
 const store=data?.businessStore
 const builds=Array.isArray(world?.builds)?world.builds:[]
 const activeBuilds=builds.filter((b:any)=>b.status==='building').map((b:any)=>({
  id:String(b.id),title:String(b.title||'Building'),systemType:String(b.system_type||''),
  progress:Math.max(0,Math.min(1,1-Number(b.remaining_seconds||0)/
   Math.max(1,Number(b.duration_minutes||60)*60))),
 }))
 const liveSystems=(world?.systems||[]).filter((s:any)=>s.status==='active').map((s:any)=>({
  id:String(s.id),title:String(s.title),systemType:String(s.system_type),
  activity:Array.isArray(s.entries)?s.entries.length:0
 }))
 if(!isInitialized||loading)return <main className="min-h-screen p-6 text-slate-100">Reading your Pro Regional Manager workspace…</main>
 if(user?.role!=='agent'&&user?.role!=='bridger')return <main className="mx-auto max-w-3xl space-y-4 p-6 text-white">
  <h1 className="text-2xl font-semibold">Pro Regional Manager</h1>
  <p>Agent and Bridger Pro managers enter here with their existing account. External Clients use the verified Client staff entrance.</p>
  <Link href="/client/pro-verification" className="text-sky-200 underline">External Client Pro Staff Verification</Link>
  <Link href="/client/staff-workspace" className="block text-sky-200 underline">Client company workspace</Link>
 </main>
 return <main className="weave-operating-environment min-h-screen bg-[#041222] px-3 py-6 text-white md:px-6"
   data-pro-regional-manager-workspace="true">
  <div className="mx-auto max-w-7xl space-y-6">
   <nav className="flex flex-wrap gap-4 text-xs text-sky-200">
    <Link href="/weave/lifestyles">Lifestyle</Link>
    <Link href="/weave/lifestyles/pro-regional-manager">Pro Manager application</Link>
    <Link href="/weave/lifestyles/regional-manager">Ordinary Regional Manager (different position)</Link>
   </nav>
   <header className="space-y-3 rounded-2xl border border-sky-200/25 bg-[linear-gradient(125deg,#092842,#031121)] p-5 sm:p-8">
    <p className="text-xs uppercase tracking-widest text-sky-200">WEAVE of Presence · Pro File Folder</p>
    <h1 className="text-3xl font-semibold md:text-4xl">Pro Regional Manager</h1>
    <p className="text-sm text-slate-300">{position?.department||''} · {position?.businessName||'Verified business'} · {position?.territory?.country||'Operating territory pending'}</p>
    <p className="max-w-3xl text-sm leading-6 text-slate-200">Your department determines your company work. Your Pro File Folder contains your separately owned business, construction systems, customer entrance and daily records. Your existing {user.role} account remains unchanged.</p>
    <p className="font-mono text-xs text-sky-100">Pro File Number: {position?.fileNumber||'Pending independent preparation'}</p>
    <p className="text-xs text-slate-200">Agreed monthly company salary: {Number(position?.agreedMonthlySalaryUSDT)>0?
       Number(position?.agreedMonthlySalaryUSDT).toLocaleString()+' USDT':'Administration employment agreement pending'} · recorded separately from business earnings and activation.</p>
   </header>
   {error&&<p role="alert" className="rounded-xl border border-rose-300/30 p-4 text-sm text-rose-100">{error}</p>}
   {notice&&<p role="status" className="rounded-xl border border-sky-300/25 p-4 text-sm text-sky-200">{notice}</p>}
   {!data?.active&&<section className="space-y-3 rounded-xl border border-amber-200/25 p-5">
    <h2 className="text-xl font-semibold">Pro workspace not yet activated</h2>
    <p className="text-sm text-slate-300">{data?.message||'An approved Pro manager application is required first.'}</p>
    <p className="text-xs text-slate-300">Application: {position?.applicationStatus||'none'} · Activation: {position?.activationStatus||'not prepared'}</p>
    <Link href="/weave/lifestyles/pro-regional-manager" className="inline-block text-sky-200 underline">View application status</Link>
    <Link href="/weave/lifestyles/pro-regional-manager/activation" className="ml-4 inline-block text-sky-200 underline">Pro activation workspace</Link>
   </section>}
   {data?.active&&world&&<>
    <div className="grid gap-3 sm:grid-cols-4">
     {[['My Work Today','command'],['Pro File Folder','builds'],['Customer Door','business'],['Business Progress','enterprise']].map(([label,key])=>
      <button key={key} onClick={()=>move(key as Surface)}
       className="rounded-xl border border-sky-300/20 bg-slate-950/65 p-4 text-left font-semibold hover:border-sky-200">
       {label}<span className="mt-1 block text-xs font-normal text-slate-400">{surface===key?'Open':'Enter'}</span></button>)}
    </div>
    <section className="overflow-hidden rounded-2xl border border-sky-300/20" aria-label="Interactive 3D Pro File Folder">
     <ClientFileFolder3D activeSurface={surface} onSurfaceChange={move}
      activeBuilds={activeBuilds} liveSystems={liveSystems} premiumSound={false}
      fileFolderTier="pro" businessName={position?.businessName||'Pro File Folder'}
      presenceKey=""
      marketLevel={(world.systems||[]).some((s:any)=>s.status==='active'&&s.system_type==='marketplace_network')?3:
       (world.systems||[]).some((s:any)=>s.status==='active'&&s.system_type==='commerce_storefront')?2:
       (world.systems||[]).some((s:any)=>s.status==='active'&&s.system_type==='customer_door')?1:0}
      onSystemEnter={()=>move('builds')} onBuildEnter={()=>move('builds')} onStudioEnter={()=>move('builds')}/>
    </section>
    <section id="pro-work-today" className="scroll-mt-24 space-y-4 rounded-2xl border border-sky-300/20 p-5">
     <div><p className="text-xs uppercase tracking-widest text-sky-200">Daily company operation · {position?.department}</p>
      <h2 className="mt-2 text-2xl font-semibold">My Work Today</h2>
      <p className="mt-2 text-sm text-slate-300">{position?.dailyWork}</p>
      <p className="mt-1 text-xs text-slate-400">Approved regional work plan: {position?.dailyWorkPlan}</p></div>
     <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm">Activity type<select value={draft.activityType}
       onChange={e=>setDraft(d=>({...d,activityType:e.target.value}))}
       className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3">
       {workTypes.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label className="text-sm">Activity name<input value={draft.title} maxLength={180}
       onChange={e=>setDraft(d=>({...d,title:e.target.value}))}
       placeholder="What business work will you complete?" className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3"/></label>
      <label className="text-sm">Organization or partner<input value={draft.organization} maxLength={180}
       onChange={e=>setDraft(d=>({...d,organization:e.target.value}))}
       className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3"/></label>
      <label className="text-sm">Next action<input value={draft.nextAction} maxLength={1000}
       onChange={e=>setDraft(d=>({...d,nextAction:e.target.value}))}
       className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3"/></label>
     </div>
     <label className="block text-sm">Work notes<textarea rows={2} maxLength={4000}
      value={draft.details} onChange={e=>setDraft(d=>({...d,details:e.target.value}))}
      className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3"/></label>
     <button disabled={busy||draft.title.trim().length<3} onClick={()=>void record()}
      className="rounded-xl bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-40">Record company work</button>
     <h3 className="font-semibold">My recorded activities</h3>
     <div className="grid gap-3 md:grid-cols-2">{(data.activity||[]).map(item=>
      <article key={item.id} className="rounded-lg border border-white/10 bg-slate-950/50 p-4">
       <p className="text-xs uppercase text-sky-200">{formatType(item.activity_type)} · {item.status.replaceAll('_',' ')}</p>
       <h4 className="mt-1 font-semibold">{item.title}</h4>
       <p className="mt-2 text-xs text-slate-300">{item.organization||'Company work'} · {item.next_action||'Next movement not recorded'}</p>
       <div className="mt-3 flex flex-wrap gap-2">{statuses.map(status=>
        <button key={status} disabled={busy||item.status===status}
         onClick={()=>void changeWork(item.id,status,item.next_action)}
         className="rounded-md border border-white/20 px-3 py-2 text-xs disabled:opacity-40">{formatType(status)}</button>)}</div>
      </article>)}</div>
     {(!data.activity||!data.activity.length)&&<p className="text-xs text-slate-400">No work recorded yet. Create your first daily activity above.</p>}
    </section>
    <section id="pro-file-folder-builds" className="scroll-mt-24 space-y-4">
     <h2 className="text-2xl font-semibold">My Pro File Folder · Build and Systems</h2>
     <p className="text-sm text-slate-300">This is your real persistent Pro business world. Select blueprints, obtain materials, form systems over time, and commission your public Customer Door when construction completes.</p>
     <FileFolderOpenWorld clientName={String(user.name||'Pro Manager')}
      fileNumber={String(position?.fileNumber||'')} workshopTitle={String(position?.businessName||'Pro Business')}
      workshopPurpose={String(position?.dailyWork||'')} initialWorld={world}
      fileFolderTier="pro" worldApiPath="/api/pro-regional-manager/file-folder-world"
      onWorldChange={next=>setData(current=>current?{...current,world:next}:current)}/>
    </section>
    <section id="pro-customer-door" className="scroll-mt-24 space-y-3">
     <h2 className="text-2xl font-semibold">My Customer Door</h2>
     <p className="text-sm text-slate-300">Publish real products or services to customers through the public File Folder Door. A customer order is a request until actual payment and delivery are confirmed.</p>
     <ClientCustomerDoorPanel initialStore={store} buildFunding={world.buildFunding}
      world={world} storeApiPath="/api/pro-regional-manager/business-store"
      onOpenConstruction={()=>move('builds')}/>
     {store?.public_url&&<Link target="_blank" href={String(store.public_url)}
      className="inline-block rounded-lg border border-sky-300/30 px-4 py-3 text-sm text-sky-200">Open public Customer Door</Link>}
    </section>
    <section id="pro-business-progress" className="scroll-mt-24 space-y-3 rounded-2xl border border-sky-300/20 p-5">
     <p className="text-xs uppercase tracking-widest text-sky-200">Pro Regional Manager · Company and business records</p>
     <h2 className="text-2xl font-semibold">Business Progress</h2>
     <p className="text-sm text-slate-300">Territory: {[position?.territory.city,position?.territory.region,position?.territory.country].filter(Boolean).join(', ')}</p>
     <p className="text-sm text-slate-300">Company work items: {(data.activity||[]).length} · Customer Door orders: {(store?.orders||[]).length} · Active systems: {liveSystems.length}</p>
     <p className="text-xs text-slate-400">Salary follows the signed employment agreement and company payroll. Customer payments are separate and cannot be marked verified by self-report. Administration oversees independently verified records.</p>
     <details><summary className="cursor-pointer text-sm font-semibold">My approved Pro business plan</summary>
      {Object.entries(position?.businessPlan||{}).map(([key,value])=><p key={key} className="mt-3 whitespace-pre-wrap text-sm text-slate-300"><strong>{formatType(key)}:</strong> {value}</p>)}
     </details>
    </section>
   </>}
  </div>
 </main>
}
