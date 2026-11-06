'use client'
import {useCallback,useEffect,useState} from 'react'
import Link from 'next/link'
import {useAuth} from '@/lib/auth-provider'

type Activation={status:string;file_number?:string;fileNumber?:string;feeUSDT:number;network?:string;
 walletAddress?:string|null;payment_tx_hash?:string|null;business_plan?:Record<string,string>|null;
 signed_agreement_verified_at?:string|null;rejection_reason?:string|null}
const fields=[
 ['businessName','Business name'],
 ['businessActivity','What your business will do'],
 ['customers','Who your customers are'],
 ['revenueModel','How the business earns money'],
 ['operations','How you will operate your systems and serve customers'],
] as const

export default function ProActivationPage(){
 const {token,user,isInitialized}=useAuth()
 const [activation,setActivation]=useState<Activation|null>(null)
 const [notRequired,setNotRequired]=useState(false)
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
  setActivation(body.activation||null)
  if(body.activation?.business_plan)setPlan(body.activation.business_plan)
 },[token])
 useEffect(()=>{if(token)void reload().catch(e=>setError(e.message))},[token,reload])
 async function submit(action:'business_plan'|'submit_payment'){
  setBusy(true);setError('');setMessage('')
  try{
   const res=await fetch('/api/client/pro-activation',{method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify(action==='business_plan'?{action,plan} :{action,txHash:hash,expectedWallet:activation?.walletAddress})})
   const body=await res.json()
   if(!res.ok)throw new Error(body.error||'Submission unavailable')
   setMessage(action==='business_plan'
    ?'Business plan recorded. Read the official wallet details and transfer exactly 680 USDT on TRC-20.'
    :'Payment evidence received. Forensics must independently verify the blockchain transaction before your private File Folder opens.')
   await reload()
  }catch(e){setError(e instanceof Error?e.message:'Request unavailable')}
  finally{setBusy(false)}
 }
 if(!isInitialized)return <main className="min-h-screen p-8 text-white">Loading Client workspace…</main>
 if(!token||user?.role!=='client')return <main className="min-h-screen p-8 text-white">Client login required. <Link href="/client/login" className="underline">Sign in</Link></main>
 if(notRequired)return <main className="min-h-screen p-8 text-white">No new Pro activation fee is due on this account. <Link href="/client/dashboard" className="underline">Return to dashboard</Link></main>
 const status=activation?.status||'loading'
 return <main className="min-h-screen bg-[#050c18] px-4 py-8 text-white" data-pro-file-folder-activation="true">
  <div className="mx-auto max-w-3xl space-y-5">
   <nav className="flex flex-wrap items-center justify-between gap-3 text-sm">
    <Link href="/client/dashboard" className="text-cyan-200 underline">Client dashboard</Link>
    <Link href="/client/staff-workspace" className="text-cyan-200 underline">Company employment workspace</Link>
   </nav>
   <header className="rounded-2xl border border-sky-300/20 bg-slate-900 p-6">
    <p className="text-xs uppercase tracking-widest text-cyan-200">Weave of Presence · Client · Dream Lovely</p>
    <h1 className="mt-3 text-3xl font-bold">Pro File Folder Activation</h1>
    <p className="mt-2 text-sm text-slate-300">Your File Number: <span className="font-mono">{user?.file_number||activation?.file_number||activation?.fileNumber||'Assigned Client File Number'}</span></p>
    <p className="mt-4 text-4xl font-bold">680 USDT</p>
    <p className="mt-1 text-sm text-slate-300">One-time Pro File Folder activation fee · USDT on TRON (TRC-20) · Forensics manual verification.</p>
    <p className="mt-3 text-xs text-slate-400">This is not a personal loan, a deposit to your wallet, or an automatically recurring fee. Your employment workspace stays attached to your account.</p>
   </header>
   {error&&<p role="alert" className="rounded-xl border border-rose-300/30 p-4 text-sm text-rose-100">{error}</p>}
   {message&&<p role="status" className="rounded-xl border border-cyan-300/30 p-4 text-sm text-cyan-100">{message}</p>}
   <section className="rounded-2xl border border-white/10 p-6">
    <h2 className="text-lg font-bold">Activation progress</h2>
    <p className="mt-2 text-sm capitalize text-slate-300">{status.replaceAll('_',' ')}</p>
    {status==='awaiting_preparation'&&<p className="mt-3 text-sm text-amber-200">Administration must reconcile your existing File Number and prepare this Pro activation. No payment is requested yet.</p>}
    {status==='awaiting_signature'&&<p className="mt-3 text-sm text-amber-200">Sign the Pro File Folder agreement provided by Administration. Forensics will verify the signed document before you submit the business plan.</p>}
    {status==='pending_forensics'&&<p className="mt-3 text-sm text-amber-200">Payment evidence submitted. Forensics will verify 680 USDT on the TRON blockchain. Do not send a second transfer unless advised after review.</p>}
    {status==='active'&&<div className="mt-3 space-y-3"><p className="text-sm text-emerald-200">The one-time fee was verified. Your private Pro File Folder is open.</p><Link href="/client/system-switch" className="inline-block rounded-lg bg-cyan-300 px-5 py-3 font-semibold text-slate-950">Enter System Switch</Link></div>}
   </section>
   {status==='business_plan_required'&&<section className="space-y-4 rounded-2xl border border-cyan-300/20 p-6">
    <h2 className="text-lg font-bold">Submit your business plan</h2>
    <p className="text-sm text-slate-300">The plan forms the first direction of your Pro File Folder and its workshop.</p>
    {fields.map(([key,title])=><label key={key} className="block text-sm text-slate-200">{title}
     <textarea rows={3} required minLength={10} maxLength={3000} value={plan[key]||''}
       onChange={e=>setPlan(v=>({...v,[key]:e.target.value}))}
       className="mt-2 w-full rounded-xl border border-white/20 bg-slate-900 p-3 text-white" />
    </label>)}
    <button disabled={busy||fields.some(([key])=>(plan[key]||'').trim().length<10)}
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
