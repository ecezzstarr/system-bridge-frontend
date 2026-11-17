'use client'

import {useCallback,useEffect,useState} from 'react'
import Link from 'next/link'
import {useAuth} from '@/lib/auth-provider'

type Case={
  id:string;status:string;userId:string;managerId:string;workerName?:string|null;
  interestPeriod:'daily'|'monthly';bankProduct:string;purchaseKind:string;purchaseDetail:string;
  expectedNetInterestNgn:number;rateNgnPerSwitch:number;
  bankInterestSwitch:number;advanceSwitch:number;companyFeeSwitch:number;
  totalRepaymentSwitch:number;evidenceReference:string;
  fundedAt:string|null;repaidAt:string|null;reason:string|null
}
type DepartmentNotice={type:string;title:string;content:string;link:string;created_at:string}
type State={support:Case[];creditReleaseEnabled:boolean;managerCanReview:boolean;
  departmentNotices?:DepartmentNotice[];departmentLabels?:string[]}
const switchFmt=(v:number)=>Number(v||0).toLocaleString('en-NG',{maximumFractionDigits:6})+' System Switch'
const naira=(v:number)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:2}).format(v)

export function SunshineAdvanceDesk({enrolled,managerId}:{enrolled:boolean;managerId:string|null}){
  const {user,token}=useAuth()
  const [data,setData]=useState<State>({support:[],creditReleaseEnabled:false,managerCanReview:false})
  const [period,setPeriod]=useState('monthly')
  const [netInterest,setNetInterest]=useState('')
  const [bankReference,setBankReference]=useState('')
  const [purchaseKind,setPurchaseKind]=useState('file_folder')
  const [purchaseDetail,setPurchaseDetail]=useState('')
  const [acceptedBankOwnership,setAcceptedBankOwnership]=useState(false)
  const [reviewReference,setReviewReference]=useState('')
  const [settlementReference,setSettlementReference]=useState('')
  const [rejectReason,setRejectReason]=useState('')
  const [clientId,setClientId]=useState('')
  const [regionalManagerId,setRegionalManagerId]=useState('')
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [busy,setBusy]=useState(false)
  const [loaded,setLoaded]=useState(false)
  const [confirmed,setConfirmed]=useState(false)
  const auth=useCallback(()=>({Authorization:'Bearer '+token,'Content-Type':'application/json'}),[token])
  const refresh=useCallback(async()=>{
    if(!token)return
    const r=await fetch('/api/sunshine/advance',{headers:auth(),cache:'no-store'})
    const d=await r.json()
    if(!r.ok)throw new Error(d.error||'Interest-based support unavailable')
    setData(d);setLoaded(true)
  },[token,auth])
  useEffect(()=>{void refresh().catch(err=>{setError(String(err));setLoaded(true)})},[refresh])
  const act=async(action:string,other:Record<string,unknown>={})=>{
    if(busy||!token)return
    setBusy(true);setError('');setNotice('')
    try{
      const r=await fetch('/api/sunshine/advance',{method:'POST',
        headers:auth(),body:JSON.stringify({action,...other})})
      const d=await r.json()
      if(!r.ok)throw new Error(d.error||'Sunshine request not accepted')
      setNotice(action==='request'?'Interest-linked support request recorded; no money has yet been issued.':
        action==='fund'?'Funded System Switch credited from manager wallet.':
        action==='repay'?'Repayment verified in the company ledger.':'Sunshine finance status updated.')
      setConfirmed(false)
      await refresh()
    }catch(err){setError(err instanceof Error?err.message:'Sunshine operation failed')}
    finally{setBusy(false)}
  }
  const isAdmin=user?.role==='admin'
  const isWorker=['agent','bridger','client'].includes(user?.role||'')
  const myCases=data.support.filter(c=>c.userId===user?.id)
  const active=myCases.find(c=>!['repaid','rejected'].includes(c.status))
  const canRequest=isWorker&&enrolled&&!!managerId&&!active
  return <section className="rounded-2xl border border-amber-200/25 bg-[#0d1e29] p-5" data-sunshine-interest-support>
    <h2 className="text-2xl font-bold">Sunshine · Interest-backed work support</h2>
    <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-200">
      An authorized Regional Manager may advance up to 70% of independently verified daily or monthly net bank interest.
      After the bank credits that interest, the original System Switch advance is returned to the funder,
      and Weave receives 10% of the verified interest in System Switch. The remaining 20% is the user's interest
      before exchange movements or separate withdrawal charges. The 10% share of bank interest equals approximately 14.29% of the 70% amount advanced per interest period, so daily financing may be especially costly. No bank funds are held or automatically debited by Weave.
    </p>
    <p className="mt-2 text-xs leading-6 text-amber-100">
      This is a credit contract, not free earnings. Quotes are calculated from a live NGN/TRX rate,
      but internal System Switch credit is distinct from cash. Every funded advance requires independently
      verified bank interest, explicit acceptance, sufficient funded manager balance, approved company
      treasury, and active lending authorization. Funding is disabled until those conditions are met.
    </p>
    {error&&<p role="alert" className="mt-4 rounded-lg border border-rose-300/30 p-3 text-sm text-rose-100">{error}</p>}
    {notice&&<p role="status" className="mt-4 rounded-lg border border-cyan-200/30 p-3 text-sm text-cyan-100">{notice}</p>}
    {!loaded&&<p className="mt-3 text-sm">Reading current Sunshine support records…</p>}
    {isWorker&&<div className="mt-5 rounded-xl border border-white/15 p-4">
      <h3 className="text-lg font-bold">Ask for urgent working support</h3>
      {!enrolled&&<p className="mt-2 text-sm text-amber-100">Create your Sunshine savings plan first. You can start at zero capital.</p>}
      {enrolled&&!managerId&&<p className="mt-2 text-sm text-amber-100">An approved Regional Manager must be assigned before a financial support request. Client assignments require Administrations approval.</p>}
      {active&&<p className="mt-2 text-sm text-amber-100">An open Sunshine advance must be resolved before another is requested.</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Bank interest period
          <select value={period} onChange={e=>setPeriod(e.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-white/25 bg-slate-950 p-3">
            <option value="daily">Daily net interest</option><option value="monthly">Monthly net interest</option>
          </select>
        </label>
        <label className="text-sm">Expected net interest from your bank (₦)
          <input type="number" min="0" step="0.01" inputMode="decimal" value={netInterest} onChange={e=>setNetInterest(e.target.value)}
            className="mt-2 min-h-11 w-full rounded-lg border border-white/25 bg-slate-950 p-3"/>
        </label>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2" data-sunshine-product-intent>
        <label className="text-sm">Which Weave product do you want to purchase?
          <select value={purchaseKind} onChange={e=>setPurchaseKind(e.target.value)}
            className="mt-2 min-h-11 w-full rounded-lg border border-white/25 bg-slate-950 p-3">
            <option value="file_folder">Client File Folder</option>
            <option value="weave_food">Weave food product</option>
            <option value="weave_system">Weave system or business part</option>
            <option value="weave_workshop">Weave workshop</option>
            <option value="other_weave_product">Another Weave product</option>
          </select>
        </label>
        <label className="text-sm">Purchase needed (name or internal quote reference)
          <input value={purchaseDetail} maxLength={160} onChange={e=>setPurchaseDetail(e.target.value)}
            placeholder="e.g. Premium File Folder, Electrolyte carton"
            className="mt-2 min-h-11 w-full rounded-lg border border-white/25 bg-slate-950 p-3"/>
        </label>
      </div>
      <p className="mt-2 text-xs text-amber-100">This records purchase intent for your Regional Manager and Administrations. It is not a paid order or a verified purchase, and no support is issued on application.</p>
      <label className="mt-4 block text-sm">Bank interest statement/reference (no account number or credentials)
        <input value={bankReference} maxLength={160} onChange={e=>setBankReference(e.target.value)}
          placeholder="Bank period / interest notice reference" className="mt-2 min-h-11 w-full rounded-lg border border-white/25 bg-slate-950 p-3"/>
      </label>
      <label className="mt-4 flex gap-3 text-sm leading-6"><input type="checkbox" checked={acceptedBankOwnership} onChange={e=>setAcceptedBankOwnership(e.target.checked)} className="mt-1 h-5 w-5"/>
        <span>I request an eligibility review, confirm the account and interest information are mine, and understand no funds are issued by applying.</span>
      </label>
      <button type="button" disabled={busy||!canRequest||!acceptedBankOwnership||Number(netInterest)<=0||bankReference.trim().length<12||purchaseDetail.trim().length<4}
        onClick={()=>void act('request',{interestPeriod:period,expectedNetInterestNgn:Number(netInterest),
          evidenceReference:bankReference,purchaseKind,purchaseDetail:purchaseDetail.trim(),
          requestId:crypto.randomUUID(),bankOwnershipConfirmed:true})}
        className="mt-4 min-h-11 rounded-xl bg-amber-200 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-40">
        Request 70% interest-based support quote
      </button>
      <p className="mt-3 text-xs text-slate-400">Bank account principal cannot be used as collateral through this page. Do not upload bank credentials or third-party personal information.</p>
    </div>}
    {isAdmin&&<div className="mt-5 rounded-xl border border-cyan-200/20 p-4">
      <h3 className="text-lg font-bold">Administrations · Client regional assignment</h3>
      <p className="mt-2 text-xs text-slate-300">Assign a client with an existing Sunshine plan to an active ordinary Regional Manager for this separate support workflow; do not create a Pro Regional Manager appointment.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Client user ID<input value={clientId} onChange={e=>setClientId(e.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-white/25 bg-slate-950 p-3"/></label>
        <label className="text-sm">Regional Manager user ID<input value={regionalManagerId} onChange={e=>setRegionalManagerId(e.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-white/25 bg-slate-950 p-3"/></label>
      </div>
      <button disabled={busy||!clientId||!regionalManagerId} type="button"
        onClick={()=>void act('assign_client_manager',{clientId,managerId:regionalManagerId})}
        className="mt-3 min-h-11 rounded-lg border border-cyan-200/40 px-4 py-2 text-sm font-semibold disabled:opacity-40">Record authorized Client assignment</button>
    </div>}
    {(isAdmin||Boolean(data.departmentLabels?.length))&&<section className="mt-6 rounded-xl border border-cyan-200/25 bg-[#0a202c] p-4" data-sunshine-department-notifications>
      <h3 className="text-lg font-bold">Company departments · Sunshine movement</h3>
      <p className="mt-2 text-xs leading-6 text-slate-300">Administrations, approved Forensics, Mandate and Attorney personnel receive recorded stage alerts through the company notification inbox and subscribed phone push. These notices contain no private bank evidence or savings balances. Only the participant, assigned manager and Administrations can view detailed financial cases.</p>
      {(data.departmentNotices||[]).length===0
        ?<p className="mt-3 text-sm text-slate-400">No Sunshine stage notices for your authorized company account.</p>
        :<div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
          {(data.departmentNotices||[]).map((notice,index)=><div key={notice.type+notice.link+index}
            className="rounded-lg border border-white/10 p-3">
            <p className="text-sm font-semibold text-amber-100">{notice.title}</p>
            <p className="mt-1 text-xs leading-6 text-slate-200">{notice.content}</p>
            <p className="mt-1 text-[11px] text-slate-400">{new Date(notice.created_at).toLocaleString('en-NG')}</p>
          </div>)}
        </div>}
    </section>}
    {(isAdmin||data.managerCanReview)&&<p className="mt-5 text-sm text-amber-100">{data.creditReleaseEnabled?
      'Regulatory release flag is configured; verify independent evidence before approving.' :
      'Live disbursements are locked. Compliance approval, company treasury configuration and release authorization are required.'}</p>}
    <div className="mt-5 space-y-4">
      {data.support.length===0&&<p className="text-sm text-slate-400">No interest-based support cases recorded.</p>}
      {data.support.map(c=>{
        const isOwner=c.userId===user?.id
        const isAssignedManager=data.managerCanReview&&c.managerId===user?.id
        const adminReview=isAdmin
        return <article key={c.id} className="rounded-xl border border-white/15 bg-slate-950/50 p-4" data-sunshine-advance-case={c.status}>
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">Support · {c.interestPeriod} interest{c.workerName?' · '+c.workerName:''}</h3>
            <span className="rounded-full border border-amber-200/30 px-3 py-1 text-xs font-semibold text-amber-100">{c.status.replaceAll('_',' ')}</span></div>
          <p className="mt-2 text-sm text-amber-100">Requested Weave purchase: <strong>{c.purchaseDetail||"Product not specified"}</strong> · {c.purchaseKind?.replaceAll("_"," ")||"Weave product"}. This request is not itself proof of a completed order.</p>
          <p className="mt-2 text-sm text-slate-300">Verified-interest basis: {naira(c.expectedNetInterestNgn)} · Recorded rate: ₦{c.rateNgnPerSwitch.toLocaleString('en-NG')} / System Switch</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[['Bank interest value',c.bankInterestSwitch],['70% support',c.advanceSwitch],['Weave 10% share',c.companyFeeSwitch],['Total repayment',c.totalRepaymentSwitch]].map(([label,value])=>
              <div key={String(label)} className="rounded-lg border border-white/10 p-3">
                <p className="text-xs text-slate-400">{label}</p><p className="mt-2 text-sm font-bold tabular-nums">{switchFmt(Number(value))}</p>
              </div>)}
          </div>
          {c.reason&&<p className="mt-3 text-sm text-rose-100">Review decision: {c.reason}</p>}
          {adminReview&&c.status==='requested'&&<div className="mt-4">
            <p className="text-sm text-amber-100">Bank-interest verification must use independent bank evidence. A user-reported estimate is insufficient.</p>
            <input placeholder="Independent verification reference" value={reviewReference} onChange={e=>setReviewReference(e.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-white/25 bg-slate-950 p-3"/>
            <button disabled={busy||reviewReference.trim().length<12} onClick={()=>void act('verify_interest',{id:c.id,
              verificationReference:reviewReference,verifiedNetInterestNgn:c.expectedNetInterestNgn,
              independentBankVerification:true})} className="mt-2 min-h-11 rounded-lg border border-cyan-200/40 px-4 py-2 text-sm font-bold disabled:opacity-40">Confirm independently verified interest</button>
          </div>}
          {isOwner&&c.status==='interest_verified'&&<div className="mt-4">
            <p className="text-xs leading-6 text-slate-300">I accept the fixed amount of the advance, return of its full principal, and Weave's 10% fee calculated from my bank interest. No bank debit occurs through this agreement.</p>
            <label className="mt-3 flex items-center gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I accept the complete repayment and company fee</label>
            <button disabled={!confirmed||busy} onClick={()=>void act('accept_terms',{id:c.id,acceptFullRepayment:true,acceptCompanyInterestShare:true,confirmNoBankAccess:true})}
              className="mt-3 min-h-11 rounded-lg bg-amber-200 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40">Accept written support terms</button>
          </div>}
          {isAssignedManager&&c.status==='terms_accepted'&&<button type="button"
            disabled={busy||!data.creditReleaseEnabled} onClick={()=>void act('fund',{id:c.id})}
            className="mt-4 min-h-11 rounded-lg border border-amber-200/40 px-4 py-2 text-sm font-bold text-amber-100 disabled:opacity-40">
            Fund from my verified System Switch wallet
          </button>}
          {adminReview&&c.status==='funded'&&<div className="mt-4">
            <p className="text-xs text-slate-300">Verify the bank actually credited the interest; otherwise do not mark payment due.</p>
            <input placeholder="Independent bank credit reference" value={settlementReference} onChange={e=>setSettlementReference(e.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-white/25 bg-slate-950 p-3"/>
            <button disabled={busy||settlementReference.trim().length<12} onClick={()=>void act('confirm_interest_received',{id:c.id,
              receivedNetInterestNgn:c.expectedNetInterestNgn,settlementReference,verifiedBankCredit:true})}
              className="mt-3 min-h-11 rounded-lg border border-cyan-200/40 px-4 py-2 text-sm disabled:opacity-40">Confirm actual bank interest credit</button>
          </div>}
          {isOwner&&c.status==='interest_received'&&<button type="button"
            disabled={busy} onClick={()=>void act('repay',{id:c.id,authorizeRepayment:true})}
            className="mt-4 min-h-11 rounded-lg bg-amber-200 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40">
            Authorize repayment of {switchFmt(c.totalRepaymentSwitch)}
          </button>}
          {(adminReview||isAssignedManager)&&['requested','interest_verified','terms_accepted'].includes(c.status)&&
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input value={rejectReason} placeholder="Reason for declining" onChange={e=>setRejectReason(e.target.value)} className="min-h-11 min-w-[180px] flex-1 rounded-lg border border-white/25 bg-slate-950 p-3"/>
              <button disabled={busy||rejectReason.trim().length<12} onClick={()=>void act('reject',{id:c.id,reason:rejectReason})} className="min-h-11 rounded-lg border border-rose-300/40 px-3 py-2 text-sm disabled:opacity-40">Decline with reason</button>
            </div>}
        </article>
      })}
    </div>
    <div className="mt-5 flex flex-wrap gap-3 text-sm text-cyan-200">
      <Link href="/weave/lifestyles/support">Open company work assistance</Link>
      <Link href="/wallet">View System Switch wallet and withdrawal requirements</Link>
    </div>
  </section>
}
