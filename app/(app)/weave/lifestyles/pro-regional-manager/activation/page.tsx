'use client'
import Link from 'next/link'
import {useCallback,useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
import {PRO_MANAGER_COMPANY_PURPOSE,PRO_MANAGER_FILE_FOLDER_DISTINCTION,
 PRO_MANAGER_AGREEMENT_SECTIONS} from '@/lib/pro-regional-manager-language'
type Activation={
 success:boolean;applicationStatus:string;businessName:string;fileNumber:string|null;
 department:string;companyRole:string;country:string;region:string;city:string;
 salary:{monthlyUSDT:number;agreementReference:string};
 activation:{status:string;signedAt:string|null;paymentSubmittedAt:string|null;
  paymentVerifiedAt:string|null;rejectionReason:string|null;activatedAt:string|null};
 walletAddress:string|null;feeUSDT:number;network:string
}
export default function ProRegionalManagerActivation(){
 const {user,token,isInitialized}=useAuth()
 const [data,setData]=useState<Activation|null>(null)
 const [signedName,setSignedName]=useState('')
 const [accepted,setAccepted]=useState(false)
 const [hash,setHash]=useState('')
 const [busy,setBusy]=useState(false)
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const load=useCallback(async()=>{
  if(!token)return
  const response=await fetch('/api/pro-regional-manager/activation',
   {headers:{Authorization:'Bearer '+token},cache:'no-store'})
  const body=await response.json()
  if(!response.ok)throw new Error(body.error||'Unable to load Pro activation')
  setData(body)
 },[token])
 useEffect(()=>{
  if(!isInitialized)return
  if(!token){setLoading(false);return}
  void load().catch(e=>setError(e instanceof Error?e.message:'Activation unavailable'))
   .finally(()=>setLoading(false))
 },[isInitialized,token,load])
 async function act(action:'sign_agreement'|'submit_payment'){
  if(!token||!data)return
  setBusy(true);setError('');setNotice('')
  try{
   const response=await fetch('/api/pro-regional-manager/activation',
    {method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
     body:JSON.stringify(action==='sign_agreement'
      ?{action,signedName,acceptedTerms:accepted}
      :{action,txHash:hash,expectedWallet:data.walletAddress})})
   const result=await response.json()
   if(!response.ok)throw new Error(result.error||'Pro activation action failed')
   setNotice(action==='sign_agreement'
    ?'Company and Pro File Folder agreement signed. Official activation instructions are now available.'
    :'Transaction reference submitted for independent Administration Forensics. Do not transfer again.')
   await load()
  }catch(e){setError(e instanceof Error?e.message:'Unable to continue activation')}
  finally{setBusy(false)}
 }
 if(!isInitialized||loading)return <main className="min-h-screen p-6 text-slate-200">Opening verified Pro activation…</main>
 if(!['agent','bridger'].includes(user?.role||''))return <main className="max-w-3xl space-y-3 p-6 text-white">
  <h1 className="text-2xl font-semibold">Pro Regional Manager activation</h1>
  <p>Agent and Bridger applicants complete their Pro activation here while retaining their original accounts. External Clients verify the issued File Number separately.</p>
  <Link href="/client/pro-verification" className="text-sky-200 underline">External Client Pro Staff Verification</Link>
 </main>
 const status=data?.activation.status||'not_prepared'
 const approved=data?.applicationStatus==='approved_pending_verification'
 const readyPayment=(status==='payment_required'||status==='payment_rejected')&&approved
 return <main className="weave-operating-environment min-h-screen bg-[#061629] px-4 py-8 text-white"
  data-pro-regional-manager-activation="true">
  <div className="mx-auto max-w-3xl space-y-6">
   <nav className="flex flex-wrap gap-4 text-xs text-sky-200">
    <Link href="/weave/lifestyles/pro-regional-manager">Pro Manager application</Link>
    <Link href="/weave/lifestyles/pro-regional-manager/workspace">My Pro workspace</Link>
   </nav>
   <header className="space-y-3 rounded-2xl border border-sky-200/25 bg-[#08263e] p-6">
    <p className="text-xs uppercase tracking-widest text-sky-200">WEAVE Pro File Folder · Company Verification</p>
    <h1 className="text-3xl font-semibold">Pro Regional Manager Activation</h1>
    <p className="text-sm leading-7 text-slate-200">Your original department is {data?.department||'pending'}. Your approved Pro Regional Manager appointment and your personally owned Pro File Folder are distinct from an ordinary Regional Manager position.</p>
    <p className="text-sm leading-7 text-slate-200">{PRO_MANAGER_COMPANY_PURPOSE}</p>
    <p className="text-sm">Business: {data?.businessName||'Pending company approval'}</p>
    <p className="font-mono text-xs">Pro File Number: {data?.fileNumber||'Pending official allocation'}</p>
    <p className="text-sm">Company position: {data?.applicationStatus||'not submitted'} · Pro activation: {status.replaceAll('_',' ')}</p>
    <p className="text-sm">Agreed monthly employment salary: {Number(data?.salary?.monthlyUSDT)>0?
     Number(data?.salary?.monthlyUSDT).toLocaleString()+' USDT':'Awaiting verified agreement'} · not funded by this activation fee.</p>
   </header>
   {error&&<p role="alert" className="rounded-xl border border-rose-400/25 p-4 text-sm text-rose-100">{error}</p>}
   {notice&&<p role="status" className="rounded-xl border border-sky-400/25 p-4 text-sm text-sky-100">{notice}</p>}
   {!approved&&<section className="rounded-xl border border-amber-400/20 p-5 text-sm text-slate-300">Administration must first review your Lifestyle application, identity, Pro business plan, and actual agreed employment terms. No payment is requested during application review.</section>}
   {approved&&status==='not_prepared'&&<section className="rounded-xl border border-amber-300/30 p-5 text-sm text-slate-200">
    Administration approved the position, but the original-role Pro File Number is not prepared. Ask Administration to reconcile the verified appointment. No fee is due yet.
   </section>}
   {approved&&status==='awaiting_signature'&&<section className="space-y-4 rounded-2xl border border-sky-200/25 p-5">
    <h2 className="text-xl font-semibold">1. Confirm signed employment and Pro File Folder terms</h2>
    <p className="text-sm leading-7 text-slate-200">{PRO_MANAGER_FILE_FOLDER_DISTINCTION}</p>
    <p className="text-sm leading-7 text-slate-200">Before signing, review the terms below alongside your separately approved company employment agreement. The monthly salary is recorded by Administration and is not funded by, or automatically conditional on, a File Folder activation fee.</p>
    <div className="space-y-3" data-pro-manager-reciprocal-agreement="true">
     {PRO_MANAGER_AGREEMENT_SECTIONS.map(section=><article key={section.title} className="rounded-xl border border-sky-200/20 bg-[#0b2a42] p-4">
      <h3 className="text-sm font-semibold text-sky-100">{section.title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-200">{section.body}</p>
     </article>)}
    </div>
    <p className="text-sm leading-7 text-slate-200">Your approved Pro Regional Manager appointment includes the agreed monthly salary and recorded business plan. Separately, the Pro File Folder activation charge is a one-time {data?.feeUSDT} USDT on TRON (TRC-20). No payment is due before your signature, and payment is never proof of salary or guaranteed income.</p>
    <p className="text-xs text-slate-400">Approved agreement reference: {data?.salary.agreementReference}</p>
    <label className="block text-sm">Your full registered name<input value={signedName} onChange={e=>setSignedName(e.target.value)}
     maxLength={255} className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3"/></label>
    <label className="flex gap-3 text-sm leading-6 text-slate-200"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}
     className="mt-1"/>I have read the business ownership, Weave participation, employee, salary, company-wallet and verification terms above, and reviewed my separately approved company employment agreement. I accept the one-time Pro File Folder activation terms. My typed name is my electronic signature.</label>
    <button disabled={busy||!accepted||signedName.trim().length<3} onClick={()=>void act('sign_agreement')}
     className="rounded-lg bg-sky-300 px-5 py-3 font-semibold text-slate-950 disabled:opacity-40">Sign and continue</button>
   </section>}
   {readyPayment&&<section className="space-y-4 rounded-2xl border border-sky-300/25 p-5">
    <h2 className="text-xl font-semibold">2. Pro File Folder activation · {data?.feeUSDT} USDT</h2>
    <p className="text-sm">Network: <strong>TRON (TRC-20)</strong>. Use only the independently configured official receiving wallet below. Verify the full address and network before transferring.</p>
    {data?.walletAddress?<div className="rounded-lg border border-sky-300/20 bg-slate-950/80 p-4">
      <p className="text-xs uppercase text-sky-200">WEAVE Forensics receiving wallet</p>
      <p className="mt-2 break-all font-mono text-sm">{data.walletAddress}</p>
      <button onClick={()=>navigator.clipboard.writeText(String(data.walletAddress))}
       className="mt-2 rounded-lg border border-sky-300/25 px-3 py-2 text-xs">Copy wallet address</button>
     </div>:<p role="alert" className="rounded-lg border border-amber-300/30 p-4 text-sm">Official receiving wallet unavailable. Do not transfer funds. Administration must configure it.</p>}
    {status==='payment_rejected'&&<p className="text-xs text-rose-100">Previous proof was rejected: {data?.activation.rejectionReason||'Contact Administration to reconcile it'}. Submit the real corrected transaction reference; do not transfer a second time unless independently instructed.</p>}
    <label className="block text-sm">Actual TRON transaction hash<input value={hash} onChange={e=>setHash(e.target.value)} autoComplete="off"
      maxLength={64} placeholder="64-character transaction hash"
      className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3 font-mono text-xs"/></label>
    <button disabled={busy||!data?.walletAddress||!/^[a-f0-9]{64}$/i.test(hash.trim())}
     onClick={()=>void act('submit_payment')} className="rounded-lg bg-sky-300 px-5 py-3 font-semibold text-slate-950 disabled:opacity-40">Submit proof for Forensics review</button>
   </section>}
   {status==='pending_forensics'&&<section className="rounded-xl border border-amber-300/25 p-5 text-sm text-slate-200">
    Your transaction reference has been recorded. Administration Forensics must independently verify the blockchain receipt, full amount, network and receiving wallet. Your Pro File Folder does not open before confirmation. Do not pay again.
   </section>}
   {status==='active'&&<section className="space-y-4 rounded-xl border border-emerald-300/25 p-5">
    <h2 className="text-xl font-semibold">3. Pro File Folder verified and active</h2>
    <p className="text-sm text-slate-200">The company has independently verified the activation transaction. Continue under your existing {user?.role} login; your department, approved company salary, private Pro File Folder and business Customer Door are separately recorded.</p>
    <Link href="/weave/lifestyles/pro-regional-manager/workspace"
      className="inline-block rounded-lg bg-sky-300 px-5 py-3 font-semibold text-slate-950">Enter my Pro Regional Manager workspace</Link>
   </section>}
  </div>
 </main>
}
