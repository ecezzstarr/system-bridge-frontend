'use client'
import {useCallback,useEffect,useState} from 'react'
import Link from 'next/link'
import {useAuth} from '@/lib/auth-provider'
type Item={id:string;client_name:string;client_email:string;file_number:string;status:string;
 signed_agreement_reference?:string;client_signature_name?:string|null;client_signature_at?:string|null;payment_tx_hash?:string;wallet_address?:string;
 business_plan?:Record<string,string>|null;rejection_reason?:string;verified_at?:string|null}
type State={activations:Item[];cjClient?:{id:string;name:string;file_number:string}|null;wallet?:string|null;feeUSDT:number}
export default function ProActivationsAdmin(){
 const {token,user,isInitialized}=useAuth()
 const [state,setState]=useState<State|null>(null)
 const [fileNumber,setFileNumber]=useState('WEAVE-2026-0907-0001')

 const [reference,setReference]=useState('')
 const [txHash,setTxHash]=useState('')
 const [amount,setAmount]=useState('680')
 const [confirmation,setConfirmation]=useState('')
 const [reason,setReason]=useState('')
 const [checked,setChecked]=useState(false)
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const [error,setError]=useState('')
 const load=useCallback(async()=>{
  if(!token)return
  const res=await fetch('/api/admin/pro-activations',{headers:{Authorization:'Bearer '+token},cache:'no-store'})
  const data=await res.json()
  if(!res.ok)throw new Error(data.error||'Register unavailable')
  setState(data)

 },[token])
 useEffect(()=>{if(user?.role==='admin'&&token)void load().catch(e=>setError(e.message))},[token,user?.role,load])
 async function act(action:string,extra:Record<string,unknown>={}){
  setBusy(true);setMessage('');setError('')
  try{
   const res=await fetch('/api/admin/pro-activations',{method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({action,fileNumber,...extra})})
   const data=await res.json()
   if(!res.ok)throw new Error(data.error||'Review unavailable')
   setMessage(action==='approve_payment'?'Forensics verified the transfer. Pro File Folder opened.':
    action==='confirm_signature'?'Signed agreement verified. Business plan is available to the Client.':
    'Action recorded in the Pro activation register.')
   setChecked(false);setConfirmation('')
   await load()
  }catch(e){setError(e instanceof Error?e.message:'Action unavailable')}
  finally{setBusy(false)}
 }
 if(!isInitialized)return <main className="p-8 text-white">Loading Administrations…</main>
 if(user?.role!=='admin')return <main className="p-8 text-white">Administrations only.</main>
 const selected=state?.activations.find(a=>a.file_number===fileNumber)
 return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 text-white" data-admin-pro-activation="true">
  <Link href="/admin/dashboard" className="text-xs text-cyan-200">Administrations</Link>
  <Link href="/admin/pro-file-number-verifications" className="inline-block rounded-lg border border-cyan-300/30 px-4 py-2 text-sm text-cyan-200">
   Open File Number verification register (no Client password)
  </Link>
  <header><p className="text-xs uppercase tracking-widest text-cyan-200">Forensics · Manual authority</p>
   <h1 className="mt-2 text-3xl font-bold">Pro File Folder Activation</h1>
   <p className="mt-2 text-sm text-slate-300">One-time 680 USDT fee. Independently verify the signed agreement, identity, business-plan submission, and exact TRC-20 receipt. No Paystack loan.</p>
  </header>
  {error&&<p role="alert" className="rounded-lg border border-rose-300/30 p-4 text-rose-200">{error}</p>}
  {message&&<p role="status" className="rounded-lg border border-cyan-300/30 p-4 text-cyan-200">{message}</p>}
  <section className="space-y-3 rounded-2xl border border-sky-300/25 bg-sky-300/[.06] p-5" data-admin-pro-active-wallet-link="true">
   <h2 className="text-lg font-semibold">Company Active Wallet · Pro USDT (TRC-20)</h2>
   <p className="text-sm leading-6 text-slate-200">The official Pro activation receiving address is managed in one separate Administrations wallet control. Every actual change is recorded with its reason. This same Pro wallet is used by Client, Agent and Bridger Pro activation, but historical payment evidence is never rewritten.</p>
   <p className="break-all font-mono text-xs text-sky-100">Current receiving address: {state?.wallet||'Not configured'}</p>
   <Link href="/admin/company-active-wallet" className="inline-flex min-h-11 items-center rounded-xl border border-sky-300/35 bg-sky-300/10 px-5 py-3 text-sm font-semibold text-sky-100">
    Configure company active wallet
   </Link>
  </section>
  <section className="space-y-3 rounded-2xl border border-white/15 p-5">
   <h2 className="text-lg font-semibold">Select existing Client</h2>
   <label className="block text-sm">Issued File Number
    <input value={fileNumber} onChange={e=>setFileNumber(e.target.value.toUpperCase())}
     className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3 font-mono"/>
   </label>
   <p className="text-sm text-slate-300">CJ Dorado Client record: {state?.cjClient?state.cjClient.name+' · confirmed Client record':'No matching registered Client in live database response'}</p>
   {!selected?<div className="space-y-2">
    <p className="text-sm text-amber-200">No Pro activation enrollment exists yet. Prepare only after validating File Number ownership and a Pro entitlement.</p>
    <input value={confirmation} onChange={e=>setConfirmation(e.target.value)} className="w-full rounded-lg border border-white/20 bg-slate-950 p-3" placeholder="Type PREPARE PRO ACTIVATION"/>
    <button disabled={busy||confirmation!=='PREPARE PRO ACTIVATION'} onClick={()=>void act('prepare',{confirmation})}
      className="rounded-lg bg-cyan-300 px-4 py-3 font-bold text-slate-950 disabled:opacity-40">Prepare original Pro File Number</button>
   </div>:<div className="space-y-2">
    <p className="text-sm"><strong>{selected.client_name}</strong> · {selected.client_email} · <strong>{selected.status.replaceAll('_',' ')}</strong></p>
    <p className="text-xs text-slate-300">Existing File Number: {selected.file_number}</p>
    {selected.signed_agreement_reference&&<p className="text-sm">Signed agreement: {selected.signed_agreement_reference}</p>}
    {selected.business_plan&&<details><summary className="cursor-pointer text-cyan-200">Review business plan</summary>
     <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-4 text-xs">{JSON.stringify(selected.business_plan,null,2)}</pre>
    </details>}
    {selected.status==='awaiting_signature'&&<div className="space-y-2 border-t border-white/10 pt-4">
     <h3 className="font-semibold">Verify Client's electronic signature</h3>
     {selected.client_signature_at
      ?<p className="rounded-lg border border-cyan-300/20 p-3 text-sm text-cyan-100">Signed by {selected.client_signature_name} on {new Date(selected.client_signature_at).toLocaleString()}. Independently review identity and terms.</p>
      :<p className="text-sm text-amber-200">Client electronic signature has not been received. Do not verify an unsigned agreement.</p>}
     <input value={reference} onChange={e=>setReference(e.target.value)} className="w-full rounded-lg border border-white/20 bg-slate-950 p-3" placeholder="Actual signed document reference"/>
     <label className="flex gap-2 text-sm"><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/> I have reviewed CJ's signed Pro agreement and File Number identity.</label>
     <button disabled={busy||!selected.client_signature_at||!checked||reference.trim().length<6} onClick={()=>void act('confirm_signature',{agreementReference:reference,signatureChecked:checked})}
      className="rounded-lg border border-cyan-300/40 px-4 py-3 disabled:opacity-40">Verify signed agreement</button>
    </div>}
    {selected.status==='pending_forensics'&&<div className="space-y-3 border-t border-white/10 pt-4">
     <h3 className="font-semibold">Forensics blockchain review</h3>
     <p className="break-all font-mono text-xs">Client-submitted transaction: {selected.payment_tx_hash}</p>
     <p className="break-all font-mono text-xs">Recorded destination wallet: {selected.wallet_address}</p>
     <p className="text-xs text-amber-200">Independently examine the on-chain transaction. Verify USDT TRC-20, destination, confirmed receipt, exact 680 USDT, and absence of duplicate receipt. A submitted hash is not proof of payment.</p>
     <input value={txHash} onChange={e=>setTxHash(e.target.value)} className="w-full rounded-lg border border-white/20 bg-slate-950 p-3 font-mono" placeholder="Independently verified transaction hash"/>
     <label className="block text-sm">Actual confirmed amount (USDT)<input type="number" value={amount} onChange={e=>setAmount(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3"/></label>
     <label className="flex gap-2 text-sm"><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/> I independently verified this exact USDT TRC-20 receipt to the recorded wallet and reviewed duplicates.</label>
     <button disabled={busy||!checked||txHash.trim().toLowerCase()!==String(selected.payment_tx_hash||'').toLowerCase()||Number(amount)!==680}
      onClick={()=>void act('approve_payment',{verifiedTxHash:txHash,verifiedWallet:selected.wallet_address,verifiedAmountUSDT:Number(amount),network:'TRC20_USDT',independentlyVerified:checked})}
      className="rounded-lg bg-cyan-300 px-4 py-3 font-bold text-slate-950 disabled:opacity-40">Approve verified 680 USDT payment</button>
     <input value={reason} onChange={e=>setReason(e.target.value)} className="w-full rounded-lg border border-white/20 bg-slate-950 p-3" placeholder="Reason for rejection (minimum 10 characters)"/>
     <button disabled={busy||reason.trim().length<10} onClick={()=>void act('reject_payment',{reason})}
      className="rounded-lg border border-rose-300/50 px-4 py-3 text-rose-200 disabled:opacity-40">Reject unverifiable payment</button>
    </div>}
   </div>}
  </section>
  <section className="rounded-2xl border border-white/15 p-5"><h2 className="text-lg font-semibold">Pro activation register</h2>
   {state?.activations.map(item=><button key={item.id} onClick={()=>{setFileNumber(item.file_number);setChecked(false);setConfirmation('')}} className="mt-2 block w-full rounded-lg border border-white/10 p-3 text-left text-sm">
    {item.client_name} · {item.file_number} · <strong>{item.status.replaceAll('_',' ')}</strong>
   </button>)}
  </section>
 </main>
}
