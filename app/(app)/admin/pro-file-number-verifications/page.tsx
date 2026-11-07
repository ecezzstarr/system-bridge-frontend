'use client'
import {useCallback,useEffect,useState} from 'react'
import Link from 'next/link'
import {useAuth} from '@/lib/auth-provider'
type Application={
 id:string;file_number:string;business_name:string;business_plan:Record<string,string>;
 staff_position_title?:string|null;staff_monthly_salary_usdt?:number|null;staff_candidate_name?:string|null;
 signed_name:string;terms_accepted_at:string;identity_reference?:string|null;
 payment_wallet?:string|null;payment_tx_hash?:string|null;payment_submitted_at?:string|null;
 payment_verified_at?:string|null;payment_verified_amount_usdt?:number|null;
 status:string;rejection_reason?:string|null;created_at:string
}
export default function ProFileNumberAdministration(){
 const {token,user,isInitialized}=useAuth()
 const [applications,setApplications]=useState<Application[]>([])
 const [selectedId,setSelectedId]=useState('')
 const [identityReference,setIdentityReference]=useState('')
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
   setNotice('Forensics action recorded: '+data.status)
   setChecked(false);setConfirmation('')
   await load()
  }catch(e){setError(e instanceof Error?e.message:'Verification failed')}
  finally{setBusy(false)}
 }
 if(!isInitialized)return <main className="p-8 text-white">Loading…</main>
 if(user?.role!=='admin')return <main className="p-8 text-white">Administration authorization required.</main>
 const selected=applications.find(x=>x.id===selectedId)
 return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 text-white" data-admin-pro-number-verification="true">
  <header className="space-y-2">
   <Link href="/admin/pro-activations" className="text-xs text-cyan-200 underline">Pro activation control center</Link>
   <h1 className="text-3xl font-bold">Pro File Number Verification</h1>
   <p className="text-sm text-slate-300">Only approved WEAVE company staff are eligible for this Pro File Folder workspace. Recipients begin with an issued File Number, not a password. Administration independently verifies their position, signed business plans and identity before displaying payment instructions. Forensics approves real TRON receipts. No funds are credited automatically.</p>
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
        :'To be confirmed by Administration payroll'}</p>
      </div>:<p className="mt-2 text-sm text-amber-200">No approved company staff offer for this File Number. Do not approve payment until employment records are reconciled.</p>}
      {selected.file_number==='WEAVE-2026-0907-0001'&&<p className="mt-2 text-xs text-cyan-200">CJ Dorado: required company position — Regional Manager. Verify the approved staff offer matches before proceeding.</p>}
     </div>
     <p className="text-xs text-slate-400">Terms accepted: {new Date(selected.terms_accepted_at).toLocaleString()}</p>
     <details open className="rounded-lg border border-white/10 p-3"><summary className="text-sm font-semibold text-cyan-200">Submitted business plan</summary>
      {Object.entries(selected.business_plan||{}).map(([key,value])=><div key={key} className="mt-3">
       <p className="text-xs capitalize text-cyan-200">{key.replaceAll(/([A-Z])/g,' $1')}</p>
       <p className="whitespace-pre-wrap break-words text-sm text-slate-200">{value}</p>
      </div>)}
     </details>
     {selected.status==='pending_identity'&&<div className="space-y-3 border-t border-white/15 pt-4">
      <h3 className="font-semibold">Verify File Number and applicant identity</h3>
      <p className="text-xs text-amber-200">File Number possession is not proof of ownership. Verify original entitlement, registered identity or reliable supporting documents independently before approval.</p>
      <label className="block text-sm">Actual identity verification reference
       <input value={identityReference} onChange={e=>setIdentityReference(e.target.value)} placeholder="Approved document or identity record reference"
        className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3"/>
      </label>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={checked}
       onChange={e=>setChecked(e.target.checked)}/> I personally verified the File Number owner's identity, signature, business plan and entitlement against independent records.</label>
      <button disabled={busy||!checked||identityReference.trim().length<8}
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
      <h3 className="font-semibold">Payment verified · finalize correct File Folder owner</h3>
      <p className="text-xs text-slate-300">Finalization opens the actual Pro File Folder only when an active registered Client account owns this same original File Number and File Folder. A new account is never silently created.</p>
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
