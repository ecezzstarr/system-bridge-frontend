'use client'
import Link from 'next/link'
import {useCallback,useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
import {proRegionalManagerDepartment} from '@/lib/pro-regional-manager-policy'

type Application={
 source_role:'agent'|'bridger';business_name:string;operating_country:string;
 operating_region:string;operating_city:string;status:string;submitted_at:string;
 agreed_monthly_salary_usdt:number|null;employment_terms_reference:string|null;
 review_note:string|null
}
const fields=[
 ['businessActivity','What business will your Pro File Folder operate?'],
 ['customers','Who will your customers and partners be?'],
 ['revenueModel','How will this business generate verified revenue?'],
 ['operations','How will you operate your File Folder and daily business systems?'],
] as const
const empty={operatingCountry:'',operatingRegion:'',operatingCity:'',contactAddress:'',
 businessName:'',dailyWorkPlan:''}

export default function ProRegionalManagerLifestyleApplication(){
 const {user,token,isInitialized,isLoading}=useAuth()
 const role=user?.role
 const eligible=role==='agent'||role==='bridger'
 const [application,setApplication]=useState<Application|null>(null)
 const [values,setValues]=useState(empty)
 const [plan,setPlan]=useState<Record<string,string>>({})
 const [accepted,setAccepted]=useState(false)
 const [busy,setBusy]=useState(false)
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const load=useCallback(async()=>{
  if(!token)return
  const response=await fetch('/api/pro-regional-manager/applications',{
   headers:{Authorization:'Bearer '+token},cache:'no-store'})
  const data=await response.json()
  if(!response.ok)throw new Error(data.error||'Unable to load application')
  setApplication(data.application||null)
 },[token])
 useEffect(()=>{
  if(!isInitialized||isLoading)return
  if(!eligible){setLoading(false);return}
  void load().catch(e=>setError(e instanceof Error?e.message:'Application unavailable'))
   .finally(()=>setLoading(false))
 },[isInitialized,isLoading,eligible,load])
 async function submit(){
  if(!token)return
  setBusy(true);setError('');setNotice('')
  try{
   const response=await fetch('/api/pro-regional-manager/applications',{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({...values,businessPlan:plan,termsAccepted:accepted})})
   const data=await response.json()
   if(!response.ok)throw new Error(data.error||'Application not submitted')
   setNotice(data.notice||'Application recorded for Administration review')
   await load()
  }catch(e){setError(e instanceof Error?e.message:'Application not submitted')}
  finally{setBusy(false)}
 }
 const department=proRegionalManagerDepartment(role)
 const canReapply=!application||['rejected','withdrawn'].includes(application.status)
 if(!isInitialized||isLoading||loading)return <main className="mx-auto max-w-4xl p-6 text-slate-200">Opening Pro Regional Manager position…</main>
 return <main className="weave-operating-environment mx-auto min-h-screen max-w-4xl space-y-6 px-4 py-8 text-white"
   data-pro-regional-manager-lifestyle="true">
   <Link href="/weave/lifestyles" className="text-sm text-sky-200 underline">Return to Lifestyle</Link>
   <header className="space-y-3 rounded-2xl border border-sky-300/25 bg-sky-300/[.05] p-5">
    <p className="text-xs uppercase tracking-widest text-sky-200">WEAVE · Pro company employment</p>
    <h1 className="text-3xl font-bold">Pro Regional Manager</h1>
    <p className="text-sm leading-6 text-slate-200">This position is separate from ordinary Regional Manager. A Pro Regional Manager operates a Pro File Folder business, submits a business plan and activates the File Folder after independent company verification. Your original department determines your daily work.</p>
    <p className="text-sm text-sky-100">Your department: <strong>{department?.department||'Not eligible through Lifestyle'}</strong>{department?' · '+department.dailyWork:''}</p>
    <p className="text-xs text-slate-300">Administration must approve your application, written salary agreement and File Folder identity before any activation payment is requested. Applying or paying does not by itself create a company appointment or a File Folder. Do not send funds using application details.</p>
   </header>
   {!eligible&&<section className="rounded-xl border border-amber-300/25 p-5 text-sm">
    Bridgers and Agents apply through Lifestyle. External Clients with an issued Pro File Number use the
    <Link href="/client/pro-verification" className="ml-1 underline text-sky-200">Pro Staff Verification Workspace</Link>.
   </section>}
   {error&&<p role="alert" className="rounded-xl border border-rose-300/25 p-4 text-rose-200">{error}</p>}
   {notice&&<p role="status" className="rounded-xl border border-sky-300/25 p-4 text-sky-100">{notice}</p>}
   {application&&<section className="space-y-3 rounded-2xl border border-white/15 p-5">
    <h2 className="text-xl font-semibold">Your Pro Regional Manager application</h2>
    <p className="text-sm">Business: <strong>{application.business_name}</strong></p>
    <p className="text-sm">Location: {[application.operating_city,application.operating_region,application.operating_country].filter(Boolean).join(', ')}</p>
    <p className="text-sm">Application status: <strong>{application.status.replaceAll('_',' ')}</strong></p>
    {application.status==='approved_pending_verification'&&<>
     <p className="text-sm">Agreed monthly salary in Administration record: {Number(application.agreed_monthly_salary_usdt)>0?Number(application.agreed_monthly_salary_usdt).toLocaleString()+' USDT':'Company record needs reconciliation'}</p>
     <p className="text-xs text-sky-100">Administration reviewed your application and employment terms. Your Pro File Folder, secure account ownership, business-plan verification, activation and departmental workspace must still be completed. Do not assume active Pro status or send an unsolicited activation payment.</p>
    </>}
    {application.review_note&&<p className="text-xs text-amber-100">Administration review: {application.review_note}</p>}
   </section>}
   {eligible&&canReapply&&<section className="space-y-5 rounded-2xl border border-white/15 p-5">
    <h2 className="text-xl font-semibold">{application?'Submit a revised application':'Apply for Pro Regional Manager'}</h2>
    <div className="grid gap-4 sm:grid-cols-2">
     {([
      ['operatingCountry','Operating country'],['operatingRegion','Region or province'],
      ['operatingCity','City or town'],['contactAddress','Your contact / operating address'],
      ['businessName','Pro File Folder business name']
     ] as const).map(([key,label])=><label key={key} className="block text-sm">{label}
       <input required maxLength={key==='contactAddress'?500:key==='businessName'?180:150}
        value={values[key]} onChange={e=>setValues(current=>({...current,[key]:e.target.value}))}
        className="mt-2 w-full rounded-lg border border-white/15 bg-slate-900 p-3 text-white" /></label>)}
    </div>
    <h3 className="font-semibold">Pro File Folder business plan</h3>
    {fields.map(([key,label])=><label key={key} className="block text-sm">{label}
      <textarea required rows={3} maxLength={3000} value={plan[key]||''}
       onChange={e=>setPlan(current=>({...current,[key]:e.target.value}))}
       className="mt-2 w-full rounded-lg border border-white/15 bg-slate-900 p-3 text-white"/></label>)}
    <label className="block text-sm">How will you work daily in your department and develop this region?
     <textarea required rows={4} maxLength={2500} value={values.dailyWorkPlan}
      onChange={e=>setValues(current=>({...current,dailyWorkPlan:e.target.value}))}
      className="mt-2 w-full rounded-lg border border-white/15 bg-slate-900 p-3 text-white"/>
    </label>
    <label className="flex items-start gap-3 text-sm leading-6 text-slate-300">
     <input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} className="mt-1"/>
     I understand that Pro employment, salary, Pro File Folder ownership and activation require separate Administration verification and signed terms. No payment or activation is due when submitting this application.
    </label>
    <button type="button" disabled={busy||!accepted} onClick={()=>void submit()}
     className="min-h-11 rounded-xl bg-sky-300 px-5 py-3 font-bold text-slate-950 disabled:opacity-40">
     {busy?'Submitting…':'Submit Pro Regional Manager application'}
    </button>
   </section>}
   <section className="border-t border-white/15 pt-5 text-xs text-slate-400">
    Ordinary <Link href="/weave/lifestyles/regional-manager" className="underline text-sky-200">Regional Manager</Link> is a separate Bridger/Agent position without a File Folder.
   </section>
  </main>
}
