'use client'
import Link from 'next/link'
import {useCallback,useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
type RecordRow={
 user_id:string;file_number:string;source_role:'agent'|'bridger';status:string;
 name:string;email:string;business_name:string;operating_country:string;operating_region:string;
 operating_city:string;payment_wallet:string|null;payment_tx_hash:string|null;
 payment_submitted_at:string|null;signed_at:string|null;verified_amount_usdt:number|null;
 agreed_monthly_salary_usdt:number;employment_terms_reference:string;
 rejection_reason:string|null;is_active:boolean;current_role:string
}
export default function AdminProRegionalManagerForensics(){
 const {user,token,isInitialized}=useAuth()
 const [entries,setEntries]=useState<RecordRow[]>([])
 const [evidence,setEvidence]=useState<Record<string,string>>({})
 const [amount,setAmount]=useState<Record<string,string>>({})
 const [network,setNetwork]=useState<Record<string,string>>({})
 const [checked,setChecked]=useState<Record<string,boolean>>({})
 const [reason,setReason]=useState<Record<string,string>>({})
 const [working,setWorking]=useState('')
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const load=useCallback(async()=>{
  if(!token)return
  const r=await fetch('/api/admin/pro-regional-manager-activations',
   {headers:{Authorization:'Bearer '+token},cache:'no-store'})
  const data=await r.json()
  if(!r.ok)throw new Error(data.error||'Unable to read Forensics register')
  setEntries(data.activations||[])
 },[token])
 useEffect(()=>{
  if(!isInitialized||user?.role!=='admin')return
  void load().catch(e=>setError(e instanceof Error?e.message:'Forensics register unavailable'))
 },[isInitialized,user?.role,load])
 async function act(entry:RecordRow,action:'approve_payment'|'reject_payment'){
  if(!token)return
  setWorking(entry.user_id);setError('');setNotice('')
  try{
   const r=await fetch('/api/admin/pro-regional-manager-activations',{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({
     action,userId:entry.user_id,confirmation:'VERIFY PRO MANAGER',
     independentlyVerified:checked[entry.user_id]===true,
     onChainConfirmed:checked[entry.user_id]===true,
     verifiedTxHash:entry.payment_tx_hash,verifiedWallet:entry.payment_wallet,
     network:network[entry.user_id]||'TRC20_USDT',
     verifiedAmountUSDT:Number(amount[entry.user_id]||0),
     evidenceReference:evidence[entry.user_id]||'',reason:reason[entry.user_id]||'',
    })})
   const data=await r.json()
   if(!r.ok)throw new Error(data.error||'Forensics decision failed')
   setNotice(data.notice||'Forensics decision recorded')
   await load()
  }catch(e){setError(e instanceof Error?e.message:'Forensics decision failed')}
  finally{setWorking('')}
 }
 if(!isInitialized)return <main className="p-6">Opening Administration Forensics…</main>
 if(user?.role!=='admin')return <main className="p-6">Administration only.</main>
 return <main className="mx-auto max-w-6xl space-y-6 p-5 text-white" data-admin-pro-regional-manager-forensics="true">
  <nav className="flex flex-wrap gap-4 text-xs text-sky-200">
   <Link href="/admin/control-center">Administration Control Center</Link>
   <Link href="/admin/pro-regional-manager-applications">Pro Manager applications</Link>
   <Link href="/admin/pro-file-number-verifications">External Client Pro verifications</Link>
   <Link href="/admin/company-active-wallet">Company Active Wallet settings</Link>
  </nav>
  <header className="space-y-2">
   <p className="text-xs uppercase tracking-widest text-sky-200">Administration · A Time · Forensics</p>
   <h1 className="text-3xl font-semibold">Pro Regional Manager · Activation Forensics</h1>
   <p className="text-sm leading-6 text-slate-300">Review signed Agent/Bridger Pro File Folder activation against independently verified 680 USDT on TRON (TRC-20). Never credit wallets or approve solely because an applicant entered a transaction hash. Company salary is an independently agreed payroll term.</p>
  </header>
  {error&&<p role="alert" className="rounded-lg border border-rose-300/25 p-4 text-rose-100">{error}</p>}
  {notice&&<p role="status" className="rounded-lg border border-sky-300/25 p-4 text-sky-200">{notice}</p>}
  <div className="space-y-4">{entries.map(a=><section key={a.user_id} className="space-y-3 rounded-2xl border border-white/15 bg-slate-950/50 p-5">
   <div className="flex flex-wrap items-start justify-between gap-3">
    <div><h2 className="text-xl font-semibold">{a.name} · {a.source_role==='agent'?'Stability':'Hope'}</h2>
     <p className="text-xs text-slate-400">{a.email} · {a.operating_city}, {a.operating_region}, {a.operating_country}</p></div>
    <span className="text-xs text-sky-200">{a.status.replaceAll('_',' ')}</span>
   </div>
   <p className="break-all font-mono text-xs">Pro File Number: {a.file_number}</p>
   <p className="text-sm">Business: {a.business_name} · Agreed monthly salary: {Number(a.agreed_monthly_salary_usdt||0).toLocaleString()} USDT</p>
   <p className="text-xs text-slate-400">Signed company terms reference: {a.employment_terms_reference} · Electronic signature: {a.signed_at?'Recorded':'Not signed'}</p>
   {a.status==='pending_forensics'&&<>
    <div className="space-y-2 rounded-lg border border-amber-200/25 bg-amber-300/[.05] p-4 text-xs">
     <p>Reported transaction: <span className="break-all font-mono">{a.payment_tx_hash}</span></p>
     <p>Reported receiving wallet: <span className="break-all font-mono">{a.payment_wallet}</span></p>
     <p>Reported on: {a.payment_submitted_at?new Date(a.payment_submitted_at).toLocaleString():'Unavailable'}</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
     <label className="text-sm">Verified on-chain amount (USDT)<input type="number" step=".01" min="0"
      value={amount[a.user_id]||''} onChange={e=>setAmount(c=>({...c,[a.user_id]:e.target.value}))}
      className="mt-2 w-full rounded-lg border border-white/15 bg-slate-900 p-3"/></label>
     <label className="text-sm">Verified network<select value={network[a.user_id]||'TRC20_USDT'}
      onChange={e=>setNetwork(c=>({...c,[a.user_id]:e.target.value}))}
      className="mt-2 w-full rounded-lg border border-white/15 bg-slate-900 p-3">
      <option value="TRC20_USDT">USDT TRON (TRC-20)</option><option value="other">Other · do not approve</option>
     </select></label>
    </div>
    <label className="block text-sm">Independent chain/treasury evidence reference
     <input value={evidence[a.user_id]||''} maxLength={255}
      onChange={e=>setEvidence(c=>({...c,[a.user_id]:e.target.value}))}
      placeholder="Verified explorer/treasury reconciliation reference"
      className="mt-2 w-full rounded-lg border border-white/15 bg-slate-900 p-3"/></label>
    <label className="flex items-start gap-3 text-sm text-slate-300"><input type="checkbox" className="mt-1"
      checked={checked[a.user_id]||false}
      onChange={e=>setChecked(c=>({...c,[a.user_id]:e.target.checked}))}/>
     I independently confirmed actual cleared 680 USDT on TRON (TRC-20), transaction hash, recipient address, original applicant identity, unique receipt, and approved company position.</label>
    <div className="flex flex-wrap gap-3">
     <button disabled={!!working||!checked[a.user_id]||Number(amount[a.user_id])!==680||
       (evidence[a.user_id]||'').trim().length<12}
      onClick={()=>void act(a,'approve_payment')}
      className="rounded-lg bg-sky-300 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-40">Verify and activate original-role Pro Folder</button>
    </div>
    <label className="block text-sm">Reason to reject unverified receipt
     <textarea value={reason[a.user_id]||''} onChange={e=>setReason(c=>({...c,[a.user_id]:e.target.value}))}
      className="mt-2 w-full rounded-lg border border-white/15 bg-slate-900 p-3" rows={2} maxLength={1000}/></label>
    <button disabled={!!working||!checked[a.user_id]||(reason[a.user_id]||'').trim().length<10}
     onClick={()=>void act(a,'reject_payment')}
     className="rounded-lg border border-rose-300/40 px-4 py-3 text-sm text-rose-100 disabled:opacity-40">Reject proof with reason</button>
   </>}
   {a.rejection_reason&&<p className="text-sm text-rose-200">Previous Forensics note: {a.rejection_reason}</p>}
  </section>)}</div>
  {!entries.length&&<p className="text-sm text-slate-400">No Pro Manager activations recorded yet. Approve an eligible Lifestyle application first.</p>}
 </main>
}
