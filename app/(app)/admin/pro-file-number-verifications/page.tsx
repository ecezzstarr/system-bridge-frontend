'use client'
import {useCallback,useEffect,useState} from 'react'
import Link from 'next/link'
import {useAuth} from '@/lib/auth-provider'
import {PRO_MANAGER_PLAN_QUESTIONS} from '@/lib/pro-regional-manager-language'
type Application={
 id:string;file_number:string;business_name:string;business_plan:Record<string,string>;
 staff_position_title?:string|null;staff_monthly_salary_usdt?:number|null;staff_candidate_name?:string|null;
 signed_name:string;terms_accepted_at:string;identity_reference?:string|null;
 operating_country?:string|null;operating_region?:string|null;operating_city?:string|null;
 contact_address?:string|null;postal_code?:string|null;
 payment_wallet?:string|null;payment_tx_hash?:string|null;payment_submitted_at?:string|null;
 payment_verified_at?:string|null;payment_verified_amount_usdt?:number|null;
 status:string;folder_activated?:boolean;rejection_reason?:string|null;created_at:string
}
export default function ProFileNumberAdministration(){
 const {token,user,isInitialized}=useAuth()
 const [applications,setApplications]=useState<Application[]>([])
 const [selectedId,setSelectedId]=useState('')
 const [identityReference,setIdentityReference]=useState('')
 const [candidateEmail,setCandidateEmail]=useState('')
 const [monthlySalary,setMonthlySalary]=useState('')
 const [appointmentReference,setAppointmentReference]=useState('')
 const [hash,setHash]=useState('')
 const [amount,setAmount]=useState('680')
 const [reason,setReason]=useState('')
 const [confirmation,setConfirmation]=useState('')
 const [checked,setChecked]=useState(false)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const load=useCallback(async()=>{
  if(!token)return
  const response=await fetch('/api/admin/pro-file-number-verifications',{
   headers:{Authorization:'Bearer '+token},cache:'no-store'})
  const data=await response.json()
  if(!response.ok)throw new Error(data.error||'Pro verification register unavailable')
  setApplications(data.applications||[])
 },[token])
 useEffect(()=>{if(token&&user?.role==='admin')void load().catch(e=>setError(e.message))},[token,user?.role,load])
 async function act(action:string,extra:Record<string,unknown>={}){
  if(!selectedId)return
  setBusy(true);setError('');setNotice('')
  try{
   const response=await fetch('/api/admin/pro-file-number-verifications',{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({action,id:selectedId,...extra})})
   const data=await response.json()
   if(!response.ok)throw new Error(data.error||'Forensics action unavailable')
   setNotice(data.status==='payment_required'
    ?'Application approved. The Client staff verification page now shows the payment instructions.'
    :data.status==='appointment_approved'
     ?'Company appointment recorded. Complete the identity review below to move the applicant to payment.'
     :'Forensics action recorded: '+data.status)
   setChecked(false);setConfirmation('')
   await load()
  }catch(e){setError(e instanceof Error?e.message:'Verification failed')}
  finally{setBusy(false)}
 }
 if(!isInitialized)return <main className="p-8 text-white">Loading…</main>
 if(user?.role!=='admin')return <main className="p-8 text-white">Administrations authorization required.</main>
 const selected=applications.find(x=>x.id===selectedId)
 return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 text-white" data-admin-pro-number-verification="true">
  <header className="space-y-2">
   <Link href="/admin/pro-activations" className="text-xs text-cyan-200 underline">Pro activation control center</Link>
   <Link href="/admin/company-active-wallet" className="ml-4 text-xs text-cyan-200 underline">Company Active Wallet settings</Link>
   <h1 className="text-3xl font-bold">Pro File Number Verification</h1>
   <p className="text-sm text-slate-300">Only approved WEAVE company staff are eligible for this Pro File Folder workspace. Recipients begin with an issued File Number, not a password. Administrations independently verifies their position, signed business plans and identity before displaying payment instructions. Forensics approves real TRON receipts. No funds are credited automatically.</p>
   <p className="text-xs text-cyan-200">Public Client starting page: <Link href="/client/pro-verification" className="underline">/client/pro-verification</Link></p>
  </header>
  {error&&<p role="alert" className="rounded-xl border border-rose-300/25 p-4 text-rose-200">{error}</p>}
  {notice&&<p role="status" className="rounded-xl border border-cyan-300/25 p-4 text-cyan-200">{notice}</p>}
  <section className="grid gap-5 lg:grid-cols-2">
   <div className="space-y-3 rounded-2xl border border-white/15 p-5">
    <h2 className="text-xl font-bold">Submitted File Numbers · {applications.length}</h2>
    <button onClick={()=>void load().catch(e=>setError(e.message))} className="rounded-lg border border-cyan-300/30 px-3 py-2 text-xs">Refresh register</button>
    {!applications.length&&<p className="text-sm text-slate-400">No submitted Pro verification plans.</p>}
    {applications.map(item=><button key={item.id} onClick={()=>{
     setSelectedId(item.id);setChecked(false);setConfirmation('');setHash('');setIdentityReference('')
     setCandidateEmail('');setMonthlySalary('');setAppointmentReference('')
    }} className={'block w-full space-y-1 rounded-lg border p-3 text-left text-sm '+
      (selectedId===item.id?'border-cyan-200/60 bg-cyan-300/10':'border-white/10')}>
     <p className="font-mono text-xs text-cyan-200">{item.file_number}</p>
     <p className="font-semibold">{item.business_name}</p>
     <p className="text-xs capitalize text-amber-200">{item.status.replaceAll('_',' ')}</p>
    </button>)}
   </div>
   <div className="space-y-4 rounded-2xl border border-white/15 p-5">
    {!selected?<p className="text-sm text-slate-300">Select a submitted plan to review.</p>:<>
     <h2 className="text-xl font-bold">Review business application</h2>
     <p className="text-sm">{selected.file_number}</p>
     <p className="text-sm">File Folder business: <strong>{selected.business_name}</strong></p>
     <p className="text-sm">Electronic signature: <strong>{selected.signed_name}</strong></p>
     <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/[.04] p-3">
      <p className="text-xs uppercase tracking-widest text-cyan-200">Approved WEAVE company employment</p>
      {selected.staff_position_title?<div className="mt-2 space-y-1 text-sm">
       <p>Position: <strong>{selected.staff_position_title}</strong></p>
       <p>Approved employee: <strong>{selected.staff_candidate_name||'Employee identity pending'}</strong></p>
       <p>Monthly salary: {Number(selected.staff_monthly_salary_usdt)>0
        ?Number(selected.staff_monthly_salary_usdt).toLocaleString()+' USDT in recorded offer'
        :'To be confirmed by Administrations payroll'}</p>
      </div>:<div className="mt-2 space-y-3">
       <p className="text-sm text-amber-200">No approved appointment is linked to this File Number. Record the independently approved employment terms here before the identity review. This records an appointment; it does not mark an activation payment as received.</p>
       {selected.status==='pending_identity'&&<>
        <p className="text-sm">Employee: <strong>{selected.signed_name}</strong> · Pro Regional Manager · Dream Lovely</p>
        <label className="block text-sm">Verified company staff email
         <input type="email" maxLength={255} value={candidateEmail} onChange={e=>setCandidateEmail(e.target.value)}
          className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3"/>
        </label>
        <label className="block text-sm">Agreed monthly salary · USDT
         <input type="number" min="0.01" max="100000" step="0.01" value={monthlySalary} onChange={e=>setMonthlySalary(e.target.value)}
          className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3"/>
        </label>
        <label className="block text-sm">Approved appointment / agreement reference
         <input maxLength={255} value={appointmentReference} onChange={e=>setAppointmentReference(e.target.value)}
          className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3"/>
        </label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={checked}
         onChange={e=>setChecked(e.target.checked)}/> I verified this employee's appointment, email and agreed salary against the company agreement.</label>
        <button disabled={busy||!checked||!candidateEmail.includes('@')||Number(monthlySalary)<=0||!monthlySalary||appointmentReference.trim().length<8}
         onClick={()=>void act('reconcile_appointment',{candidateEmail,monthlySalaryUSDT:Number(monthlySalary),appointmentReference,independentlyVerified:checked})}
         className="rounded-lg border border-cyan-300/40 px-4 py-3 text-sm disabled:opacity-40">Record approved Pro appointment</button>
        <Link href="/admin/client-staff-offers" className="block text-sm text-cyan-200 underline">Review existing company staff offers</Link>
       </>}
      </div>}
      {selected.file_number==='WEAVE-2026-0907-0001'&&<p className="mt-2 text-xs text-cyan-200">CJ Dorado: Pro Regional Manager · Dream Lovely · Spain. This Pro File Folder appointment is distinct from the ordinary Bridger/Agent Regional Manager. Verify the approved employment and salary without adding Agent/Stability or Bridger/Hope duties.</p>}
     </div>
     <div className="space-y-2 rounded-lg border border-white/15 bg-slate-950/40 p-4"
       data-admin-client-regional-location="true">
       <h3 className="text-sm font-semibold text-sky-200">Applicant-submitted operating address · verify independently</h3>
       <p className="text-sm">Country: {selected.operating_country||'Not provided'}</p>
       <p className="text-sm">Region: {selected.operating_region||'Not provided'}</p>
       <p className="text-sm">City: {selected.operating_city||'Not provided'}</p>
       <p className="text-sm">Contact address: {selected.contact_address||'Not provided'}</p>
       {selected.postal_code&&<p className="text-sm">Postal code: {selected.postal_code}</p>}
       <p className="text-xs text-amber-200">CJ is assigned to Spain for Client business expansion. The applicant's street address and city are not assumed. Confirm the location before advancing identity and company territory.</p>
     </div>
     <p className="text-xs text-slate-400">Terms accepted: {new Date(selected.terms_accepted_at).toLocaleString()}</p>
     <details open className="rounded-lg border border-white/10 p-3"><summary className="text-sm font-semibold text-cyan-200">Submitted business plan</summary>
      <p className="mt-3 text-xs leading-6 text-slate-300">Assess whether this person's actual work, customer needs, realistic economics, employees and daily systems can create and document real value. Weave grows through verified business success, not an activation charge.</p>
      {PRO_MANAGER_PLAN_QUESTIONS.map(({key,title})=><div key={key} className="mt-3">
       <p className="text-xs font-semibold text-cyan-200">{title}</p>
       <p className="whitespace-pre-wrap break-words text-sm text-slate-200">{selected.business_plan?.[key]||'Not provided'}</p>
      </div>)}
     </details>
     {selected.status==='pending_identity'&&<div className="space-y-3 border-t border-white/15 pt-4">
      <h3 className="font-semibold">Verify File Number and applicant identity</h3>
      <p className="text-sm text-cyan-200">Approval carries the Client's present submitted name, business plan and operating details into payment and Pro activation. The earlier appointment name is retained in the company record.</p>
      <p className="text-xs text-amber-200">File Number possession is not proof of ownership. Verify original entitlement, registered identity or reliable supporting documents independently before approval.</p>
      <label className="block text-sm">Actual identity verification reference
       <input value={identityReference} onChange={e=>setIdentityReference(e.target.value)} placeholder="Approved document or identity record reference"
        className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3"/>
      </label>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={checked}
       onChange={e=>setChecked(e.target.checked)}/> I independently verified the Client staff employee identity, approved Pro appointment, business plan, and submitted operating location. For CJ, this is Dream Lovely business expansion in Spain, not Agent or Bridger regional management.</label>
      <button disabled={busy||!selected.staff_position_title||!checked||identityReference.trim().length<8}
       onClick={()=>void act('verify_identity',{identityReference,independentlyVerified:checked})}
       className="rounded-lg bg-cyan-300 px-4 py-3 font-semibold text-slate-950 disabled:opacity-40">Approve verified application for payment</button>
     </div>}
     {selected.status==='payment_required'&&<p className="text-sm text-slate-200">Applicant verified. The official 680 USDT receiving wallet is now available in the applicant's private verification session.</p>}
     {selected.status==='pending_forensics'&&<div className="space-y-3 border-t border-white/15 pt-4">
      <h3 className="font-semibold">Verify 680 USDT TRC-20 receipt</h3>
      <p className="break-all font-mono text-xs text-cyan-200">Submitted hash: {selected.payment_tx_hash}</p>
      <p className="break-all font-mono text-xs text-cyan-200">Recorded destination: {selected.payment_wallet}</p>
      <p className="text-xs text-amber-200">Independently verify blockchain confirmation, token contract, amount, destination and duplicate use. Never approve from a screenshot or submitted hash alone.</p>
      <label className="block text-sm">Independently verified TRON hash
       <input value={hash} onChange={e=>setHash(e.target.value.trim())} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3 font-mono"/>
      </label>
      <label className="block text-sm">Confirmed amount in USDT
       <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3"/>
      </label>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={checked}
       onChange={e=>setChecked(e.target.checked)}/> I independently confirmed 680 USDT (TRC-20) received in the original official wallet, with no duplicate claim.</label>
      <button disabled={busy||!checked||hash.trim().toLowerCase()!==String(selected.payment_tx_hash||'').trim().toLowerCase()||Number(amount)!==680}
       onClick={()=>void act('approve_payment',{verifiedTxHash:hash,verifiedWallet:selected.payment_wallet,
        verifiedAmountUSDT:Number(amount),network:'TRC20_USDT',independentlyVerified:checked})}
       className="rounded-lg bg-cyan-300 px-4 py-3 font-semibold text-slate-950 disabled:opacity-40">Approve verified payment</button>
      <label className="block text-sm">Rejection reason
       <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={2}
        className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3"/>
      </label>
      <button disabled={busy||reason.trim().length<10}
       onClick={()=>void act('reject_payment',{reason})}
       className="rounded-lg border border-rose-300/40 px-4 py-2 text-sm text-rose-200 disabled:opacity-40">Reject unverified payment</button>
     </div>}
     {selected.status==='paid_pending_account'&&<div className="space-y-3 border-t border-white/15 pt-4">
      <h3 className="font-semibold">{selected.folder_activated?'Pro File Folder activated · registration is open':'Payment verified · activate Pro File Folder'}</h3>
      <p className="text-xs text-slate-300">The order is verification, payment, Pro File Folder activation, then Client account registration. Registration connects the account to the already activated Folder using the verified present name and details.</p>
      {!selected.folder_activated&&<button disabled={busy} onClick={()=>void act('activate_folder')}
       className="rounded-lg bg-cyan-300 px-4 py-3 font-semibold text-slate-950 disabled:opacity-40">Activate verified Pro File Folder before registration</button>}
      <p className="text-xs text-slate-300">After registration the verified owner is attached automatically. Use finalization below only to reconcile an existing registered account.</p>
      <label className="block text-sm">Finalization confirmation
       <input value={confirmation} onChange={e=>setConfirmation(e.target.value)}
        placeholder="Type FINALIZE VERIFIED PRO" className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3"/>
      </label>
      <button disabled={busy||confirmation!=='FINALIZE VERIFIED PRO'}
       onClick={()=>void act('finalize',{confirmation})} className="rounded-lg border border-cyan-300/30 px-4 py-2 text-sm disabled:opacity-40">Finalize verified account and Pro File Folder</button>
     </div>}
     {selected.status==='active'&&<p className="text-sm text-emerald-200">Original verified Pro File Folder is active. Private Client access continues to require an authorized Client session.</p>}
     {selected.status==='payment_rejected'&&<p className="text-sm text-rose-200">Payment evidence was rejected: {selected.rejection_reason}. Applicant can provide corrected evidence.</p>}
    </>}
   </div>
  </section>
 </main>
}
