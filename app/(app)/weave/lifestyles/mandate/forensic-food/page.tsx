'use client'
import { useCallback,useEffect,useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-provider'
import { ArrowLeft,RefreshCcw,ShieldCheck } from 'lucide-react'

type Payout={
  payout_id:string;split_id:string;product:string;source_order_id:string;
  purchasing_agent_name:string;package_count:number;received_ngn:string;
  agent_expected_margin_ngn:string;administration_ngn:string;
  family_support_ngn:string;lead_preparation_ngn:string;
  amount_ngn:string;beneficiary:'administration'|'family_support'|'lead_manager';
  status:'pending'|'transfer_reported';transfer_reference:string|null;recorded_at:string|null
}
type Queue={payouts:Payout[];leadManager:{name:string;active:boolean}|null;note:string}
const currency=(n:unknown)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(n||0))
const labels={administration:'Administration',family_support:'Administration Child/Parents Support',lead_manager:'Stability Lead · Preparation'}

export default function FoodForensicsPage(){
  const {token,user,isInitialized}=useAuth()
  const [queue,setQueue]=useState<Queue|null>(null)
  const [details,setDetails]=useState<Record<string,{transferReference:string;bankName:string;accountLast4:string;note:string}>>({})
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const load=useCallback(async()=>{
    if(!token)return
    try{
      const res=await fetch('/api/weave/lifestyles/mandate/forensic-food',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
      const body=await res.json()
      if(!res.ok)throw new Error(body.error||'Food Forensics desk unavailable')
      setQueue(body);setError('')
    }catch(cause){setError(cause instanceof Error?cause.message:'Unable to open Food Forensics')}
  },[token])
  useEffect(()=>{void load()},[load])
  function edit(id:string,key:'transferReference'|'bankName'|'accountLast4'|'note',value:string){
    setDetails(d=>({...d,[id]:{transferReference:'',bankName:'',accountLast4:'',note:'',...d[id],[key]:value}}))
  }
  async function record(p:Payout){
    const form=details[p.payout_id]
    if(!token||!form)return
    setBusy(p.payout_id);setError('');setMessage('')
    try{
      const res=await fetch('/api/weave/lifestyles/mandate/forensic-food',{
        method:'PATCH',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body:JSON.stringify({action:'report_external_transfer',payoutId:p.payout_id,beneficiary:p.beneficiary,...form}),
      })
      const body=await res.json()
      if(!res.ok)throw new Error(body.error||'Transfer record not accepted')
      setMessage(body.message);await load()
    }catch(cause){setError(cause instanceof Error?cause.message:'Transfer record failed')}
    finally{setBusy('')}
  }
  if(!isInitialized)return <main className="p-6 text-white">Opening Food Forensics…</main>
  if(!user||!['agent','bridger'].includes(user.role))
    return <main className="p-6 text-white">An approved Forensics departmental appointment is required.</main>
  return <main className="mx-auto max-w-5xl space-y-6 px-4 pb-20 pt-6 text-white" data-forensics-food-settlement>
    <Link href="/weave/lifestyles/mandate/inbox?department=forensic" className="inline-flex items-center gap-2 text-xs text-amber-200"><ArrowLeft className="h-4 w-4"/> Forensics inbox</Link>
    <header className="border-b border-white/10 pb-5">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-200"><ShieldCheck className="h-4 w-4"/> WEAVE Forensics · Food</p>
      <h1 className="mt-2 text-3xl font-black">Stock payment distributions</h1>
      <p className="mt-3 text-sm leading-6 text-stone-300">Agents pay Weave OPay for stock. For each verified bowl or package, Administration is allocated ₦800, Child/Parents Support ₦200, and the remaining WEAVE stock proceeds fund preparation through the Stability Lead. The selling Agent retains ₦1,000 gross margin on each later Customer Carrier Door sale.</p>
      <p className="mt-2 text-xs text-amber-100">Record only external transfers you have actually completed and independently verified in your bank. This desk does not send bank payments or prove that a transfer cleared.</p>
    </header>
    {error&&<p role="alert" className="border border-rose-300/30 p-3 text-sm text-rose-200">{error}</p>}
    {message&&<p role="status" className="border border-emerald-300/30 p-3 text-sm text-emerald-200">{message}</p>}
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs text-stone-400">Stability Lead: {queue?.leadManager ? queue.leadManager.name+(queue.leadManager.active?' · Active':' · Inactive'):'Not appointed'}</p>
      <button type="button" onClick={()=>void load()} className="inline-flex items-center gap-2 border border-white/15 px-3 py-2 text-xs"><RefreshCcw className="h-4 w-4"/> Refresh</button>
    </div>
    <section className="space-y-4">
      {queue?.payouts.map(p=><article key={p.payout_id} className="border border-white/10 p-4">
        <p className="text-xs font-black text-amber-200">{p.product.toUpperCase()} · {p.package_count} package(s) · {labels[p.beneficiary]}</p>
        <p className="mt-2 text-2xl font-black">{currency(p.amount_ngn)}</p>
        <p className="mt-2 text-xs text-stone-400">Source Agent: {p.purchasing_agent_name} · Weave received {currency(p.received_ngn)} · Agent retail gross margin {currency(p.agent_expected_margin_ngn)}</p>
        <p className="mt-2 break-all text-[10px] text-stone-500">Stock order: {p.source_order_id}</p>
        {p.status==='transfer_reported'?<p className="mt-3 border border-emerald-300/20 p-3 text-xs text-emerald-200">External transfer reported · Ref: {p.transfer_reference}. Confirm receipt independently with your bank.</p>:
        <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
          <p className="text-xs text-amber-100">{p.beneficiary==='lead_manager'?'Confirm the active Stability Lead and their approved receiving account before transfer.':'Confirm the approved recipient and bank account before transfer.'}</p>
          <label className="block text-xs text-stone-300">External transfer reference
            <input value={details[p.payout_id]?.transferReference||''} onChange={e=>edit(p.payout_id,'transferReference',e.target.value)}
              className="mt-2 w-full border border-white/15 bg-[#141b1a] p-3 text-white" maxLength={180}/>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-stone-300">Recipient bank name
              <input value={details[p.payout_id]?.bankName||''} onChange={e=>edit(p.payout_id,'bankName',e.target.value)}
                className="mt-2 w-full border border-white/15 bg-[#141b1a] p-3 text-white" maxLength={120}/>
            </label>
            <label className="block text-xs text-stone-300">Recipient account last four digits
              <input value={details[p.payout_id]?.accountLast4||''} onChange={e=>edit(p.payout_id,'accountLast4',e.target.value)}
                className="mt-2 w-full border border-white/15 bg-[#141b1a] p-3 text-white" inputMode="numeric" maxLength={4}/>
            </label>
          </div>
          <label className="block text-xs text-stone-300">Transfer verification note
            <textarea value={details[p.payout_id]?.note||''} onChange={e=>edit(p.payout_id,'note',e.target.value)}
              className="mt-2 w-full border border-white/15 bg-[#141b1a] p-3 text-white" rows={2} maxLength={800}/>
          </label>
          <button type="button" disabled={busy===p.payout_id||
            (details[p.payout_id]?.transferReference||'').trim().length<6||
            (details[p.payout_id]?.bankName||'').trim().length<2||
            !/^\d{4}$/.test(details[p.payout_id]?.accountLast4||'')||
            (details[p.payout_id]?.note||'').trim().length<12}
            onClick={()=>void record(p)} className="bg-amber-300 px-4 py-3 text-xs font-black text-black disabled:opacity-40">
            Record completed external transfer
          </button>
        </div>}
      </article>)}
      {queue&&!queue.payouts.length&&<p className="border border-dashed border-white/15 p-6 text-sm text-stone-400">No verified stock purchases waiting for Forensics distribution.</p>}
    </section>
  </main>
}
