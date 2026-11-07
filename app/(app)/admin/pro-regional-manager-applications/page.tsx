'use client'
import Link from 'next/link'
import {useCallback,useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
import {PRO_MANAGER_PLAN_QUESTIONS} from '@/lib/pro-regional-manager-language'
type Application={
 user_id:string;source_role:'agent'|'bridger';name:string;email:string;is_active:boolean;
 current_role:string;operating_country:string;operating_region:string;operating_city:string;
 contact_address:string;business_name:string;business_plan:Record<string,string>;
 daily_work_plan:string;status:string;submitted_at:string;review_note?:string|null;
 agreed_monthly_salary_usdt?:number|null;employment_terms_reference?:string|null
}
type Page={total:number;limit:number;offset:number;hasMore:boolean}
export default function AdminProRegionalManagerApplications(){
 const {user,token,isInitialized}=useAuth()
 const [applications,setApplications]=useState<Application[]>([])
 const [filter,setFilter]=useState('pending')
 const [page,setPage]=useState<Page>({total:0,limit:50,offset:0,hasMore:false})
 const [notes,setNotes]=useState<Record<string,string>>({})
 const [salary,setSalary]=useState<Record<string,string>>({})
 const [terms,setTerms]=useState<Record<string,string>>({})
 const [confirmed,setConfirmed]=useState<Record<string,boolean>>({})
 const [working,setWorking]=useState('')
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const load=useCallback(async(status:string,offset:number)=>{
  if(!token)return
  const response=await fetch('/api/admin/pro-regional-manager-applications?status='+encodeURIComponent(status)+'&limit=50&offset='+offset,
   {cache:'no-store',headers:{Authorization:'Bearer '+token}})
  const result=await response.json()
  if(!response.ok)throw new Error(result.error||'Unable to read Pro position applications')
  setApplications(result.applications||[])
  setPage(result.pagination||{total:0,offset,limit:50,hasMore:false})
 },[token])
 useEffect(()=>{
  if(!isInitialized||user?.role!=='admin')return
  void load(filter,0).catch(e=>setError(e instanceof Error?e.message:'Review unavailable'))
 },[isInitialized,user?.role,filter,load])
 async function review(a:Application,decision:'approve'|'reject'){
  setError('');setNotice('');setWorking(a.user_id)
  try{
   const response=await fetch('/api/admin/pro-regional-manager-applications',{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({userId:a.user_id,decision,reviewNote:notes[a.user_id]||'',
      monthlySalaryUSDT:Number(salary[a.user_id]||0),employmentTermsReference:terms[a.user_id]||'',
      independentlyVerified:confirmed[a.user_id]===true})})
   const result=await response.json()
   if(!response.ok)throw new Error(result.error||'Could not record review')
   setNotice(result.notice||'Decision recorded')
   await load(filter,page.offset)
  }catch(e){setError(e instanceof Error?e.message:'Unable to record review')}
  finally{setWorking('')}
 }
 async function prepare(userId:string){
  if(!token)return
  setWorking(userId);setError('');setNotice('')
  try{
   const response=await fetch('/api/admin/pro-regional-manager-activations',
    {method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
     body:JSON.stringify({userId,action:'prepare'})})
   const body=await response.json()
   if(!response.ok)throw new Error(body.error||'Pro File Number could not be prepared')
   setNotice('Approved Pro applicant File Number confirmed. Signing is available in the applicant workspace.')
   await load(filter,page.offset)
  }catch(e){setError(e instanceof Error?e.message:'Unable to prepare Pro File Number')}
  finally{setWorking('')}
 }
 if(!isInitialized)return <main className="p-6">Opening Administration…</main>
 if(user?.role!=='admin')return <main className="p-6">Administration permission required.</main>
 return <main className="mx-auto max-w-6xl space-y-6 p-5 text-white" data-admin-pro-regional-manager-applications="true">
  <Link href="/admin/control-center" className="text-sm text-sky-200 underline">Administration Control Center</Link>
  <Link href="/admin/pro-regional-manager-activations" className="ml-4 text-sm text-sky-200 underline">Pro activation Forensics</Link>
  <header className="space-y-2">
   <p className="text-xs uppercase tracking-widest text-sky-200">A Time · Pro company appointments</p>
   <h1 className="text-3xl font-bold">Pro Regional Manager Applications</h1>
   <p className="text-sm leading-6 text-slate-300">Review Agent and Bridger applications independently of ordinary Regional Manager. Check identity, department, business plan, operating location and signed employment terms. Approval records agreed salary but does not activate a Pro File Folder or request payment.</p>
  </header>
  {error&&<p role="alert" className="rounded-lg border border-rose-400/30 p-4 text-rose-200">{error}</p>}
  {notice&&<p role="status" className="rounded-lg border border-sky-400/30 p-4 text-sky-200">{notice}</p>}
  <div className="flex flex-wrap items-center gap-3">
   <select aria-label="Application review status" value={filter} onChange={e=>setFilter(e.target.value)}
    className="rounded-lg border border-white/20 bg-slate-900 p-3">
    {['pending','approved_pending_verification','rejected','withdrawn','all'].map(status=>
     <option key={status} value={status}>{status.replaceAll('_',' ')}</option>)}
   </select>
   <span className="text-sm text-slate-300">{page.total} Pro applications</span>
  </div>
  <div className="space-y-4">
   {applications.map(a=><section key={a.user_id} className="space-y-3 rounded-xl border border-white/15 p-5">
    <div className="flex flex-wrap justify-between gap-3">
     <div>
      <h2 className="text-xl font-semibold">{a.name} · {a.source_role==='agent'?'Stability':'Hope'}</h2>
      <p className="text-sm text-slate-400">{a.email} · {a.operating_city}, {a.operating_region}, {a.operating_country}</p>
     </div>
     <span className="text-xs text-sky-200">{a.status.replaceAll('_',' ')}</span>
    </div>
    <p className="text-sm">Pro business: <strong>{a.business_name}</strong></p>
    <p className="text-xs text-slate-300">Operating address: {a.contact_address}</p>
    <details className="rounded-lg border border-white/10 p-3">
     <summary className="cursor-pointer text-sm font-semibold">Review submitted business plan and daily work</summary>
     <p className="mt-3 text-xs leading-6 text-slate-300">Assess real work, the customer's problem, verified revenue and costs, assigned employee responsibilities, and the systems used to deliver value. The applicant's success strengthens Weave through sustained, documented participation; projections are not earnings.</p>
     {PRO_MANAGER_PLAN_QUESTIONS.map(({key,title})=><p key={key} className="mt-3 whitespace-pre-wrap break-words text-sm"><strong>{title}:</strong> {a.business_plan?.[key]||'Not provided'}</p>)}
     <p className="mt-3 whitespace-pre-wrap text-sm"><strong>Daily regional operations:</strong> {a.daily_work_plan}</p>
    </details>
    {a.review_note&&<p className="text-xs text-slate-300">Review notes: {a.review_note}</p>}
    {a.status==='approved_pending_verification'&&<div className="space-y-2">
     <p className="text-xs text-sky-200">Agreed salary recorded: {Number(a.agreed_monthly_salary_usdt||0).toLocaleString()} USDT monthly. The applicant must still sign the agreement and obtain independent File Folder activation verification.</p>
     <button disabled={!!working} onClick={()=>void prepare(a.user_id)}
      className="rounded-lg border border-sky-300/30 px-4 py-2 text-xs font-semibold text-sky-100 disabled:opacity-40">Confirm or repair Pro File Number reservation</button>
    </div>}
    {a.status==='pending'&&<>
     <label className="block text-sm">Administration review notes
      <textarea rows={2} maxLength={2000} value={notes[a.user_id]||''}
       onChange={e=>setNotes(current=>({...current,[a.user_id]:e.target.value}))}
       className="mt-2 w-full rounded-lg border border-white/15 bg-slate-900 p-3"/></label>
     <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm">Agreed monthly company salary (USDT)
       <input type="number" min="0" step=".01" value={salary[a.user_id]||''}
        onChange={e=>setSalary(current=>({...current,[a.user_id]:e.target.value}))}
        className="mt-2 w-full rounded-lg border border-white/15 bg-slate-900 p-3"/></label>
      <label className="block text-sm">Verified signed employment agreement reference
       <input value={terms[a.user_id]||''} maxLength={255}
        onChange={e=>setTerms(current=>({...current,[a.user_id]:e.target.value}))}
        className="mt-2 w-full rounded-lg border border-white/15 bg-slate-900 p-3"/></label>
     </div>
     <label className="flex gap-2 text-xs text-slate-300"><input type="checkbox" checked={confirmed[a.user_id]||false}
      onChange={e=>setConfirmed(current=>({...current,[a.user_id]:e.target.checked}))}/>
      I independently verified this applicant's identity, company-approved position, actual agreed salary and written employment terms.</label>
     <div className="flex flex-wrap gap-3">
      <button disabled={!!working||!(notes[a.user_id]||'').trim()||!confirmed[a.user_id]}
       onClick={()=>void review(a,'approve')} className="rounded-lg bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40">Approve pending verification</button>
      <button disabled={!!working||!(notes[a.user_id]||'').trim()}
       onClick={()=>void review(a,'reject')} className="rounded-lg border border-white/20 px-4 py-2 text-sm disabled:opacity-40">Reject</button>
     </div>
    </>}
   </section>)}
   {!applications.length&&<p className="text-sm text-slate-400">No applications in this status.</p>}
  </div>
  <div className="flex gap-3 border-t border-white/10 pt-4">
   <button disabled={page.offset<=0||!!working} onClick={()=>void load(filter,Math.max(0,page.offset-page.limit))}
    className="rounded-lg border border-white/20 px-4 py-2 text-sm disabled:opacity-40">Previous</button>
   <button disabled={!page.hasMore||!!working} onClick={()=>void load(filter,page.offset+page.limit)}
    className="rounded-lg border border-white/20 px-4 py-2 text-sm disabled:opacity-40">Next</button>
  </div>
  <p className="text-xs text-amber-100">This review is not a payment gateway. Do not create a Pro File Number, credit a wallet or represent the position as active before separate verified onboarding.</p>
 </main>
}
