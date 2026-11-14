'use client'
import {useCallback,useEffect,useState} from 'react'
import Link from 'next/link'
import {Building2,ChartNoAxesCombined,ClipboardList,Layers3,Store,UsersRound} from 'lucide-react'
import './pro-verification.css'
import {PRO_MANAGER_COMPANY_PURPOSE,PRO_MANAGER_FILE_FOLDER_DISTINCTION,
 PRO_MANAGER_PLAN_QUESTIONS,PRO_MANAGER_AGREEMENT_SECTIONS} from '@/lib/pro-regional-manager-language'
type Verification={reference:string;fileNumber:string;businessName:string;
 status:string;feeUSDT:number;network:string;walletAddress:string|null;
 paymentVerified:boolean;folderActivated?:boolean;rejectionReason?:string|null;
 companyPosition?:{title:string;monthlySalaryUSDT:number|null;salaryStatus:string}|null;
 operatingLocation?:{country:string;region:string;city:string}|null;
 siblingsEvent?:{reportedAmountUSDT:number;verifiedAmountUSDT:number;status:string;availableForWithdrawal:boolean}|null}
const PLAN_FIELDS=PRO_MANAGER_PLAN_QUESTIONS
const SESSION_KEY='weave-pro-number-verification-secret'
const STAGE_COPY:Record<string,{title:string;detail:string}>={
 pending_identity:{
  title:'Awaiting Administrations verification',
  detail:'Your business plan and signed agreement are saved. Administrations is reviewing your identity and appointment. No payment is required yet.',
 },
 payment_required:{
  title:'Awaiting your activation payment',
  detail:'Administrations has approved the payment stage. Review the official 680 USDT TRC-20 wallet below, then submit your transaction ID for independent Forensics verification.',
 },
 pending_forensics:{
  title:'Payment evidence received · Forensics reviewing',
  detail:'Your payment reference is saved. Forensics must confirm the actual blockchain receipt before your verification advances. Do not transfer a second payment.',
 },
 payment_rejected:{
  title:'Payment evidence needs reconciliation',
  detail:'Your application remains saved, but Forensics needs to resolve the payment evidence. Read the finding below and contact Administrations before taking further action.',
 },
 paid_pending_account:{
  title:'Payment verified · account activation in progress',
  detail:'Forensics has verified the activation payment. Continue only when the Pro File Folder and company registration are authorized.',
 },
 active:{
  title:'Pro File Folder activated',
  detail:'Your company verification is complete. Sign in through your approved Client account to access your File Folder.',
 },
 rejected:{
  title:'Verification requires Administrations attention',
  detail:'Your application record remains saved. Contact Administrations using your application reference.',
 },
}
export default function ProFileNumberVerification(){
 const [step,setStep]=useState<'file'|'plan'|'status'>('file')
 const [restoring,setRestoring]=useState(true)
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
 const refresh=useCallback(async(secret?:string)=>{
  const url='/api/public/pro-file-number-verification'+(secret?'?ticket='+encodeURIComponent(secret):'')
  const response=await fetch(url,{cache:'no-store'})
  const json=await response.json()
  if(!response.ok)throw new Error(json.error||'Verification status unavailable')
  // The server keeps a persistent HttpOnly private session. Older sessions
  // can still be restored with their original sessionStorage reference.
  if(secret){sessionStorage.setItem(SESSION_KEY,secret);setTicket(secret)}
  setVerification(json.verification);setStep('status')
 },[])
 useEffect(()=>{
  let cancelled=false
  const restore=async()=>{
   const oldSecret=sessionStorage.getItem(SESSION_KEY)
   try{
    await refresh()
   }catch(e){
    if(oldSecret){
     try{await refresh(oldSecret)}
     catch{sessionStorage.removeItem(SESSION_KEY);if(!cancelled)setError('Your saved verification could not be restored. Use your private verification code or contact Administrations; do not submit a duplicate application.')}
    }else if(e instanceof Error&&!e.message.includes('Verification reference unavailable')){
     if(!cancelled)setError('Unable to check your saved verification. Refresh the page before submitting a new application.')
    }
   }finally{if(!cancelled)setRestoring(false)}
  }
  void restore()
  return ()=>{cancelled=true}
 },[refresh])
 useEffect(()=>{
  if(restoring||step!=='status'||!verification||['active','rejected','payment_rejected'].includes(verification.status))return
  let stopped=false
  let refreshing=false
  const update=async()=>{
   if(stopped||refreshing||document.visibilityState==='hidden')return
   refreshing=true
   try{await refresh()}catch{/* Keep the last verified stage; manual refresh reports errors. */}
   finally{refreshing=false}
  }
  const timer=window.setInterval(()=>void update(),20000)
  window.addEventListener('focus',update)
  document.addEventListener('visibilitychange',update)
  return ()=>{stopped=true;window.clearInterval(timer);window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',update)}
 },[restoring,step,verification?.status,refresh])
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
   setMessage(json.resumed
    ?'Your existing verification has been restored. Continue from the saved stage below.'
    :'Business plan and electronic agreement recorded. Administrations must confirm your File Number and identity before payment instructions become available.')
  }catch(e){setError(e instanceof Error?e.message:'Verification unavailable')}
  finally{setBusy(false)}
 }
 async function submitPayment(){
  if(!verification?.walletAddress)return
  setBusy(true);setError('');setMessage('')
  try{
   const response=await fetch('/api/public/pro-file-number-verification',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'submit_payment',ticket,txHash,expectedWallet:verification.walletAddress}),
   })
   const json=await response.json()
   if(!response.ok)throw new Error(json.error||'Unable to submit payment evidence')
   await refresh()
   setMessage('Payment reference received. Forensics must independently verify the TRC-20 transaction. Do not send a duplicate transfer.')
  }catch(e){setError(e instanceof Error?e.message:'Payment review unavailable')}
  finally{setBusy(false)}
 }
 async function clearSavedVerification(){
  setBusy(true);setError('');setMessage('')
  try{
   const response=await fetch('/api/public/pro-file-number-verification',{method:'DELETE'})
   if(!response.ok)throw new Error('Could not clear the saved browser access.')
   sessionStorage.removeItem(SESSION_KEY)
   setTicket('');setVerification(null);setFileNumber('');setStep('file');setTxHash('')
  }catch(e){setError(e instanceof Error?e.message:'Unable to change File Number')}
  finally{setBusy(false)}
 }
 async function requestRegistrationInvite(){
  if(!verification)return
  setBusy(true);setError('');setMessage('')
  try{
   const response=await fetch('/api/public/pro-file-number-verification',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'send_registration_invite',ticket:ticket||undefined}),
   })
   const body=await response.json()
   if(!response.ok)throw new Error(body.error||'Secure invitation could not be sent')
   setMessage(body.message||'Check the approved company email for your private registration link.')
  }catch(e){setError(e instanceof Error?e.message:'Secure registration unavailable')}
  finally{setBusy(false)}
 }
 return <main id="weave-pro-verification" className="pv-shell" data-pro-file-number-verification="true" data-pro-file-folder-theme="radiant-blue">
  <div aria-hidden="true" className="pv-atmosphere"/>
  <div className="pv-container">
   <nav className="pv-masthead" aria-label="Weave company identity">
    <Link className="pv-brand" href="/" aria-label="Weave of Presence homepage">
     <span className="pv-brand-mark" aria-hidden="true">W</span>
     <span><strong className="pv-brand-name">WEAVE</strong><small className="pv-brand-sub">of Presence</small></span>
    </Link>
    <span className="pv-company-caption">System Switch · Bridge of Radiance</span>
    <span className="pv-role-pill">Dream Lovely · Pro Staff</span>
   </nav>
   {restoring&&<section role="status" aria-live="polite" data-pro-stage="restoring"
    className="mb-6 rounded-xl border border-cyan-300/25 bg-slate-950/70 p-5 text-sm text-cyan-100">
    Checking your saved Pro staff verification stage…
   </section>}
   {!restoring&&verification&&<section role="status" aria-live="polite" data-pro-persistent-status={verification.status}
    className="mb-6 space-y-3 rounded-2xl border border-cyan-300/35 bg-slate-950/95 p-5 text-white shadow-lg sm:p-7">
    <p className="text-xs font-bold uppercase tracking-widest text-cyan-200">Your saved company verification · {verification.fileNumber}</p>
    <h2 className="text-xl font-bold leading-snug sm:text-2xl">{STAGE_COPY[verification.status]?.title||'Verification under review'}</h2>
    <p className="text-sm leading-7 text-slate-200">{STAGE_COPY[verification.status]?.detail||'Your submitted verification record remains available.'}</p>
    <p className="text-xs text-slate-400">File Folder: {verification.businessName} · This stage is retrieved from your private company record, not a new application.</p>
    <div className="flex flex-wrap gap-3">
     <a href="#pro-verification-workspace" className="inline-flex min-h-11 items-center rounded-lg bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950">
      {verification.status==='payment_required'?'View official payment instructions':'Continue my saved verification'}
     </a>
     <button type="button" disabled={busy} onClick={()=>void clearSavedVerification()}
      className="rounded-lg border border-white/30 px-4 py-3 text-xs font-semibold text-slate-200 disabled:opacity-40">
      This is not my File Number
     </button>
    </div>
   </section>}
   <header className="pv-hero">
    <div className="pv-hero-copy">
     <p className="pv-eyebrow">WEAVE of Presence · The Company of Time · Company Staff Verification</p>
     <h1>Pro Regional Manager <span>Your business. Your Pro world.</span></h1>
     <p className="pv-hero-description">
      Your Pro File Folder turns your work in life into an organized business environment inside Weave:
      your systems, your customers, authorized employees and the records that show your progress.
      As your business serves people and creates verified value, your participation strengthens the company.
      This is a distinct company position, not an ordinary Regional Manager appointment.
     </p>
     <div className="pv-hero-signals" aria-label="Pro business features">
      <span>Your own business world</span>
      <span>Customer Door & systems</span>
      <span>Employees & regional growth</span>
      <span>Administrations + Forensics</span>
     </div>
     <a className="pv-hero-explore" href="#pro-client-file-folder-features">Explore what your File Folder can do</a>
    </div>
    <div className="pv-hero-visual" aria-hidden="true">
     <span className="pv-visual-tag pv-visual-tag-left">YOUR BUSINESS · YOUR SYSTEMS</span>
     <div className="pv-folder">
      <span className="pv-folder-tab">PRO</span>
      <div className="pv-folder-inner"><strong>W</strong><span>Private business world</span></div>
     </div>
     <span className="pv-visual-tag pv-visual-tag-right">CUSTOMER DOOR · OPERATIONS</span>
    </div>
   </header>
   <section id="pro-client-file-folder-features" className="pv-feature-section" aria-labelledby="pro-client-file-folder-features-title">
    <div className="pv-feature-heading">
     <div><p className="pv-process-label">THE PRO FILE FOLDER</p>
      <h2 id="pro-client-file-folder-features-title">Build the business you know. Operate it through Weave.</h2></div>
     <p>Pro defines your File Folder's operating tier; your approved business plan defines what you will do with it.</p>
    </div>
    <div className="pv-benefit-grid">
     {([
      [Building2,'Private business world','An independent Pro environment formed around your own work, not a uniform profession.'],
      [Store,'Customer Door','A customer-facing entrance for products, services and genuine business requests.'],
      [Layers3,'Systems & workshops','Business tools, modules and workspaces organized around practical daily work.'],
      [UsersRound,'Employees & participation','Coordinate authorized people, tasks and responsibilities to support your enterprise.'],
      [ClipboardList,'Operating records','Keep orders, commitments, fulfillment and verified activity connected.'],
      [ChartNoAxesCombined,'Regional expansion','Develop customers, partnerships and participation in your approved territory.'],
     ] as const).map(([Icon,title,description])=><article className="pv-benefit" key={title}>
      <span className="pv-benefit-icon"><Icon size={22} strokeWidth={1.8} aria-hidden="true"/></span>
      <h3>{title}</h3><p>{description}</p>
     </article>)}
    </div>
    <div className="pv-growth-band">
     <strong>Your success is how Weave grows.</strong>
     <span>Build real systems, serve real customers and organize reliable work. Your enterprise develops through its results, and Weave grows through the value created by participation.</span>
    </div>
   </section>
   <div id="pro-verification-workspace" className="pv-process" aria-label="Verification progress">
    <span className="pv-process-label">Your company entry path</span>
    <ol className="pv-steps">
     {['File Number','Business & agreement','Verification status'].map((label,index)=>{
      const current=step==='file'?0:step==='plan'?1:2
      return <li key={label} className="pv-step" data-current={current===index} data-done={current>index}
       aria-current={current===index?'step':undefined}>
       <span className="pv-step-count">{index+1}</span>{label}
      </li>
     })}
    </ol>
   </div>
   <div className="pv-workgrid">
    <div className="pv-main-column">
   {error&&<p role="alert" className="rounded-xl border border-rose-300/30 p-4 text-sm text-rose-200">{error}</p>}
   {message&&<p role="status" className="rounded-xl border border-cyan-300/30 p-4 text-sm text-cyan-100">{message}</p>}
   {!restoring&&step==='file'&&<section className="pv-panel space-y-4" data-pro-stage="file-number">
    <h2 className="text-xl font-bold">01 · Identify your company File Folder</h2>
    <p className="text-sm text-slate-600">Use only the File Number formally issued to you by Weave Administrations. You do not need a password or a new account to begin. No payment is required at this stage.</p>
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
      className="pv-secondary mt-3 rounded-lg border border-white/30 px-3 py-2">Resume</button>
    </details>
   </section>}
   {!restoring&&step==='plan'&&<section className="pv-panel space-y-4" data-pro-stage="business-plan">
    <h2 className="text-xl font-bold">02 · Your Pro File Folder business</h2>
    <p className="text-sm text-slate-600">{PRO_MANAGER_FILE_FOLDER_DISTINCTION}</p>
    <div className="rounded-xl border border-sky-200 bg-sky-50 p-4" data-pro-reciprocal-company-purpose="true">
     <h3 className="font-semibold text-sky-900">Your success is how Weave grows</h3>
     <p className="mt-2 text-sm leading-7 text-sky-900">{PRO_MANAGER_COMPANY_PURPOSE}</p>
    </div>
    <p className="font-mono text-xs text-cyan-200">Issued File Number: {fileNumber}</p>
    <label className="block text-sm">File Folder business name
     <input value={businessName} onChange={e=>setBusinessName(e.target.value)}
      placeholder="The name your customers will recognize" maxLength={180}
      className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3"/>
    </label>
    <div className="space-y-3 rounded-xl border border-white/15 p-4" data-client-regional-location-intake="true">
      <h3 className="font-semibold">Your company operating address and location</h3>
      <p className="text-xs text-slate-300">Provide your real country, city, region and contact address. Administrations verifies the company territory before opening the Pro File Folder. A location does not create an appointment by itself.</p>
      <div className="grid gap-3 sm:grid-cols-2">
       <label className="block text-sm">Country<input required maxLength={100} autoComplete="country-name"
        value={operatingCountry} onChange={e=>setOperatingCountry(e.target.value)}
        placeholder="Operating country" className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3"/></label>
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
    <h3 className="text-lg font-semibold">3. Business plan · From your work to a functioning enterprise</h3>
    <p className="text-sm leading-7 text-slate-600">Explain the actual people, systems, responsibilities and verifiable value behind your business. Administrations reviews the plan as a model for sustained operations, not as a claim that income already exists.</p>
    {PLAN_FIELDS.map(({key,title,guidance})=><label key={key} className="block text-sm text-slate-200">{title}
     <span className="mt-1 block text-xs leading-6 text-slate-600">{guidance}</span>
     <textarea rows={4} maxLength={3000} minLength={10} required value={plan[key]||''}
      onChange={e=>setPlan(p=>({...p,[key]:e.target.value}))}
      className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3 text-white"/>
    </label>)}
    <div className="space-y-3 rounded-xl border border-white/15 p-4">
     <h3 className="font-semibold">4. Pro File Folder · Company agreement and signature</h3>
     <p className="text-sm leading-7 text-slate-700">Read the following obligations as part of the agreement you are signing. They explain what your Pro File Folder enables, how your business contributes to Weave, and what remains subject to separately approved employment and financial records.</p>
     {PRO_MANAGER_AGREEMENT_SECTIONS.map(section=><div key={section.title} className="rounded-lg border border-sky-200 bg-white p-4">
      <h4 className="font-semibold text-sky-950">{section.title}</h4>
      <p className="mt-2 text-sm leading-7 text-slate-700">{section.body}</p>
     </div>)}
     <p className="text-sm leading-7 text-slate-700">I request a Pro File Folder under my issued File Number and accept that access is conditional on verified company approval, correct account ownership, signed terms and independently checked payment evidence. In particular, existing business or Siblings Event claims require separate accounting and are not made withdrawable by this activation.</p>
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
      PLAN_FIELDS.some(({key})=>(plan[key]||'').trim().length<10)}
      onClick={()=>void submitPlan()} className="rounded-lg bg-cyan-300 px-5 py-3 font-semibold text-slate-950 disabled:opacity-40">
      {busy?'Submitting…':'Submit business plan and signed agreement'}
    </button>
   </section>}
   {!restoring&&step==='status'&&verification&&<section className="pv-panel space-y-4" data-pro-stage="verification-status">
    <h2 className="text-xl font-bold">03 · Your private verification workspace</h2>
    <p className="font-mono text-xs text-cyan-200">{verification.fileNumber}</p>
    <p className="text-sm">File Folder business: <strong>{verification.businessName}</strong></p>
    {verification.operatingLocation&&<p className="text-sm text-slate-200" data-pro-verified-operating-location="true">
      Submitted operating location: {verification.operatingLocation.city}, {verification.operatingLocation.region}, {verification.operatingLocation.country} · subject to Administrations territory approval
    </p>}
    {verification.companyPosition?<div className="rounded-xl border border-cyan-300/20 bg-cyan-300/[.04] p-4">
      <p className="text-xs uppercase tracking-widest text-cyan-200">Administrations-approved WEAVE employment</p>
      <p className="mt-1 text-lg font-semibold">{verification.companyPosition.title}</p>
      <p className="mt-1 text-sm text-slate-200">Monthly salary: {verification.companyPosition.monthlySalaryUSDT!==null
       ?verification.companyPosition.monthlySalaryUSDT.toLocaleString()+' USDT according to the approved company offer'
       :'Pending confirmation in the company salary record'}</p>
      <p className="mt-1 text-xs text-slate-400">Position and payroll are verified independently from the Pro File Folder activation fee. Salary is not automatically credited by activating the Folder.</p>
     </div>:<p className="text-sm text-amber-200">Company employment status and salary: awaiting Administrations verification of an approved Pro staff appointment.</p>}
    <p className="text-base font-bold text-amber-200" data-pro-current-stage={verification.status}>
     {STAGE_COPY[verification.status]?.title||verification.status.replaceAll('_',' ')}
    </p>
    <p className="text-xs text-slate-400">Application reference: {verification.reference}</p>
    {verification.siblingsEvent&&<div className="rounded-xl border border-violet-300/25 bg-violet-300/[.05] p-4" data-verified-cj-siblings-event="true">
     <p className="text-xs uppercase tracking-widest text-violet-200">Siblings Event · Mandate business earnings</p>
     <p className="mt-2 text-3xl font-bold">{verification.siblingsEvent.reportedAmountUSDT.toLocaleString()} USDT</p>
     <p className="mt-1 text-sm text-amber-200">Reported amount · Source verification pending / restricted</p>
     <p className="mt-2 text-xs text-slate-300">Reconciled earnings recorded: {verification.siblingsEvent.verifiedAmountUSDT.toLocaleString()} USDT · No withdrawable amount established. Other types of funds: Pending verification.</p>
     <p className="mt-2 text-xs text-slate-400">Your Siblings Event information is separate from the one-time Pro service fee. Paying 680 USDT does not establish or automatically release these funds.</p>
    </div>}
    {ticket?<details className="text-xs text-slate-300"><summary className="cursor-pointer">Save private verification code</summary>
     <p className="mt-2 break-all font-mono">{ticket}</p>
     <p className="mt-2">Keep this code private. It is needed if you resume the verification on another device. Do not post it publicly.</p>
    </details>:<p className="text-xs text-slate-400">Your private verification is saved on this browser. Use the private code you previously saved to continue on a different device.</p>}
    {verification.status==='pending_identity'&&<p className="rounded-lg border border-amber-300/20 p-4 text-sm text-slate-200">Administrations is reviewing your File Number, identity, electronic signature, business name and business plan. Once approved, this workspace automatically moves to payment instructions. Your status refreshes every 20 seconds while this page is open.</p>}
    {verification.status==='payment_rejected'&&<div className="space-y-3 rounded-lg border border-rose-300/30 p-4">
     <h3 className="font-semibold text-rose-200">Payment evidence needs a new review</h3>
     <p className="text-sm text-slate-200">Forensics finding: {verification.rejectionReason||'Receipt not independently confirmed.'} The original evidence is retained for audit. Do not send another payment without reconciling with Administrations.</p>
     <p className="text-xs text-slate-300">Your existing plan and payment review remain recorded. Do not submit another form for the same application.</p>
    </div>}
    {verification.status==='payment_required'&&<div className="space-y-4 rounded-lg border border-cyan-300/20 p-4">
     <h3 className="text-lg font-bold">Awaiting activation payment · 680 USDT</h3>
     {verification.rejectionReason&&<p className="text-sm text-rose-200">Forensics finding: {verification.rejectionReason}</p>}
     {verification.walletAddress?<div className="space-y-2">
      <p className="text-xs text-slate-300">Official receiving wallet · USDT TRC-20</p>
      <p className="break-all font-mono text-sm">{verification.walletAddress}</p>
      <button onClick={()=>void navigator.clipboard.writeText(verification.walletAddress||'')}
       className="pv-secondary rounded-lg border border-white/25 px-3 py-2 text-xs">Copy wallet address</button>
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
      <h3 className="text-lg font-semibold">6. Pro File Folder activation → account registration</h3>
      <p className="text-sm text-slate-200">{verification.folderActivated
       ?'Your payment is verified and your Pro File Folder is activated under your verified File Number and current details. Now register your Client account to access that same activated Folder. No second activation payment is required.'
       :'Your payment is verified. Administrations must complete Pro File Folder activation before account registration opens.'}</p>
      <p className="text-sm text-slate-200">Request a private registration link to your company-approved email. Create your own password using that link; registration connects your account to your activated Pro File Folder.</p>
      <button type="button" disabled={busy||!verification.folderActivated} onClick={()=>void requestRegistrationInvite()}
       className="rounded-lg bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-40">Email me my verified company registration link</button>
      <p className="text-xs text-slate-400">If you already received an approved private company invitation, you may use that invitation instead. No registration token is displayed in this public workspace.</p>
     </section>}
    {verification.status==='active'&&<p className="text-sm text-emerald-200">Pro File Folder activated. Sign in with the secure Client account you registered through the approved company email invitation, then open your private File Folder and company workspace. This verification code is not a login.</p>}
    {verification.status==='rejected'&&<p className="text-sm text-rose-200">Verification requires Administrations attention. Contact the company using your application reference.</p>}
    <button type="button" disabled={busy} onClick={()=>void refresh().catch(e=>setError(e.message))}
     className="pv-secondary rounded-lg border border-cyan-300/30 px-4 py-2 text-sm">Refresh verification status</button>
   </section>}
    </div>
    <aside className="pv-side-panel" aria-label="What a Pro File Folder means">
     <p className="pv-side-kicker">The Company of Time · Dream Lovely</p>
     <h2>One Pro standard. Your own business.</h2>
     <p>A Pro Regional Manager does not receive a predetermined business. Your approved life-work and business plan determine the workshop that grows inside your Pro File Folder.</p>
     <ol className="pv-side-flow">
      <li><span className="pv-side-number">01</span><div><strong>Identity & appointment</strong><small>Administrations independently confirms your issued File Number and company position.</small></div></li>
      <li><span className="pv-side-number">02</span><div><strong>Your Pro business world</strong><small>The business plan defines your workshop, systems, operating region and future Customer Door.</small></div></li>
      <li><span className="pv-side-number">03</span><div><strong>Participation & employees</strong><small>Authorized people work through Weave to expand your business and its purpose.</small></div></li>
      <li><span className="pv-side-number">04</span><div><strong>Verified company movement</strong><small>Forensics verifies payment evidence, while salary, customers and commercial records remain separate.</small></div></li>
     </ol>
     <details className="pv-activation-disclosure">
      <summary>Later stage: activation and Forensics</summary>
      <p>Once Administrations confirms the approved appointment, identity and business plan, the separate activation agreement explains the one-time Pro File Folder fee.</p>
      <p><strong>680 USDT on TRON (TRC-20)</strong>. The official company receiving address is shown only after the payment stage is authorized. Paying does not create a company appointment, salary or guaranteed return.</p>
     </details>
     <p>Administrations is <strong>A Time</strong>. Clients are <strong>Dream Lovely</strong>. Your business becomes part of the company through authorized systems and recorded participation.</p>
    </aside>
   </div>
   <footer className="pv-footer">
    <p>Weave will not ask you to transfer funds to a wallet sent in a personal message. Confirm the official receiving address inside your verified workspace before any payment.</p>
    <Link href="/">Return to Weave homepage</Link>
   </footer>
  </div>
 </main>
}
