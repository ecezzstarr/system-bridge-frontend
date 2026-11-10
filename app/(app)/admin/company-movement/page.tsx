'use client'
import Link from 'next/link'
import {useCallback,useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'

type Section={available:boolean;rows:Record<string,unknown>[];note?:string}
type Report={
  success:boolean;days:number;generatedAt:string;missing:string[]
  sections:Record<string,Section>
}
const formatNumber=(n:unknown)=>Number(n||0).toLocaleString('en-NG')
const formatMoney=(n:unknown)=>Number(n||0).toLocaleString('en-NG',{maximumFractionDigits:2})
const periodOptions=[1,7,30,90] as const

export default function CompanyMovementPage(){
  const {user,token,isInitialized}=useAuth()
  const [days,setDays]=useState<number>(7)
  const [report,setReport]=useState<Report|null>(null)
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(false)
  const load=useCallback(async()=>{
    if(!token)return
    setLoading(true)
    try{
      const r=await fetch('/api/admin/company-movement?days='+days,{
        headers:{Authorization:'Bearer '+token},cache:'no-store'})
      const data=await r.json()
      if(!r.ok||!data.success)throw new Error(data.error||'Company movement unavailable')
      setReport(data);setError('')
    }catch(e){setError(e instanceof Error?e.message:'Unable to load company movement')}
    finally{setLoading(false)}
  },[token,days])

  useEffect(()=>{
    if(!isInitialized||user?.role!=='admin'||!token)return
    void load()
    const poll=setInterval(()=>void load(),20000)
    return ()=>clearInterval(poll)
  },[isInitialized,user?.role,token,load])

  if(!isInitialized)return <main className="p-6 text-slate-200">Opening Administrations…</main>
  if(user?.role!=='admin')return <main className="p-6 text-slate-200">Administrations access required.</main>
  const sec=(key:string)=>report?.sections?.[key]
  const value=(key:string,field:string)=>{
    const s=sec(key)
    return s?.available?formatNumber(s.rows[0]?.[field]):'Unavailable'
  }
  const money=(key:string,field:string)=>{
    const s=sec(key)
    return s?.available?formatMoney(s.rows[0]?.[field]):'Unavailable'
  }
  const sum=(a:string,af:string,b:string,bf:string)=>{
    const sa=sec(a),sb=sec(b)
    return sa?.available&&sb?.available
      ?formatNumber(Number(sa.rows[0]?.[af]||0)+Number(sb.rows[0]?.[bf]||0))
      :'Unavailable'
  }
  const cards=[
    {title:'Prospect packages purchased',value:value('prospects','packages'),foot:'Completed Bridger package purchases'},
    {title:'Fulfilled food & cake orders',value:sum('food','fulfilled_orders','cakes','fulfilled_orders'),foot:'Paid and completed customer orders'},
    {title:'Confirmed File Folder purchases',value:value('folders','confirmed_folders'),foot:'Distinct confirmed sale keys across both rails'},
    {title:'Approved wallet deposits',value:value('wallet','approved_deposits'),foot:'Approved with verification date in this period'},
  ]

  return <main className="weave-operating-environment mx-auto min-h-screen max-w-7xl space-y-6 px-4 py-6 text-slate-100 sm:px-6" data-admin-company-movement>
    <div className="space-y-3">
      <Link href="/admin/control-center" className="text-sm text-cyan-200">← Administrations Control Center</Link>
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-200">Administrations · A Time · Company of Time</p>
      <h1 className="text-3xl font-black">Company Movement Intelligence</h1>
      <p className="max-w-4xl text-sm leading-6 text-slate-300">Observe what each department is moving: purchases, verified fulfilment, registrations, payment queues and staff records. A recorded attempt is not a verified sale, and a wallet credit is not company profit.</p>
    </div>
    <div className="flex flex-wrap items-center gap-2" aria-label="Reporting window">
      {periodOptions.map(d=><button key={d} type="button" onClick={()=>setDays(d)}
        aria-pressed={days===d} className={'min-h-10 rounded-lg border px-4 py-2 text-sm '+(days===d?'border-cyan-300 bg-cyan-300/15 text-white':'border-white/15 text-slate-300')}>
        {d===1?'24 hours':'Last '+d+' days'}</button>)}
      <button type="button" onClick={()=>void load()} disabled={loading}
        className="min-h-10 rounded-lg border border-white/20 px-4 py-2 text-sm disabled:opacity-60">
        {loading?'Refreshing…':'Refresh records'}</button>
    </div>
    {error&&<p role="alert" className="rounded-lg border border-rose-400/30 p-3 text-sm text-rose-200">{error}. Last successful snapshot remains visible where available.</p>}
    {report&&<p className="text-xs text-slate-400">Snapshot {new Date(report.generatedAt).toLocaleString()} · Automatically checks again every 20 seconds · No assumed totals for unavailable records</p>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(c=><article key={c.title} className="rounded-xl border border-white/15 bg-slate-950/75 p-4">
        <p className="text-xs font-semibold text-slate-300">{c.title}</p>
        <p className="mt-3 break-words text-3xl font-black tabular-nums">{report?c.value:'—'}</p>
        <p className="mt-2 text-xs leading-5 text-slate-400">{c.foot}</p>
      </article>)}
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <section className="space-y-3 rounded-xl border border-cyan-300/20 bg-slate-950/65 p-5">
        <h2 className="text-xl font-black">Hope · Prospect Movement</h2>
        <p className="text-sm text-slate-300">Purchased candidate packages must be distinguished from contacted and responding people.</p>
        <dl className="grid grid-cols-2 gap-3">
          {[
            ['Bridgers purchasing',value('prospects','purchasing_bridgers')],
            ['Flame Coin spent',money('prospects','spent_flame_coin')],
            ['Candidates in sold packages',value('prospectContacts','candidates_in_sold_packages')],
            ['Prospect contacts attempted',value('outreach','attempted')],
            ['Responses recorded',value('outreach','responded')],
          ].map(([k,v])=><div key={k} className="border-t border-white/10 pt-3"><dt className="text-xs text-slate-400">{k}</dt><dd className="mt-1 text-lg font-bold tabular-nums">{report?v:'—'}</dd></div>)}
        </dl>
        <Link className="inline-block text-sm text-cyan-200 underline" href="/admin/prospect-engine">Open Prospect Engine</Link>
      </section>
      <section className="space-y-3 rounded-xl border border-amber-300/20 bg-slate-950/65 p-5">
        <h2 className="text-xl font-black">Stability · Food and Product Movement</h2>
        <p className="text-sm text-slate-300">Agent-recorded stock sales are separate from verified customer payments and fulfilled orders.</p>
        <dl className="grid grid-cols-2 gap-3">
          {[
            ['Agent-recorded Agility units',value('agility','recorded_units')],
            ['Agent-recorded sales ₦',money('agility','recorded_revenue_ngn')],
            ['Paid, fulfilled food units',value('food','fulfilled_units')],
            ['Paid, fulfilled food value ₦',money('food','fulfilled_value_ngn')],
            ['Paid, completed cake orders',value('cakes','fulfilled_orders')],
            ['Paid, completed cake value ₦',money('cakes','fulfilled_value_ngn')],
            ['Paid Agent stock orders',value('stock','verified_stock_orders')],
            ['Paid Agent stock value ₦',money('stock','verified_stock_value_ngn')],
          ].map(([k,v])=><div key={k} className="border-t border-white/10 pt-3"><dt className="text-xs text-slate-400">{k}</dt><dd className="mt-1 break-all text-lg font-bold tabular-nums">{report?v:'—'}</dd></div>)}
        </dl>
        <Link className="inline-block text-sm text-cyan-200 underline" href="/admin/cakes">Open Daisy Pastries Administration</Link>
      </section>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border border-white/15 bg-slate-950/65 p-5">
        <h2 className="text-xl font-black">Dream Lovely · Client File Folders</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          {[
            ['Confirmed purchases',value('folders','confirmed_folders')],
            ['Plus-tier purchases',value('folders','plus_folders')],
            ['Referring Bridgers',value('folders','referring_bridgers')],
            ['Awaiting Administrations approval',value('folderQueue','awaiting_administration')],
            ['Awaiting customer payment',value('folderQueue','awaiting_payment')],
          ].map(([k,v])=><div key={k} className="border-t border-white/10 pt-3"><dt className="text-xs text-slate-400">{k}</dt><dd className="mt-1 text-lg font-bold tabular-nums">{report?v:'—'}</dd></div>)}
        </dl>
        <Link href="/admin/file-folder-sales-manager" className="mt-4 inline-block text-sm text-cyan-200 underline">Open File Folder Sales Manager</Link>
      </section>
      <section className="rounded-xl border border-white/15 bg-slate-950/65 p-5">
        <h2 className="text-xl font-black">A Time · Payments and Exceptions</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          {[
            ['Approved wallet credits · Flame Coin',money('wallet','credited_flame_coin')],
            ['Pending deposit records',value('wallet','pending_deposits')],
            ['Rejected deposit records',value('wallet','rejected_deposits')],
            ['Paid food orders not fulfilled',value('foodQueue','paid_unfulfilled')],
            ['Food payment proofs pending',value('foodQueue','payment_proofs_pending')],
            ['Paid cake orders not completed',value('cakeQueue','paid_unfulfilled')],
            ['Cake payment proofs pending',value('cakeQueue','payment_proofs_pending')],
          ].map(([k,v])=><div key={k} className="border-t border-white/10 pt-3"><dt className="text-xs text-slate-400">{k}</dt><dd className="mt-1 break-all text-lg font-bold tabular-nums">{report?v:'—'}</dd></div>)}
        </dl>
        <p className="mt-4 text-xs leading-5 text-slate-400">Open queue counts are current outstanding records, not restricted to the selected reporting period. Values in different currencies are never combined.</p>
        <Link href="/admin/control-center" className="mt-3 inline-block text-sm text-cyan-200 underline">Open payment verification and control tools</Link>
      </section>
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      {[
        {key:'bridgerLeaders',title:'Bridger Purchase Activity',metric:'packages',unit:'packages'},
        {key:'agentLeaders',title:'Agent-recorded Stock Resale',metric:'units',unit:'recorded units'},
        {key:'agentFoodLeaders',title:'Paid and Fulfilled Food by Agent',metric:'units',unit:'fulfilled units'},
      ].map(table=><section key={table.key} className="overflow-x-auto rounded-xl border border-white/15 bg-slate-950/65 p-5">
        <h2 className="text-xl font-black">{table.title}</h2>
        <p className="mt-2 text-xs text-slate-400">Activity by person for the selected period, not a salary or commission statement.</p>
        {!sec(table.key)?.available?<p className="mt-4 text-sm text-amber-200">Source unavailable</p>:
        !sec(table.key)?.rows.length?<p className="mt-4 text-sm text-slate-400">No matching recorded activity for this period.</p>:
        <table className="mt-3 w-full min-w-72 text-left text-sm">
          <thead><tr className="border-b border-white/15 text-xs text-slate-400"><th className="py-2">Staff</th><th className="py-2 text-right">{table.unit}</th></tr></thead>
          <tbody>{sec(table.key)?.rows.map((row,i)=><tr key={String(row.user_id||i)} className="border-b border-white/10">
            <td className="py-2 pr-4">{String(row.name||'Staff')}</td>
            <td className="py-2 text-right tabular-nums">{formatNumber(row[table.metric])}</td>
          </tr>)}</tbody>
        </table>}
      </section>)}
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      {[
        {key:'paidFoodProducts',title:'Paid, fulfilled food products',detail:'Completed Carrier food orders only'},
        {key:'recordedStockProducts',title:'Agent-recorded product resale',detail:'Stock sale records; not independently verified customer payments'},
      ].map(table=><section key={table.key} className="overflow-x-auto rounded-xl border border-white/15 bg-slate-950/65 p-5">
        <h2 className="text-xl font-black">{table.title}</h2>
        <p className="mt-2 text-xs text-slate-400">{table.detail}</p>
        {!sec(table.key)?.available?<p className="mt-4 text-sm text-amber-200">Source unavailable</p>:
        !sec(table.key)?.rows.length?<p className="mt-4 text-sm text-slate-400">No matching activity in the selected period.</p>:
        <table className="mt-3 w-full min-w-72 text-left text-sm">
          <thead><tr className="border-b border-white/15 text-xs text-slate-400"><th className="py-2">Product variant</th><th className="py-2 text-right">Units</th></tr></thead>
          <tbody>{sec(table.key)?.rows.map((row,i)=><tr key={String(row.product||i)} className="border-b border-white/10">
            <td className="py-2 pr-4">{String(row.product||'Unknown')}</td>
            <td className="py-2 text-right tabular-nums">{formatNumber(row.units)}</td>
          </tr>)}</tbody>
        </table>}
      </section>)}
    </div>
    <section className="rounded-xl border border-white/15 bg-slate-950/65 p-5">
      <h2 className="text-xl font-black">Other recorded payment movements</h2>
      <p className="mt-2 text-xs text-slate-400">Transaction ledger event counts by category and currency. These are not additional revenue and must not be summed with sales or deposits.</p>
      {!sec('ledger')?.available?<p className="mt-3 text-amber-200">Ledger source unavailable.</p>:
      !sec('ledger')?.rows.length?<p className="mt-3 text-slate-400">No ledger events recorded in this period.</p>:
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{sec('ledger')?.rows.map((r,i)=><div key={i} className="rounded-lg border border-white/10 p-3">
        <p className="text-xs text-slate-400">{String(r.entry_type||'Unclassified')} · {String(r.currency||'Unspecified')}</p>
        <p className="mt-1 text-xl font-bold tabular-nums">{formatNumber(r.events)} entries</p>
      </div>)}</div>}
    </section>
    {report?.missing.length?<section className="rounded-xl border border-amber-300/25 p-4">
      <h2 className="font-semibold text-amber-100">Incomplete data coverage</h2>
      <p className="mt-2 text-xs text-slate-300">The report does not substitute zero for missing tables or failed queries.</p>
      <ul className="mt-2 space-y-1 text-xs text-amber-100">{report.missing.map(m=><li key={m}>{m}</li>)}</ul>
    </section>:null}
    <p className="pb-8 text-xs leading-6 text-slate-400">Read-only company intelligence. Administrations performs verification and decisions in the original authorized workshops. The dashboard does not create credits, execute payments, or approve transactions.</p>
  </main>
}
