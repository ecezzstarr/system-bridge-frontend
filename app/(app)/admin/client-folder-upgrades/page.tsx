'use client'
import Link from 'next/link'
import {useEffect,useState,useCallback} from 'react'
import {useAuth} from '@/lib/auth-provider'
type Upgrade={file_number:string;tier:string;status:string;loan_principal_usdt:number;repayment_verified_usdt:number;
 loan_agreed_at:string|null;loan_funded_at:string|null;loan_funding_reference:string|null;loan_agreement_reference:string|null}
type Snapshot={fileNumber:string;clients:{id:string;name:string;file_number:string}[];upgrade:Upgrade|null;
 repayments:{amount_usdt:number;reference:string;verified_at:string}[]}
export default function ClientFolderUpgradeAdmin(){
 const {token,user,isInitialized}=useAuth()
 const [state,setState]=useState<Snapshot|null>(null)
 const [agreement,setAgreement]=useState('')
 const [funding,setFunding]=useState('')
 const [accepted,setAccepted]=useState(false)
 const [checked,setChecked]=useState(false)
 const [paymentAmount,setPaymentAmount]=useState('100')
 const [paymentNetwork,setPaymentNetwork]=useState('')
 const [paymentReference,setPaymentReference]=useState('')
 const [confirmation,setConfirmation]=useState('')
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const reload=useCallback(async()=>{
  if(!token)return
  const res=await fetch('/api/admin/client-folder-upgrades',{headers:{Authorization:'Bearer '+token},cache:'no-store'})
  const data=await res.json()
  if(!res.ok)throw new Error(data.error||'Unable to load upgrade')
  setState(data)
 },[token])
 useEffect(()=>{if(token&&user?.role==='admin')void reload().catch(e=>setError(e.message))},[token,user?.role,reload])
 async function act(action:string,extra:Record<string,unknown>={}){
  setBusy(true);setError('');setMessage('')
  try{
   const res=await fetch('/api/admin/client-folder-upgrades',{
    method:'POST',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({action,...extra})
   })
   const data=await res.json()
   if(!res.ok)throw new Error(data.error||'Unable to record action')
   setMessage(action==='prepare_cj_pro'
    ?'Pro construction prepared for the verified existing Client. No debt has been imposed.'
    :action==='confirm_loan'?'Accepted and actually funded personal loan recorded. Entry remains closed.'
    :action==='verify_repayment'?'Verified repayment added to the loan register.'
    :'Repayment and construction verified; Pro entrance released.')
   await reload()
  }catch(e:any){setError(e?.message||'Upgrade request rejected')}
  finally{setBusy(false)}
 }
 if(!isInitialized)return <main className="p-6 text-slate-300">Opening Client File Folder upgrades…</main>
 if(user?.role!=='admin')return <main className="p-6">Administration only.</main>
 const up=state?.upgrade
 const remaining=up?Number(up.loan_principal_usdt)-Number(up.repayment_verified_usdt):0
 return <main className="mx-auto max-w-5xl space-y-6 px-4 py-7 text-white" data-admin-client-pro-upgrade="true">
  <Link href="/admin/file-folder-world-releases" className="text-xs text-cyan-200">← File Folder Update Engine</Link>
  <header className="space-y-2">
   <p className="text-xs font-bold uppercase tracking-widest text-cyan-200">Administration · Client entitlement</p>
   <h1 className="text-3xl font-black">CJ Dorado · Pro File Folder</h1>
   <p className="text-sm text-slate-300">This workshop retains the existing File Number, records the 100 USDT loan only after agreement and actual funding, verifies repayments, and protects entry until construction is released.</p>
  </header>
  {error&&<p role="alert" className="rounded-xl border border-rose-300/25 p-4 text-rose-200">{error}</p>}
  {message&&<p role="status" className="rounded-xl border border-cyan-200/25 p-4 text-cyan-100">{message}</p>}
  <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[.03] p-5">
   <p className="text-sm font-bold">File Number: <span className="font-mono text-cyan-200">{state?.fileNumber||'Loading'}</span></p>
   <p className="text-sm">Matched active Client accounts: {state?.clients?.length??'Checking'}</p>
   {state?.clients?.map(client=><p key={client.id} className="text-sm text-slate-300">{client.name} · {client.file_number}</p>)}
   {up?<div className="space-y-2">
    <p className="text-sm">Tier: <strong>{up.tier.toUpperCase()}</strong> · State: <strong>{up.status.replaceAll('_',' ')}</strong></p>
    <p className="text-sm">Personal loan agreed: {up.loan_agreed_at?'Yes':'Not verified'} · Funded: {up.loan_funded_at?'Verified':'Not verified'}</p>
    <p className="text-sm">Verified repayments: {Number(up.repayment_verified_usdt).toFixed(2)} USDT · Remaining after confirmed funding: {remaining.toFixed(2)} USDT</p>
   </div>:<p className="text-sm text-slate-400">No Pro upgrade has been prepared against the live record.</p>}
  </section>
  {!up&&<section className="rounded-2xl border border-amber-300/25 p-5">
   <h2 className="text-lg font-bold">Prepare Pro world construction</h2>
   <p className="mt-2 text-xs leading-6 text-slate-300">The action only works if this File Number belongs to exactly one active CJ Dorado Client and her original File Folder ownership matches. It does not record a loan as accepted or funded.</p>
   <label className="mt-4 block text-sm">Type PREPARE CJ PRO<input value={confirmation} onChange={e=>setConfirmation(e.target.value)} className="mt-2 w-full rounded-xl border border-white/20 bg-slate-950 p-3"/></label>
   <button disabled={busy||confirmation!=='PREPARE CJ PRO'} onClick={()=>void act('prepare_cj_pro',{confirmation})} className="mt-4 rounded-xl bg-cyan-300 px-5 py-3 font-bold text-slate-950 disabled:opacity-40">Prepare upgrade</button>
  </section>}
  {up?.status==='construction'&&!up.loan_funded_at&&<section className="space-y-3 rounded-2xl border border-white/10 p-5">
    <h2 className="text-lg font-bold">Verify actual personal loan</h2>
    <p className="text-xs leading-6 text-slate-300">Only mark funded after the recipient agrees to documented terms and the separate 100 USDT transfer has been verified. Otherwise the account sees a proposed loan, not a debt.</p>
    <label className="block text-sm">Accepted loan agreement reference<input value={agreement} onChange={e=>setAgreement(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3"/></label>
    <label className="block text-sm">Verified 100 USDT loan transfer reference<input value={funding} onChange={e=>setFunding(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3"/></label>
    <label className="flex gap-3 text-sm"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/> The Client accepted the loan terms.</label>
    <label className="flex gap-3 text-sm"><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/> I independently verified the actual 100 USDT loan transfer.</label>
    <button disabled={busy||!accepted||!checked||agreement.length<6||funding.length<6} onClick={()=>void act('confirm_loan',{agreementReference:agreement,fundingReference:funding,loanAccepted:accepted,loanFundingChecked:checked})} className="rounded-xl bg-cyan-300 px-5 py-3 font-bold text-slate-950 disabled:opacity-40">Confirm accepted and funded loan</button>
   </section>}
  {up?.status==='repayment_required'&&<section className="space-y-3 rounded-2xl border border-white/10 p-5">
   <h2 className="text-lg font-bold">Verify a repayment</h2>
   <p className="text-sm text-amber-200">{remaining.toFixed(2)} USDT outstanding; no automatic debit is performed.</p>
   <label className="block text-sm">Actual repayment (USDT)<input type="number" min=".01" step=".01" value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3"/></label>
   <label className="block text-sm">USDT network<input value={paymentNetwork} onChange={e=>setPaymentNetwork(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3"/></label>
   <label className="block text-sm">Transaction reference<input value={paymentReference} onChange={e=>setPaymentReference(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3"/></label>
   <button disabled={busy} onClick={()=>void act('verify_repayment',{amountUSDT:Number(paymentAmount),paymentNetwork,repaymentReference:paymentReference})} className="rounded-xl border border-cyan-300/50 px-5 py-3 font-bold text-cyan-200 disabled:opacity-40">Record verified repayment</button>
   {remaining<=0&&<div className="space-y-3 border-t border-white/10 pt-4">
    <label className="block text-sm">Type RELEASE PRO after verifying File Folder construction<input value={confirmation} onChange={e=>setConfirmation(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-950 p-3"/></label>
    <button disabled={busy||confirmation!=='RELEASE PRO'} onClick={()=>void act('finish_construction',{confirmation})} className="rounded-xl bg-emerald-300 px-5 py-3 font-bold text-slate-950 disabled:opacity-40">Open Pro File Folder</button>
   </div>}
  </section>}
  {!!state?.repayments?.length&&<section className="space-y-3"><h2 className="text-lg font-bold">Verified loan repayments</h2>{state.repayments.map(p=><p key={p.reference} className="rounded-lg border border-white/10 p-3 text-sm">{Number(p.amount_usdt).toFixed(2)} USDT · {p.reference} · {new Date(p.verified_at).toLocaleString()}</p>)}</section>}
 </main>
}
