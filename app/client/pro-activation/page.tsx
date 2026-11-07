'use client'
import {useCallback,useEffect,useState} from 'react'
import Link from 'next/link'
import ProManagerRoleShowcase from '@/components/client/pro-manager-role-showcase'
import {useAuth} from '@/lib/auth-provider'
import {PRO_MANAGER_FILE_FOLDER_DISTINCTION,
 PRO_MANAGER_PLAN_QUESTIONS,PRO_MANAGER_AGREEMENT_SECTIONS} from '@/lib/pro-regional-manager-language'

type Activation={status:string;file_number?:string;fileNumber?:string;feeUSDT:number;network?:string;
 walletAddress?:string|null;payment_tx_hash?:string|null;business_plan?:Record<string,string>|null;
 signed_agreement_verified_at?:string|null;rejection_reason?:string|null;
 client_signature_name?:string|null;client_signature_at?:string|null}
type SiblingsEvent={eventName:string;reportedAmountUSDT:number;verifiedAmountUSDT:number;
 status:string;proActivated:boolean;workspaceAccess:boolean;availableForWithdrawal:boolean;notice:string}
const fields=[
 {key:'businessName',title:'Business name',guidance:'Name the business customers will recognize in your Pro File Folder and Customer Door.'},
 ...PRO_MANAGER_PLAN_QUESTIONS,
] as const

export default function ProActivationPage(){
 const {token,user,isInitialized}=useAuth()
 const [activation,setActivation]=useState<Activation|null>(null)
 const [notRequired,setNotRequired]=useState(false)
 const [siblingsEvent,setSiblingsEvent]=useState<SiblingsEvent|null>(null)
 const [signedName,setSignedName]=useState('')
 const [termsAccepted,setTermsAccepted]=useState(false)
 const [plan,setPlan]=useState<Record<string,string>>({})
 const [hash,setHash]=useState('')
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const [error,setError]=useState('')
 const reload=useCallback(async()=>{
  if(!token)return
  const res=await fetch('/api/client/pro-activation',{headers:{Authorization:'Bearer '+token},cache:'no-store'})
  const body=await res.json()
  if(!res.ok)throw new Error(body.error||'Activation status unavailable')
  setNotRequired(!body.required)
  setSiblingsEvent(body.siblingsEvent||null)
  setActivation(body.activation||null)
  if(body.activation?.business_plan)setPlan(body.activation.business_plan)
 },[token])
 useEffect(()=>{if(token)void reload().catch(e=>setError(e.message))},[token,reload])
 async function submit(action:'sign_agreement'|'business_plan'|'submit_payment'){
  setBusy(true);setError('');setMessage('')
  try{
   const res=await fetch('/api/client/pro-activation',{method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify(action==='sign_agreement'?{action,signedName,acceptedTerms:termsAccepted}:
      action==='business_plan'?{action,plan}:{action,txHash:hash,expectedWallet:activation?.walletAddress})})
   const body=await res.json()
   if(!res.ok)throw new Error(body.error||'Submission unavailable')
   setMessage(action==='sign_agreement'
    ?'Your electronic signature is recorded. Administration must review it before the business-plan stage.'
    : action==='business_plan'
    ?'Business plan recorded. Read the official wallet details and transfer exactly 680 USDT on TRC-20.'
    :'Payment evidence received. Forensics must independently verify the blockchain transaction before your private File Folder opens.')
   await reload()
  }catch(e){setError(e instanceof Error?e.message:'Request unavailable')}
  finally{setBusy(false)}
 }
 if(!isInitialized)return <main className="min-h-screen p-8 text-white">Loading Client workspace…</main>
 if(!token||user?.role!=='client')return <main className="min-h-screen px-3 py-6 sm:px-5 sm:py-9" data-pro-regional-manager-entrance="true">
  <div className="mx-auto max-w-6xl space-y-6">
   <nav className="flex flex-wrap items-center justify-between gap-3 px-2 text-sm">
    <Link href="/" className="font-bold text-sky-900 underline">WEAVE of Presence</Link>
    <span className="text-xs font-semibold text-sky-800">System Switch · Bridge of Radiance</span>
   </nav>
   <ProManagerRoleShowcase actionHref="/client/pro-verification" actionText="Begin Client verification"/>
   <section className="rounded-2xl border border-sky-200/80 bg-white/95 p-6 shadow-sm" data-pro-verification-next-step="true">
    <p className="text-xs font-bold uppercase tracking-widest text-sky-800">Official Weave company entry</p>
    <h2 className="mt-2 text-2xl font-bold text-slate-900">Ready to verify your position?</h2>
    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">If Administration has issued you a Pro File Number, use it to present your business plan and signed agreement. Your identity and company appointment are reviewed separately. You do not need a password or new account to begin; no payment is requested at this entrance.</p>
    <Link href="/client/pro-verification" className="mt-4 inline-flex rounded-xl bg-[#1d628e] px-5 py-3 text-sm font-bold text-white">Continue with issued File Number</Link>
   </section>
  </div>
 </main>
 if(notRequired)return <main className="min-h-screen p-8 text-white">No new Pro activation fee is due on this account. <Link href="/client/dashboard" className="underline">Return to dashboard</Link></main>
 const status=activation?.status||'loading'
 return <main className="min-h-screen px-3 py-6 sm:px-5 sm:py-9" data-pro-file-folder-activation="true" data-pro-manager-role-first="true">
  <div className="mx-auto max-w-6xl space-y-5">
   <nav className="flex flex-wrap items-center justify-between gap-3 px-2 text-sm">
    <Link href="/client/dashboard" className="font-semibold text-sky-900 underline">Client dashboard</Link>
    <Link href="/client/staff-workspace" className="font-semibold text-sky-900 underline">Company employment workspace</Link>
   </nav>
   <ProManagerRoleShowcase actionHref="#pro-activation-current-stage" actionText="Continue my Pro verification"/>
   <section id="pro-activation-current-stage" className="scroll-mt-6 space-y-3 rounded-2xl border border-sky-200 bg-white/95 p-6 shadow-sm" data-pro-client-current-stage="true">
    <p className="text-xs font-bold uppercase tracking-widest text-sky-800">Dream Lovely · Your verified company pathway</p>
    <h2 className="text-xl font-bold text-slate-900">Your position and File Folder verification</h2>
    <p className="text-sm leading-7 text-slate-700">{PRO_MANAGER_FILE_FOLDER_DISTINCTION}</p>
    <p className="break-all text-sm text-slate-700">Issued File Number: <span className="font-mono font-semibold">{user?.file_number||activation?.file_number||activation?.fileNumber||'Pending company File Number'}</span></p>
    <p className="text-xs leading-6 text-slate-600">Your company salary and approved employment are separate from your File Folder business and any later activation requirement.</p>
   </section>
   {error&&<p role="alert" className="rounded-xl border border-rose-300/30 p-4 text-sm text-rose-100">{error}</p>}
   {message&&<p role="status" className="rounded-xl border border-cyan-300/30 p-4 text-sm text-cyan-100">{message}</p>}
   {siblingsEvent&&<section className="rounded-2xl border border-violet-300/25 bg-violet-300/[.05] p-6" data-siblings-event-status="true">
     <p className="text-xs uppercase tracking-widest text-violet-200">Siblings Event · Mandate business earnings</p>
     <h2 className="mt-2 text-3xl font-bold">{siblingsEvent.reportedAmountUSDT.toLocaleString()} USDT</h2>
     <p className="mt-1 text-sm text-amber-200">Reported Siblings Funds · Mandate/source verification pending</p>
     <p className="mt-3 text-xs leading-6 text-slate-300">{siblingsEvent.notice}</p>
     <p className="mt-2 text-xs text-slate-400">Verified earnings: {siblingsEvent.verifiedAmountUSDT.toLocaleString()} USDT · Available for withdrawal: not established.</p>
     <p className="mt-2 text-xs text-slate-400">Other funds: Pending verification. No funds are credited or automatically released by activating a File Folder.</p>
   </section>}
   <section className="rounded-2xl border border-sky-200 bg-white/95 p-6 shadow-sm" data-pro-current-progress="true">
    <h2 className="text-lg font-bold text-slate-900">Verification progress</h2>
    <p className="mt-2 text-sm capitalize text-slate-300">{status.replaceAll('_',' ')}</p>
    {status==='awaiting_preparation'&&<p className="mt-3 text-sm text-amber-200">Administration must reconcile your existing File Number and prepare this Pro activation. No payment is requested yet.</p>}
    {status==='awaiting_signature'&&<p className="mt-3 text-sm text-amber-200">{activation?.client_signature_at
     ? 'Your electronic signature was received. Administration is reviewing the signed agreement before business planning.'
     : 'Read the agreement below and sign electronically. Administration will review your signature before business planning.'}</p>}
    {status==='pending_forensics'&&<p className="mt-3 text-sm text-amber-200">Payment evidence submitted. Forensics will verify 680 USDT on the TRON blockchain. Do not send a second transfer unless advised after review.</p>}
    {status==='active'&&<div className="mt-3 space-y-3"><p className="text-sm text-emerald-200">The one-time fee was verified. Your private Pro File Folder is open.</p><Link href="/client/system-switch" className="inline-block rounded-lg bg-cyan-300 px-5 py-3 font-semibold text-slate-950">Enter System Switch</Link></div>}
   </section>
   {status==='awaiting_signature'&&<section className="space-y-4 rounded-2xl border border-cyan-300/20 p-6" data-pro-electronic-agreement="true">
    <h2 className="text-xl font-bold">Pro File Folder · Client Agreement</h2>
    <p className="text-sm leading-7 text-slate-200">Your Pro File Folder is the operating world for the business you bring to Weave. Read the terms before signing. This agreement does not replace an approved employment offer, authorize unverified financial services or create guaranteed income.</p>
    <div className="space-y-3" data-client-pro-reciprocal-agreement="true">
     {PRO_MANAGER_AGREEMENT_SECTIONS.map(section=><article key={section.title} className="rounded-xl border border-sky-200/20 bg-slate-900/50 p-4">
      <h3 className="font-semibold text-sky-100">{section.title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-200">{section.body}</p>
     </article>)}
    </div>
    <p className="text-sm leading-7 text-slate-200">For any reported Siblings Event business earnings or other historical balance, source verification and separate Mandate accounting remain required. This fee does not establish or release a 9,000 USDT balance, and existing employment or personal financial obligations remain unchanged.</p>
    {activation?.client_signature_at
     ?<p className="rounded-lg border border-cyan-300/30 p-3 text-sm text-cyan-100">Signed electronically by {activation.client_signature_name} · {new Date(activation.client_signature_at).toLocaleString()} · Awaiting Administration review</p>
     :<div className="space-y-3 border-t border-white/10 pt-4">
      <label className="block text-sm">Full registered Client name (electronic signature)
       <input value={signedName} onChange={e=>setSignedName(e.target.value)} autoComplete="name"
         className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3 text-white"/>
      </label>
      <label className="flex items-start gap-2 text-sm text-slate-200">
       <input type="checkbox" checked={termsAccepted} onChange={e=>setTermsAccepted(e.target.checked)} className="mt-1"/>
       I have read the Pro File Folder agreement, understand how my business growth and participation contribute to Weave, acknowledge the one-time 680 USDT activation fee and independent verification, and consent to my typed name being recorded as my electronic signature.
      </label>
      <button type="button" disabled={busy||!termsAccepted||signedName.trim().length<4}
        onClick={()=>void submit('sign_agreement')}
        className="rounded-xl bg-cyan-300 px-5 py-3 font-bold text-slate-950 disabled:opacity-40">Sign Pro File Folder agreement</button>
     </div>}
   </section>}
   {status==='business_plan_required'&&<section className="space-y-4 rounded-2xl border border-cyan-300/20 p-6">
    <h2 className="text-lg font-bold">Submit your business plan</h2>
    <p className="text-sm leading-7 text-slate-200">The plan gives your Pro File Folder its specific business direction. Describe your actual services, customers, how real work becomes verified value, and how employees and systems will expand it. Weave grows as your business serves customers successfully—not because you simply activate a Folder.</p>
    {fields.map(({key,title,guidance})=><label key={key} className="block text-sm text-slate-200">{title}
     <span className="mt-2 block text-xs leading-6 text-slate-300">{guidance}</span>
     <textarea rows={4} required minLength={10} maxLength={3000} value={plan[key]||''}
       onChange={e=>setPlan(v=>({...v,[key]:e.target.value}))}
       className="mt-2 w-full rounded-xl border border-white/20 bg-slate-900 p-3 text-white" />
    </label>)}
    <button disabled={busy||fields.some(({key})=>(plan[key]||'').trim().length<10)}
      onClick={()=>void submit('business_plan')} className="rounded-xl bg-cyan-300 px-5 py-3 font-bold text-slate-950 disabled:opacity-40">Save business plan</button>
   </section>}
   {(status==='payment_required'||status==='rejected')&&<section className="space-y-4 rounded-2xl border border-amber-300/25 p-6">
    <h2 className="text-lg font-bold">Pay 680 USDT · TRC-20</h2>
    {status==='rejected'&&<p className="text-sm text-rose-200">Forensics review: {activation?.rejection_reason}. Submit correct evidence only after addressing this finding.</p>}
    {activation?.walletAddress?<div className="space-y-2 rounded-lg border border-white/15 p-4">
      <p className="text-xs text-slate-300">Official receiving wallet · TRON network · USDT TRC-20</p>
      <p className="break-all font-mono text-sm">{activation.walletAddress}</p>
      <button onClick={()=>void navigator.clipboard.writeText(activation.walletAddress||'')} className="rounded-lg border border-white/30 px-3 py-2 text-xs">Copy wallet address</button>
    </div>:<p className="text-sm text-amber-200">The receiving wallet has not been configured. Do not send funds until its address appears here.</p>}
    <p className="text-sm text-slate-300">Send exactly 680 USDT on TRC-20. Do not send native TRX, other tokens, or use another network. Blockchain network fees are additional.</p>
    <label className="block text-sm">TRON transaction hash
     <input value={hash} onChange={e=>setHash(e.target.value)} placeholder="64-character transaction ID"
      className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3 font-mono text-sm" />
    </label>
    <button disabled={busy||!activation?.walletAddress||!/^[a-fA-F0-9]{64}$/.test(hash.trim())}
      onClick={()=>void submit('submit_payment')} className="rounded-xl bg-cyan-300 px-5 py-3 font-bold text-slate-950 disabled:opacity-40">Submit payment to Forensics</button>
   </section>}
  </div>
 </main>
}
