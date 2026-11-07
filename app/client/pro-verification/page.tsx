'use client'
import {useCallback,useEffect,useState} from 'react'
import Link from 'next/link'
type Verification={reference:string;fileNumber:string;businessName:string;
 status:string;feeUSDT:number;network:string;walletAddress:string|null;
 paymentVerified:boolean;rejectionReason?:string|null;
 companyPosition?:{title:string;monthlySalaryUSDT:number|null;salaryStatus:string}|null;
 operatingLocation?:{country:string;region:string;city:string}|null;
 siblingsEvent?:{reportedAmountUSDT:number;verifiedAmountUSDT:number;status:string;availableForWithdrawal:boolean}|null}
const PLAN_FIELDS=[
 ['businessActivity','Business activity and purpose'],
 ['customers','Customers and intended market'],
 ['revenueModel','Products, services and how the business earns'],
 ['operations','How the Client will operate the File Folder business'],
] as const
const SESSION_KEY='weave-pro-number-verification-secret'
export default function ProFileNumberVerification(){
 const [step,setStep]=useState<'file'|'plan'|'status'>('file')
 const [fileNumber,setFileNumber]=useState('')
 const [businessName,setBusinessName]=useState('')
 const [signedName,setSignedName]=useState('')
 const [operatingCountry,setOperatingCountry]=useState('')
 const [operatingRegion,setOperatingRegion]=useState('')
 const [operatingCity,setOperatingCity]=useState('')
 const [contactAddress,setContactAddress]=useState('')
 const [postalCode,setPostalCode]=useState('')
 const [accepted,setAccepted]=useState(false)
 const [plan,setPlan]=useState<Record<string,string>>({})
 const [ticket,setTicket]=useState('')
 const [verification,setVerification]=useState<Verification|null>(null)
 const [txHash,setTxHash]=useState('')
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const refresh=useCallback(async(secret:string)=>{
  const response=await fetch('/api/public/pro-file-number-verification?ticket='+encodeURIComponent(secret),{cache:'no-store'})
  const json=await response.json()
  if(!response.ok)throw new Error(json.error||'Verification status unavailable')
  setTicket(secret);setVerification(json.verification);setStep('status')
 },[])
 useEffect(()=>{
  const secret=sessionStorage.getItem(SESSION_KEY)
  if(secret)void refresh(secret).catch(()=>sessionStorage.removeItem(SESSION_KEY))
 },[refresh])
 async function submitPlan(){
  setBusy(true);setError('');setMessage('')
  try{
   const response=await fetch('/api/public/pro-file-number-verification',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'submit_plan',fileNumber,businessName,plan,signedName,termsAccepted:accepted,
     operatingCountry,operatingRegion,operatingCity,contactAddress,postalCode}),
   })
   const json=await response.json()
   if(!response.ok)throw new Error(json.error||'Unable to submit business plan')
   sessionStorage.setItem(SESSION_KEY,json.ticket)
   await refresh(json.ticket)
   setMessage('Business plan and electronic agreement recorded. Administration must confirm your File Number and identity before payment instructions become available.')
  }catch(e){setError(e instanceof Error?e.message:'Verification unavailable')}
  finally{setBusy(false)}
 }
 async function submitPayment(){
  if(!ticket||!verification?.walletAddress)return
  setBusy(true);setError('');setMessage('')
  try{
   const response=await fetch('/api/public/pro-file-number-verification',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'submit_payment',ticket,txHash,expectedWallet:verification.walletAddress}),
   })
   const json=await response.json()
   if(!response.ok)throw new Error(json.error||'Unable to submit payment evidence')
   await refresh(ticket)
   setMessage('Payment reference received. Forensics must independently verify the TRC-20 transaction. Do not send a duplicate transfer.')
  }catch(e){setError(e instanceof Error?e.message:'Payment review unavailable')}
  finally{setBusy(false)}
 }
 async function requestRegistrationInvite(){
  if(!ticket)return
  setBusy(true);setError('');setMessage('')
  try{
   const response=await fetch('/api/public/pro-file-number-verification',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'send_registration_invite',ticket}),
   })
   const body=await response.json()
   if(!response.ok)throw new Error(body.error||'Secure invitation could not be sent')
   setMessage(body.message||'Check the approved company email for your private registration link.')
  }catch(e){setError(e instanceof Error?e.message:'Secure registration unavailable')}
  finally{setBusy(false)}
 }
 return <main className="min-h-dvh bg-[#050c18] px-4 py-9 text-white" data-pro-file-number-verification="true">
  <div className="mx-auto max-w-3xl space-y-6">
   <header className="rounded-2xl border border-cyan-300/20 bg-slate-900 p-6">
    <p className="text-xs uppercase tracking-widest text-cyan-200">Weave of Presence · Dream Lovely</p>
    <h1 className="mt-2 text-3xl font-bold">Pro File Folder · Company Staff Verification</h1>
    <p className="mt-3 text-sm leading-6 text-slate-200">External Clients who receive a Pro Regional Manager or other approved Client Pro staff appointment verify here, outside the Agent/Bridger Lifestyle application route. Start with your issued File Number. You do not need a password or a new account to submit the File Folder business name, plan and staff activation agreement. Administration independently confirms the Client company position before activation; the File Number alone never opens private operations.</p>
    <p className="mt-4 text-3xl font-bold">680 USDT</p>
    <p className="mt-1 text-sm text-slate-300">One-time company-staff Pro File Folder activation · USDT on TRON (TRC-20) · Forensics verification. Monthly salary is a separate company payroll obligation, not an activation refund.</p>
    <p className="mt-2 text-xs text-slate-400">A File Number alone is not identity verification and does not provide access to any Client's funds, wallet, employment or private Folder.</p>
   </header>
   {error&&<p role="alert" className="rounded-xl border border-rose-300/30 p-4 text-sm text-rose-200">{error}</p>}
   {message&&<p role="status" className="rounded-xl border border-cyan-300/30 p-4 text-sm text-cyan-100">{message}</p>}
   {step==='file'&&<section className="space-y-4 rounded-2xl border border-white/15 p-6">
    <h2 className="text-xl font-bold">1. Enter your issued File Number</h2>
    <label className="block text-sm text-slate-200">Client File Number
     <input autoComplete="off" value={fileNumber} onChange={e=>setFileNumber(e.target.value.toUpperCase().trim())}
      placeholder="WEAVE-..." className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3 font-mono text-white"/>
    </label>
    <button disabled={!/^WEAVE-[A-Z0-9-]{6,110}$/.test(fileNumber)}
     onClick={()=>setStep('plan')} className="rounded-lg bg-cyan-300 px-5 py-3 font-semibold text-slate-950 disabled:opacity-40">
      Continue to File Folder verification
    </button>
    <details className="text-xs text-slate-400"><summary className="cursor-pointer">Resume an earlier private verification</summary>
     <label className="mt-3 block">Your private verification code
      <input autoComplete="off" type="password" value={ticket} onChange={e=>setTicket(e.target.value)}
       className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3 text-white"/>
     </label>
     <button disabled={busy||!/^[a-f0-9]{64}$/i.test(ticket)} onClick={()=>void refresh(ticket).catch(e=>setError(e.message))}
      className="mt-3 rounded-lg border border-white/30 px-3 py-2">Resume</button>
    </details>
   </section>}
   {step==='plan'&&<section className="space-y-4 rounded-2xl border border-cyan-300/20 p-6">
    <h2 className="text-xl font-bold">2. Name your Pro File Folder business</h2>
    <p className="font-mono text-xs text-cyan-200">Issued File Number: {fileNumber}</p>
    <label className="block text-sm">File Folder business name
     <input value={businessName} onChange={e=>setBusinessName(e.target.value)}
      placeholder="The name your customers will recognize" maxLength={180}
      className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3"/>
    </label>
    <div className="space-y-3 rounded-xl border border-white/15 p-4" data-client-regional-location-intake="true">
      <h3 className="font-semibold">Your company operating address and location</h3>
      <p className="text-xs text-slate-300">Provide your real country, city, region and contact address. Administration verifies the company territory before opening the Pro File Folder. A location does not create an appointment by itself.</p>
      <div className="grid gap-3 sm:grid-cols-2">
       <label className="block text-sm">Country<input required maxLength={100} autoComplete="country-name"
        value={operatingCountry} onChange={e=>setOperatingCountry(e.target.value)}
        placeholder="Spain" className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3"/></label>
       <label className="block text-sm">Region or province<input required maxLength={150}
        value={operatingRegion} onChange={e=>setOperatingRegion(e.target.value)}
        placeholder="Region / province" className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3"/></label>
       <label className="block text-sm">City or town<input required maxLength={150}
        value={operatingCity} onChange={e=>setOperatingCity(e.target.value)}
        placeholder="City / town" className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3"/></label>
       <label className="block text-sm">Postal code, if applicable<input maxLength={30}
        value={postalCode} onChange={e=>setPostalCode(e.target.value)}
        className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3"/></label>
      </div>
      <label className="block text-sm">Street / contact address<textarea required rows={2} maxLength={500}
       value={contactAddress} onChange={e=>setContactAddress(e.target.value)}
       placeholder="Your actual contact address in the company operating location"
       className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3"/></label>
    </div>
    <h3 className="text-lg font-semibold">3. Submit your business plan</h3>
    {PLAN_FIELDS.map(([key,label])=><label key={key} className="block text-sm text-slate-200">{label}
     <textarea rows={3} maxLength={3000} value={plan[key]||''}
      onChange={e=>setPlan(p=>({...p,[key]:e.target.value}))}
      className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3 text-white"/>
    </label>)}
    <div className="space-y-3 rounded-xl border border-white/15 p-4">
     <h3 className="font-semibold">4. Pro File Folder agreement and signature</h3>
     <p className="text-sm leading-6 text-slate-200">I request a Pro File Folder under my issued File Number. I acknowledge the one-time <strong>680 USDT activation fee</strong>, paid exclusively through the official TRON USDT (TRC-20) wallet shown after independent identity and plan review. Payment evidence must be verified by Weave Forensics before activation. This fee is not a personal loan, wallet deposit or recurring subscription.</p>
     <p className="text-sm leading-6 text-slate-200">This Pro File Folder is for a WEAVE employee with a separately approved company position. The monthly salary, employment responsibilities and actual payments are controlled by the employee's recorded company appointment, not by this 680 USDT activation charge. The Folder fee does not buy a job or guarantee salary.</p>
     <p className="text-sm leading-6 text-slate-200">My business plan and name form the operating direction of my Folder. My existing verified business earnings, including any Siblings Event claims, require separate accounting; paying this fee does not establish or guarantee withdrawal of funds. Private Folder access requires identity and payment verification and correct account ownership.</p>
     <label className="block text-sm">Your full registered name · electronic signature
      <input value={signedName} onChange={e=>setSignedName(e.target.value)} autoComplete="name"
       className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3"/>
     </label>
     <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={accepted}
       onChange={e=>setAccepted(e.target.checked)} className="mt-1"/>
       I have read and voluntarily accepted the Pro File Folder activation terms and consent to my typed signature being recorded.
     </label>
    </div>
    <button disabled={busy||!accepted||businessName.trim().length<3||signedName.trim().length<4||
      operatingCountry.trim().length<2||operatingRegion.trim().length<2||
      operatingCity.trim().length<2||contactAddress.trim().length<6||
      PLAN_FIELDS.some(([key])=>(plan[key]||'').trim().length<10)}
      onClick={()=>void submitPlan()} className="rounded-lg bg-cyan-300 px-5 py-3 font-semibold text-slate-950 disabled:opacity-40">
      {busy?'Submitting…':'Submit business plan and signed agreement'}
    </button>
   </section>}
   {step==='status'&&verification&&<section className="space-y-4 rounded-2xl border border-white/15 p-6">
    <h2 className="text-xl font-bold">Your verification workspace</h2>
    <p className="font-mono text-xs text-cyan-200">{verification.fileNumber}</p>
    <p className="text-sm">File Folder business: <strong>{verification.businessName}</strong></p>
    {verification.operatingLocation&&<p className="text-sm text-slate-200" data-pro-verified-operating-location="true">
      Submitted operating location: {verification.operatingLocation.city}, {verification.operatingLocation.region}, {verification.operatingLocation.country} · subject to Administration territory approval
    </p>}
    {verification.companyPosition?<div className="rounded-xl border border-cyan-300/20 bg-cyan-300/[.04] p-4">
      <p className="text-xs uppercase tracking-widest text-cyan-200">Administration-approved WEAVE employment</p>
      <p className="mt-1 text-lg font-semibold">{verification.companyPosition.title}</p>
      <p className="mt-1 text-sm text-slate-200">Monthly salary: {verification.companyPosition.monthlySalaryUSDT!==null
       ?verification.companyPosition.monthlySalaryUSDT.toLocaleString()+' USDT according to the approved company offer'
       :'Pending confirmation in the company salary record'}</p>
      <p className="mt-1 text-xs text-slate-400">Position and payroll are verified independently from the Pro File Folder activation fee. Salary is not automatically credited by activating the Folder.</p>
     </div>:<p className="text-sm text-amber-200">Company employment status and salary: awaiting Administration verification of an approved Pro staff appointment.</p>}
    <p className="text-sm capitalize text-amber-200">Status: {verification.status.replaceAll('_',' ')}</p>
    <p className="text-xs text-slate-400">Application reference: {verification.reference}</p>
    {verification.siblingsEvent&&<div className="rounded-xl border border-violet-300/25 bg-violet-300/[.05] p-4" data-verified-cj-siblings-event="true">
     <p className="text-xs uppercase tracking-widest text-violet-200">CJ Dorado · Siblings Event · Mandate business earnings</p>
     <p className="mt-2 text-3xl font-bold">{verification.siblingsEvent.reportedAmountUSDT.toLocaleString()} USDT</p>
     <p className="mt-1 text-sm text-amber-200">Reported amount · Source verification pending / restricted</p>
     <p className="mt-2 text-xs text-slate-300">Reconciled earnings recorded: {verification.siblingsEvent.verifiedAmountUSDT.toLocaleString()} USDT · No withdrawable amount established. Other types of funds: Pending verification.</p>
     <p className="mt-2 text-xs text-slate-400">Your Siblings Event information is separate from the one-time Pro service fee. Paying 680 USDT does not establish or automatically release these funds.</p>
    </div>}
    <details className="text-xs text-slate-300"><summary className="cursor-pointer">Save private verification code</summary>
     <p className="mt-2 break-all font-mono">{ticket}</p>
     <p className="mt-2">Keep this code private. It is needed if you resume the verification on another device. Do not post it publicly.</p>
    </details>
    {verification.status==='pending_identity'&&<p className="rounded-lg border border-amber-300/20 p-4 text-sm text-slate-200">Administration is reviewing your File Number, identity, electronic signature, business name and business plan. Payment instructions are not available until that review is complete.</p>}
    {verification.status==='payment_rejected'&&<div className="space-y-3 rounded-lg border border-rose-300/30 p-4">
     <h3 className="font-semibold text-rose-200">Payment evidence needs a new review</h3>
     <p className="text-sm text-slate-200">Forensics finding: {verification.rejectionReason||'Receipt not independently confirmed.'} The original evidence is retained for audit. Do not send another payment without reconciling with Administration.</p>
     <button type="button" onClick={()=>{
      sessionStorage.removeItem(SESSION_KEY);setTicket('');setVerification(null);
      setStep('file');setError('');setMessage('');setTxHash('')
     }} className="rounded-lg border border-white/30 px-4 py-2 text-sm">Start a new verification request</button>
    </div>}
    {verification.status==='payment_required'&&<div className="space-y-4 rounded-lg border border-cyan-300/20 p-4">
     <h3 className="text-lg font-bold">5. Activate your Pro File Folder · 680 USDT</h3>
     {verification.rejectionReason&&<p className="text-sm text-rose-200">Forensics finding: {verification.rejectionReason}</p>}
     {verification.walletAddress?<div className="space-y-2">
      <p className="text-xs text-slate-300">Official receiving wallet · USDT TRC-20</p>
      <p className="break-all font-mono text-sm">{verification.walletAddress}</p>
      <button onClick={()=>void navigator.clipboard.writeText(verification.walletAddress||'')}
       className="rounded-lg border border-white/25 px-3 py-2 text-xs">Copy wallet address</button>
     </div>:<p className="text-amber-200">Receiving wallet not yet configured. Do not transfer funds.</p>}
     <p className="text-xs text-slate-300">Send exactly 680 USDT using TRON (TRC-20). Other networks and native TRX are not accepted; network fees are separate.</p>
     <label className="block text-sm">TRON blockchain transaction ID
      <input value={txHash} onChange={e=>setTxHash(e.target.value.trim())}
       maxLength={64} placeholder="64-character transaction hash"
       className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3 font-mono text-sm"/>
     </label>
     <button disabled={busy||!verification.walletAddress||!/^[a-f0-9]{64}$/i.test(txHash)}
      onClick={()=>void submitPayment()}
      className="rounded-lg bg-cyan-300 px-5 py-3 font-semibold text-slate-950 disabled:opacity-40">Send payment evidence to Forensics</button>
    </div>}
    {verification.status==='pending_forensics'&&<p className="text-sm text-slate-200">Your transaction hash was received. Forensics is checking the actual blockchain receipt, amount and receiving address. Do not send a duplicate payment.</p>}
    {verification.status==='paid_pending_account'&&<section className="space-y-3 rounded-xl border border-cyan-300/25 p-5">
      <h3 className="text-lg font-semibold">6. Secure Client account registration</h3>
      <p className="text-sm text-slate-200">Forensics has independently verified your Pro activation. Request a private account-registration link to the email address already recorded in your approved company employment offer. Your File Number is not a login or a password. Create your own secure Client account using the link; Administration then verifies account ownership and finalizes the existing Pro File Folder. Do not make another activation payment.</p>
      <button type="button" disabled={busy} onClick={()=>void requestRegistrationInvite()}
       className="rounded-lg bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-40">Email me my verified company registration link</button>
      <p className="text-xs text-slate-400">If you already received an approved private company invitation, you may use that invitation instead. No registration token is displayed in this public workspace.</p>
     </section>}
    {verification.status==='active'&&<p className="text-sm text-emerald-200">Pro File Folder activated. Sign in with the secure Client account you registered through the approved company email invitation, then open your private File Folder and company workspace. This verification code is not a login.</p>}
    {verification.status==='rejected'&&<p className="text-sm text-rose-200">Verification requires Administration attention. Contact the company using your application reference.</p>}
    <button type="button" disabled={busy} onClick={()=>void refresh(ticket).catch(e=>setError(e.message))}
     className="rounded-lg border border-cyan-300/30 px-4 py-2 text-sm">Refresh verification status</button>
   </section>}
   <p className="text-xs text-slate-400">Weave will not ask you to transfer funds to a wallet sent in a personal message. Verify the official receiving address in this workspace before any payment.</p>
   <Link href="/" className="inline-block text-xs text-cyan-200 underline">Weave homepage</Link>
  </div>
 </main>
}
