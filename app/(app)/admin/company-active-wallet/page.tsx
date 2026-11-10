'use client'
import Link from 'next/link'
import {useCallback,useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'

type Change={previous_wallet:string|null;new_wallet:string;change_reason:string;changed_at:string}
type Settings={
 activeWallet:string|null;configuredInAdministration:boolean;lastUpdatedAt:string|null;
 companyTrxFundingWallet:string;rail:string;network:string;asset:string;
 history:Change[];notice:string
}
const tronAddress=/^T[1-9A-HJ-NP-Za-km-z]{33}$/

export default function CompanyActiveWalletSettings(){
 const {token,user,isInitialized}=useAuth()
 const [settings,setSettings]=useState<Settings|null>(null)
 const [draft,setDraft]=useState('')
 const [reason,setReason]=useState('')
 const [confirmation,setConfirmation]=useState('')
 const [controlVerified,setControlVerified]=useState(false)
 const [busy,setBusy]=useState(false)
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')

 const load=useCallback(async()=>{
  if(!token)return
  const response=await fetch('/api/admin/company-active-wallet',{
   headers:{Authorization:'Bearer '+token},cache:'no-store'})
  const data=await response.json()
  if(!response.ok)throw new Error(data.error||'Company wallet register unavailable')
  setSettings(data)
  setDraft(data.activeWallet||'')
  setConfirmation('')
  setReason('')
  setControlVerified(false)
 },[token])
 useEffect(()=>{
  if(!isInitialized)return
  if(user?.role!=='admin'){setLoading(false);return}
  void load().catch(e=>setError(e instanceof Error?e.message:'Company wallet settings unavailable'))
   .finally(()=>setLoading(false))
 },[user?.role,isInitialized,load])

 async function save(){
  if(!token||!settings)return
  setBusy(true);setError('');setNotice('')
  try{
   const response=await fetch('/api/admin/company-active-wallet',{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({
     action:'configure_pro_wallet',walletAddress:draft.trim(),changeReason:reason.trim(),
     expectedCurrentWallet:settings.activeWallet,
     confirmation,controlVerified,
    })
   })
   const data=await response.json()
   if(!response.ok)throw new Error(data.error||'Company wallet setting was not saved')
   await load()
   setNotice(data.notice||'Company wallet setting recorded')
  }catch(e){setError(e instanceof Error?e.message:'Unable to update receiving address')}
  finally{setBusy(false)}
 }

 if(!isInitialized||loading)return <main className="mx-auto max-w-5xl p-6">Opening company wallet controls…</main>
 if(user?.role!=='admin')return <main className="mx-auto max-w-5xl p-6">Administration access required.</main>
 return <main className="weave-operating-environment mx-auto min-h-dvh max-w-5xl space-y-6 px-4 py-8"
  data-admin-company-active-wallet="true">
  <nav className="flex flex-wrap gap-4 text-sm">
   <Link href="/admin/control-center" className="underline">Administration Control Center</Link>
   <Link href="/admin/pro-activations" className="underline">Pro Client activation register</Link>
   <Link href="/admin/pro-regional-manager-activations" className="underline">Pro Manager Forensics</Link>
  </nav>
  <header className="space-y-3 rounded-2xl border border-sky-300/30 bg-sky-300/[.07] p-6">
   <p className="text-xs font-bold uppercase tracking-widest text-sky-700">WEAVE of Presence · Administration · A Time</p>
   <h1 className="text-3xl font-bold">Company Active Wallet</h1>
   <p className="max-w-3xl text-sm leading-7">This Administration setting designates the official company receiving address for
    <strong> Pro File Folder activation payments in USDT on TRON (TRC-20)</strong>. The same destination is used by
    eligible Client, Agent and Bridger Pro Regional Manager verification flows. It does not authorize an
    unverified payment, modify previous receipts or change salaries and business earnings.</p>
  </header>
  {error&&<p role="alert" className="rounded-xl border border-rose-400/40 p-4 text-sm text-rose-800">{error}</p>}
  {notice&&<p role="status" className="rounded-xl border border-sky-300/40 p-4 text-sm text-sky-800">{notice}</p>}
  <section className="space-y-4 rounded-2xl border border-sky-200/80 bg-white/90 p-6 shadow-sm">
   <div className="space-y-2">
    <p className="text-xs font-bold uppercase tracking-widest text-sky-800">Company payment rail · Pro activation</p>
    <h2 className="text-xl font-bold">Active USDT TRC-20 receiving address</h2>
    <p className="text-sm">The active destination appears to an applicant only after Administration independently
     approves identity and company employment. The applicant must confirm the same address when providing
     a transaction hash. Forensics separately confirms the actual amount, token, network and destination.</p>
   </div>
   <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
    <p className="text-xs font-semibold uppercase text-sky-800">Current active destination</p>
    <p className="mt-2 break-all font-mono text-sm">{settings?.activeWallet||'Not configured — do not request transfers'}</p>
    <p className="mt-2 text-xs">{settings?.configuredInAdministration
     ?'Configured by Administration and persisted in the Pro wallet register.'
     :settings?.activeWallet
       ?'Environment fallback is active. Save through Administration to establish an audited setting.'
       :'No valid Pro receiving address available.'}</p>
    {settings?.lastUpdatedAt&&<p className="mt-2 text-xs">Last Administration update: {new Date(settings.lastUpdatedAt).toLocaleString()}</p>}
   </div>
   <label className="block text-sm font-semibold">New official company Pro wallet · TRON address
    <input autoComplete="off" spellCheck={false} value={draft} onChange={e=>setDraft(e.target.value.trim())}
     placeholder="T…" maxLength={34} className="mt-2 w-full rounded-xl border border-sky-300 bg-white p-3 font-mono text-sm"/>
   </label>
   <p className="text-xs text-slate-600">A TRON address can receive different assets. This configuration applies
    only to the Pro activation <strong>USDT TRC-20</strong> rail; it does not establish wallet ownership
    or prove that a blockchain payment has arrived.</p>
   <label className="block text-sm font-semibold">Reason for configuration or change
    <textarea rows={3} maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}
     placeholder="Record the company authorization and reason for changing the Pro receiving address."
     className="mt-2 w-full rounded-xl border border-sky-300 bg-white p-3 text-sm"/>
   </label>
   <label className="flex items-start gap-3 text-sm leading-6">
    <input type="checkbox" checked={controlVerified} onChange={e=>setControlVerified(e.target.checked)} className="mt-1 h-4 w-4"/>
    I have independently confirmed that this destination is authorized for WEAVE company receipts
    and have checked the full address and TRON network. I understand that a public address is not
    proof of wallet control and that earlier customer transfers remain attached to their original destination.
   </label>
   <label className="block text-sm font-semibold">Administration confirmation
    <input autoComplete="off" value={confirmation} onChange={e=>setConfirmation(e.target.value)}
     placeholder="Type SET COMPANY PRO WALLET" className="mt-2 w-full rounded-xl border border-sky-300 bg-white p-3 text-sm"/>
   </label>
   <button type="button" disabled={busy||!tronAddress.test(draft.trim())||reason.trim().length<12||
    !controlVerified||confirmation!=='SET COMPANY PRO WALLET'||!settings}
    onClick={()=>void save()} className="min-h-11 rounded-xl bg-[#245a80] px-5 py-3 font-bold text-white disabled:opacity-40">
    {busy?'Saving…':'Save company Pro receiving wallet'}
   </button>
  </section>
  <section className="space-y-3 rounded-2xl border border-slate-200 bg-white/90 p-6">
   <h2 className="text-xl font-bold">Separate company TRX funding rail</h2>
   <p className="text-sm leading-7">WEAVE also records a TRX funding destination for its separate
    System Switch funding workflow. That rail is not edited here. If Administration chooses the same
    receiving address for both, each payment must still be verified in its correct asset and ledger.</p>
   <p className="break-all rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-sm">{settings?.companyTrxFundingWallet||'Unavailable'}</p>
  </section>
  <section className="space-y-3 rounded-2xl border border-slate-200 bg-white/90 p-6">
   <h2 className="text-xl font-bold">Wallet change history</h2>
   <p className="text-sm">Each change made through the company wallet control is recorded for Administration audit.
    Changing the active destination never rewrites a submitted receipt.</p>
   {!settings?.history.length&&<p className="text-sm text-slate-600">No changes recorded in this wallet control yet.</p>}
   {settings?.history.map((entry,index)=><article key={entry.changed_at+index} className="space-y-2 rounded-xl border border-slate-200 p-4">
    <p className="text-xs font-semibold">{new Date(entry.changed_at).toLocaleString()}</p>
    <p className="break-all font-mono text-xs">From: {entry.previous_wallet||'No previous configured destination'}</p>
    <p className="break-all font-mono text-xs">To: {entry.new_wallet}</p>
    <p className="text-sm">Reason: {entry.change_reason}</p>
   </article>)}
  </section>
 </main>
}
