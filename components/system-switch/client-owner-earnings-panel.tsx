'use client'

import {useCallback,useEffect,useState} from 'react'
import {getClientToken} from '@/lib/client-auth'

type Report={
  fileNumber:string
  summary:{
    verifiedReceiptsFlameCoin:number
    verifiedSalesCount:number
    reportedCostFlameCoin:number
    provisionalRemainderFlameCoin:number
    totalOrders:number
    awaitingPayment:number
    fulfilledOrders:number
  }
  revenue:Array<{
    id:string;order_id:string;credited_flame_coin:string;payment_source:string
    receipt_number:string;created_at:string;offer_name?:string|null
    fulfilment_status:string;legion_name?:string|null;legion_sales_code?:string|null
  }>
  costs:Array<{
    id:string;amount:string;currency:string;category:string;description:string
    recorded_at:string;system_title?:string|null;evidence_reference?:string|null
  }>
  costTotals:Array<{currency:string;amount:string;entries:number}>
  accountingNote:string
}

const categories=[
  ['production','Production or supplier'],
  ['fulfilment','Delivery or fulfilment'],
  ['staff_compensation','Agreed worker compensation'],
  ['marketing','Customer outreach'],
  ['equipment','Equipment or materials'],
  ['operations','Business operations'],
  ['other','Other recorded cost'],
] as const
const currencies=['FLAME COIN','NGN','USD','EUR','GBP','USDT']
const fmt=(value:number|string)=>Number(value||0).toLocaleString(undefined,{maximumFractionDigits:8})
const date=(value:string)=>new Date(value).toLocaleDateString()

/**
 * Displays verifiable transactions, not imagined earnings.
 * This panel never executes a payout, issues a crypto trade, or changes a balance.
 */
export default function ClientOwnerEarningsPanel({storeApiPath,systems=[]}:{
  storeApiPath:string;systems?:Array<{id:string;title:string;status:string}>
}){
  const [report,setReport]=useState<Report|null>(null)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [category,setCategory]=useState<string>('production')
  const [currency,setCurrency]=useState('FLAME COIN')
  const [amount,setAmount]=useState('')
  const [description,setDescription]=useState('')
  const [evidence,setEvidence]=useState('')
  const [systemId,setSystemId]=useState('')
  const [requestId,setRequestId]=useState('')

  const load=useCallback(async()=>{
    const token=getClientToken()
    if(!token){setError('Sign in to view your File Folder earnings.');return}
    try{
      const r=await fetch(storeApiPath+'/earnings',{
        headers:{Authorization:'Bearer '+token},cache:'no-store'})
      const data=await r.json()
      if(!r.ok)throw Error(data.error||'Unable to load earnings')
      setReport(data);setError('')
    }catch(e){setError(e instanceof Error?e.message:'Earnings report unavailable')}
  },[storeApiPath])
  useEffect(()=>{void load()},[load])

  async function addCost(){
    const n=Number(amount)
    if(!Number.isFinite(n)||n<=0||!description.trim())return
    setBusy(true);setError('');setMessage('')
    const token=getClientToken()
    const requestKey=requestId||crypto.randomUUID()
    setRequestId(requestKey)
    try{
      const r=await fetch(storeApiPath+'/earnings',{
        method:'POST',
        headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify({
          category,currency,amount:n,description:description.trim(),
          evidenceReference:evidence.trim(),systemId:systemId||undefined,
          requestId:requestKey
        }),
      })
      const data=await r.json()
      if(!r.ok)throw Error(data.error||'Cost was not recorded')
      setAmount('');setDescription('');setEvidence('');setSystemId('')
      setRequestId('')
      setMessage(data.message||'Cost recorded.')
      await load()
    }catch(e){setError(e instanceof Error?e.message:'Unable to record cost')}
    finally{setBusy(false)}
  }
  return <section className="space-y-5 rounded-[2rem] border border-sky-300/20 bg-[#071b2b] p-5 text-white md:p-6" data-client-owner-earnings>
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-sky-200">File Folder · Owner business earnings</p>
        <h3 className="mt-2 text-xl font-black">From verified sales to livelihood</h3>
        <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-300">Your business earnings remain separate from company salary, unverified orders and employee compensation.</p>
      </div>
      <button type="button" onClick={()=>void load()} className="rounded-xl border border-sky-300/25 px-4 py-2 text-xs text-sky-100">Refresh records</button>
    </header>
    {error&&<p role="alert" className="rounded-lg border border-rose-300/20 p-3 text-xs text-rose-100">{error}</p>}
    {message&&<p role="status" className="text-xs text-sky-200">{message}</p>}
    {report&&<>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Verified receipts',fmt(report.summary.verifiedReceiptsFlameCoin)+' FC'],
          ['Owner-reported costs',fmt(report.summary.reportedCostFlameCoin)+' FC'],
          ['Provisional FC remainder',fmt(report.summary.provisionalRemainderFlameCoin)+' FC'],
          ['Pending customer payments',String(report.summary.awaitingPayment)],
        ].map(([label,value])=><div key={label} className="rounded-xl border border-white/10 bg-white/[.035] p-4">
          <p className="text-xs text-slate-300">{label}</p><p className="mt-2 text-lg font-bold">{value}</p>
        </div>)}
      </div>
      <div className="rounded-xl border border-amber-300/20 bg-amber-300/[.04] p-3 text-xs leading-5 text-amber-100">
        {report.accountingNote}
      </div>
      {report.costTotals.filter(row=>row.currency!=='FLAME COIN').length>0&&
        <p className="text-xs text-slate-300">Other-currency reported costs (not converted): {report.costTotals.filter(row=>row.currency!=='FLAME COIN').map(row=>fmt(row.amount)+' '+row.currency).join(' · ')}</p>}
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <h4 className="text-sm font-bold">Verified Customer Door receipts</h4>
          <p className="mb-3 mt-1 text-xs text-slate-400">{report.summary.verifiedSalesCount} credited sale(s), {report.summary.fulfilledOrders} fulfilled order(s)</p>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {report.revenue.map(sale=><div key={sale.id} className="rounded-lg border border-white/10 p-3 text-xs">
              <p className="flex justify-between gap-2 font-semibold"><span>{sale.offer_name||'Customer Door offer'}</span><span>{fmt(sale.credited_flame_coin)} FC</span></p>
              <p className="mt-2 text-slate-400">{date(sale.created_at)} · {sale.fulfilment_status.replaceAll('_',' ')} · {sale.payment_source.replaceAll('_',' ')}</p>
              {sale.legion_name&&<p className="mt-1 text-sky-200">Carried by {sale.legion_name} · attribution only; compensation follows agreed terms</p>}
              <p className="mt-1 break-all text-slate-500">Receipt {sale.receipt_number}</p>
            </div>)}
            {report.revenue.length===0&&<p className="text-xs text-slate-400">No verified Customer Door receipts. Publish an offer, receive an order and settle its actual payment.</p>}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-bold">Record an operating cost</h4>
          <p className="mt-1 text-xs text-slate-400">Costs are reported by the owner. Recording does not debit a wallet, pay a worker, or verify a receipt.</p>
          <div className="mt-3 grid gap-3">
            <label className="text-xs text-slate-300">Cost category<select value={category} onChange={e=>{setCategory(e.target.value);setRequestId('')}} className="mt-1 w-full rounded-lg border border-white/15 bg-[#0d263b] p-3">
              {categories.map(([key,label])=><option key={key} value={key}>{label}</option>)}
            </select></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-slate-300">Amount<input type="number" min="0.00000001" step="any" value={amount} onChange={e=>{setAmount(e.target.value);setRequestId('')}} className="mt-1 w-full rounded-lg border border-white/15 bg-[#0d263b] p-3"/></label>
              <label className="text-xs text-slate-300">Currency<select value={currency} onChange={e=>{setCurrency(e.target.value);setRequestId('')}} className="mt-1 w-full rounded-lg border border-white/15 bg-[#0d263b] p-3">{currencies.map(c=><option key={c}>{c}</option>)}</select></label>
            </div>
            <label className="text-xs text-slate-300">Purpose or obligation<input value={description} maxLength={300} onChange={e=>{setDescription(e.target.value);setRequestId('')}} className="mt-1 w-full rounded-lg border border-white/15 bg-[#0d263b] p-3" placeholder="For example, production material purchase"/></label>
            <label className="text-xs text-slate-300">Evidence reference (optional)<input value={evidence} maxLength={160} onChange={e=>{setEvidence(e.target.value);setRequestId('')}} className="mt-1 w-full rounded-lg border border-white/15 bg-[#0d263b] p-3" placeholder="Receipt or invoice reference"/></label>
            {systems.filter(s=>s.status==='active').length>0&&<label className="text-xs text-slate-300">Built system (optional)<select value={systemId} onChange={e=>{setSystemId(e.target.value);setRequestId('')}} className="mt-1 w-full rounded-lg border border-white/15 bg-[#0d263b] p-3"><option value="">General File Folder business</option>{systems.filter(s=>s.status==='active').map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label>}
            <button type="button" disabled={busy||!description.trim()||!(Number(amount)>0)} onClick={()=>void addCost()} className="rounded-lg bg-sky-200 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-40">{busy?'Recording…':'Record operating cost'}</button>
          </div>
        </div>
      </div>
      <div>
        <h4 className="text-sm font-bold">Recorded operating obligations</h4>
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
          {report.costs.map(cost=><div key={cost.id} className="flex flex-wrap justify-between gap-2 rounded-lg border border-white/10 p-3 text-xs">
            <div><p className="font-semibold">{cost.description}</p><p className="mt-1 text-slate-400">{cost.category.replaceAll('_',' ')} · {date(cost.recorded_at)}{cost.system_title?' · '+cost.system_title:''}</p></div>
            <span className="font-bold">{fmt(cost.amount)} {cost.currency}</span>
          </div>)}
          {report.costs.length===0&&<p className="text-xs text-slate-400">No operating costs have been reported yet.</p>}
        </div>
      </div>
    </>}
  </section>
}
