'use client'

import Link from 'next/link'
import {useAuth} from '@/lib/auth-provider'
import {useCallback,useEffect,useState} from 'react'
import {SUNSHINE_BANK_PRODUCTS,sunshineBankProduct} from '@/lib/sunshine-bank-products'

type Plan={
  declaredCapitalNgn:number;bankProduct:string;managerVisibility:boolean;
  needsHelp:boolean;obstacleKind:string|null;createdAt:string
}
type Mine={success:boolean;plan:Plan|null;managerId:string|null;withdrawalTarget:number;withdrawalCount:number}
type TeamMember={userId:string;name:string;position:string;withdrawalCount:number;needsHelp:boolean;obstacleKind:string|null}
const obstacleLabels:Record<string,string>={
  work_tools:'Work tools or supplies',food_stock:'Company food stock',
  customer_orders:'Finding or serving customers',transport:'Transport or delivery',
  earnings_gap:'Temporary work income gap',other:'Other work obstacle'
}
const money=(value:number)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(value)

export default function SunshineWorkshop(){
  const {user,token,isInitialized}=useAuth()
  const [mine,setMine]=useState<Mine|null>(null)
  const [team,setTeam]=useState<TeamMember[]|null>(null)
  const [capital,setCapital]=useState('1000000')
  const [product,setProduct]=useState('ecobank_super_savers')
  const [share,setShare]=useState(false)
  const [ownership,setOwnership]=useState(false)
  const [obstacle,setObstacle]=useState('work_tools')
  const [rate,setRate]=useState('')
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const fetchMine=useCallback(async()=>{
    if(!token)return
    const res=await fetch('/api/sunshine',{headers:{Authorization:'Bearer '+token},cache:'no-store'})
    const result=await res.json()
    if(!res.ok)throw new Error(result.error||'Sunshine records unavailable')
    setMine(result)
    if(result.plan){
      setCapital(String(result.plan.declaredCapitalNgn))
      setProduct(result.plan.bankProduct)
      setShare(result.plan.managerVisibility)
    }
  },[token])
  const refresh=useCallback(async()=>{
    if(!token)return
    await fetchMine()
    if(user?.role==='agent'||user?.role==='bridger'){
      const res=await fetch('/api/sunshine?view=team',{headers:{Authorization:'Bearer '+token},cache:'no-store'})
      if(res.ok){
        const result=await res.json()
        setTeam(result.team||[])
      }else setTeam(null)
    }
  },[fetchMine,token,user?.role])
  useEffect(()=>{
    if(!isInitialized)return
    if(!token){setError('Sign in to open Sunshine.');setLoading(false);return}
    void refresh().catch(err=>setError(err instanceof Error?err.message:'Sunshine unavailable')).finally(()=>setLoading(false))
  },[isInitialized,token,refresh])
  const send=async(payload:Record<string,unknown>)=>{
    if(!token||busy)return
    setBusy(true);setError('');setNotice('')
    try{
      const res=await fetch('/api/sunshine',{method:'POST',
        headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify(payload)})
      const result=await res.json()
      if(!res.ok)throw new Error(result.error||'Could not save continuity record')
      setNotice(result.alreadyRecorded?'This submission was already recorded.':'Sunshine record updated.')
      await refresh()
    }catch(err){setError(err instanceof Error?err.message:'Could not save record')}
    finally{setBusy(false)}
  }
  const enrolled=Boolean(mine?.plan)
  const count=mine?.withdrawalCount||0
  const remaining=Math.max(0,(mine?.withdrawalTarget||2)-count)
  const annualRate=Number(rate)
  const projected=Number(capital)*annualRate/1200
  const validRate=rate.trim()!==''&&Number.isFinite(annualRate)&&annualRate>=0&&annualRate<=100
  const selectedBank=sunshineBankProduct(product)
  const supportLink='/weave/lifestyles/support'+(mine?.managerId?'?managerId='+encodeURIComponent(mine.managerId):'')
  return <main className="weave-operating-environment mx-auto min-h-screen max-w-6xl space-y-6 px-3 py-6 text-white sm:px-6" data-sunshine-workshop="mechanized-wealth">
    <header className="rounded-2xl border border-amber-200/30 bg-gradient-to-br from-[#283225] via-[#132630] to-[#0c1621] p-6">
      <Link className="text-sm text-cyan-200" href="/weave/lifestyles">← Weave Lifestyle</Link>
      <p className="mt-5 text-xs font-bold uppercase tracking-[.23em] text-amber-200">Sunshine · Mechanized Wealth</p>
      <h1 className="mt-3 text-3xl font-black sm:text-4xl">Capital protected. Work continues.</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">Begin with ₦1,000,000 or more in your own savings account. Track a personal target of no more than two withdrawals each month. Your assigned Regional Manager helps remove work obstacles through verified Weave opportunities and company support—not by handling your bank money.</p>
      <p className="mt-3 text-xs leading-6 text-amber-100">External bank deposits, interest and withdrawal counts are not verified by Weave. No bank credentials, account number or payment are requested here. Check the rules of your actual bank product; interest rates and returns can change.</p>
    </header>
    {loading&&<p className="text-sm text-slate-300">Opening personal continuity records…</p>}
    {error&&<p role="alert" className="rounded-xl border border-rose-300/30 p-4 text-sm text-rose-100">{error}</p>}
    {notice&&<p role="status" className="rounded-xl border border-cyan-300/30 p-4 text-sm text-cyan-100">{notice}</p>}
    {isInitialized&&!loading&&token&&<>
      <section className="rounded-2xl border border-amber-200/25 bg-[#102329] p-5" data-sunshine-earn-first>
        <h2 className="text-xl font-bold">First earn. Then build savings. Then live from interest.</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-200">Sunshine is the wealth-continuity phase of real Weave work. Complete verified tasks and serve real customers; separate affordable savings from actual proceeds, then open the eligible savings product directly with your chosen institution. Weave does not promise earnings, transfer funds to banks, or provide a banking account.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/15 p-4"><h3 className="font-bold text-amber-100">1 · Earn through Weave</h3><p className="mt-2 text-sm leading-6 text-slate-200">{user?.role==='bridger'?'Work in Hope: outreach, qualified prospects and verified Client File Folder sales.':user?.role==='agent'?'Work in Stability: food distribution, customer fulfillment and verified Agent earnings.':user?.role==='client'?'Operate your Client File Folder and Customer Door, serve customers and verify business earnings.':'Grow income through authorized Weave activities and records.'}</p>
            <Link className="mt-3 inline-flex text-sm font-semibold text-cyan-200" href={user?.role==='bridger'?'/bridger/dashboard':user?.role==='agent'?'/agent/distribution':user?.role==='client'?'/client/dashboard':'/weave/lifestyles/work'}>Open working systems →</Link>
          </div>
          <div className="rounded-xl border border-white/15 p-4"><h3 className="font-bold text-amber-100">2 · Accumulate capital</h3><p className="mt-2 text-sm leading-6 text-slate-200">Set a feasible savings goal from earnings after work expenses and essential living costs. The initial Sunshine milestone is ₦1,000,000 in an account you control.</p>
            <Link className="mt-3 inline-flex text-sm font-semibold text-cyan-200" href="/weave/lifestyles/support">Request work assistance →</Link>
          </div>
          <div className="rounded-xl border border-white/15 p-4"><h3 className="font-bold text-amber-100">3 · Protect living capital</h3><p className="mt-2 text-sm leading-6 text-slate-200">Track interest, withdrawal activity and the bank's actual terms. Spend only affordable returns once the interest can cover living needs without consuming principal.</p></div>
        </div>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/15 bg-[#10212a] p-5" data-sunshine-owner-record>
          <h2 className="text-xl font-bold">My Sunshine capital</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">Self-declared information visible only to you. A Regional Manager never receives this capital amount.</p>
          <label className="mt-4 block text-sm font-semibold">Personal savings balance (₦)
            <input type="number" min={1000000} max={999999999999} step="0.01" inputMode="decimal"
              value={capital} onChange={e=>setCapital(e.target.value)}
              className="mt-2 min-h-12 w-full rounded-lg border border-white/25 bg-slate-950 p-3 text-white"/>
          </label>
          <label className="mt-4 block text-sm font-semibold">Savings account product
            <select value={product} onChange={e=>setProduct(e.target.value)}
              className="mt-2 min-h-12 w-full rounded-lg border border-white/25 bg-slate-950 p-3 text-white">
              {SUNSHINE_BANK_PRODUCTS.map(bank=><option key={bank.id} value={bank.id}>{bank.bank} · {bank.name}</option>)}
            </select>
          </label>
          {selectedBank&&<div className="mt-3 rounded-xl border border-amber-200/20 bg-amber-200/[.05] p-4 text-sm leading-6 text-slate-200" data-sunshine-product-conditions>
            <p className="font-bold text-amber-100">{selectedBank.payout}</p>
            <p className="mt-1">{selectedBank.liquidity}</p>
            {selectedBank.rule==='two_monthly'?<p className="mt-2 text-xs text-amber-200">This bank product specifically rewards no more than two withdrawals per month.</p>:
              <p className="mt-2 text-xs text-amber-200">Two withdrawals per month is Sunshine's voluntary personal discipline target—not this provider's product rule. Confirm provider restrictions before withdrawing.</p>}
            {selectedBank.source&&<a href={selectedBank.source} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-semibold text-cyan-200 underline">Read provider terms</a>}
          </div>}
          <label className="mt-4 flex items-start gap-3 text-sm leading-6">
            <input type="checkbox" checked={share} onChange={e=>setShare(e.target.checked)} className="mt-1 h-5 w-5"/>
            <span>Let my currently assigned Regional Manager see my withdrawal count and work-support needs. My capital balance remains private.</span>
          </label>
          <label className="mt-4 flex items-start gap-3 text-sm leading-6">
            <input type="checkbox" checked={ownership} onChange={e=>setOwnership(e.target.checked)} className="mt-1 h-5 w-5"/>
            <span>I confirm this is my external savings account and that Weave has no authority over its funds or withdrawals.</span>
          </label>
          <button type="button" disabled={busy||!ownership||Number(capital)<1000000||!Number.isFinite(Number(capital))}
            onClick={()=>void send({action:'enroll',capitalNgn:Number(capital),bankProduct:product,managerVisibility:share,acknowledgeBankOwnership:true})}
            className="mt-5 min-h-12 w-full rounded-xl bg-amber-200 px-5 py-3 font-bold text-slate-950 disabled:opacity-40">
            {enrolled?'Update personal Sunshine plan':'Start Sunshine · ₦1m minimum'}
          </button>
          {!mine?.managerId&&<p className="mt-3 text-xs leading-6 text-amber-100">No ordinary Regional Manager is currently assigned to this position. Your personal Sunshine record can still begin; company assistance starts only after an authorized assignment.</p>}
        </div>
        <div className="rounded-2xl border border-white/15 bg-[#0e1d27] p-5" data-sunshine-withdrawal-continuity>
          <h2 className="text-xl font-bold">This month · Withdrawal continuity</h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 p-4"><p className="text-sm text-slate-400">Self-reported withdrawals</p><p className="mt-2 text-3xl font-black tabular-nums">{count}</p></div>
            <div className="rounded-xl border border-white/10 p-4"><p className="text-sm text-slate-400">Remaining under target</p><p className="mt-2 text-3xl font-black tabular-nums">{remaining}</p></div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-200">{count>2?'Above the two-withdrawal target this month. Review your bank account terms and request help with any work obstacle.':count===2?'Two withdrawals recorded. Consider solving further work needs through approved Weave work-support tools.':'Continue growing your capital while working through Weave.'}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" disabled={!enrolled||busy} onClick={()=>void send({action:'withdrawal',requestId:crypto.randomUUID()})} className="min-h-11 rounded-lg border border-amber-200/50 bg-amber-200/10 px-4 py-2 text-sm font-semibold disabled:opacity-40">Record a withdrawal</button>
            <button type="button" disabled={!enrolled||busy||count===0} onClick={()=>void send({action:'correct_withdrawal',requestId:crypto.randomUUID()})} className="min-h-11 rounded-lg border border-white/25 px-4 py-2 text-sm disabled:opacity-40">Correct last report</button>
          </div>
          <p className="mt-3 text-xs leading-6 text-slate-400">These are user-reported counts, not live bank transactions. A withdrawal is never blocked by Weave, and the count resets at the start of each month in Nigeria time.</p>
          <div className="mt-6 border-t border-white/15 pt-5">
            <h3 className="font-semibold">Optional interest illustration</h3>
            <label className="mt-3 block text-sm">Bank-confirmed annual rate (%)
              <input value={rate} onChange={e=>setRate(e.target.value)} type="number" min="0" max="100" step="0.01" placeholder="Enter rate from your bank"
                className="mt-2 min-h-11 w-full rounded-lg border border-white/25 bg-slate-950 p-3"/>
            </label>
            {validRate&&<p className="mt-3 text-sm">Approximate monthly gross interest at a constant balance: <strong>{money(projected)}</strong>.</p>}
            <p className="mt-2 text-xs text-slate-400">Illustration only, before withholding tax or charges. No interest rate or payout is promised by Weave.</p>
          </div>
        </div>
      </section>
      <section className="rounded-2xl border border-cyan-200/20 bg-[#10212a] p-5" data-sunshine-regional-support>
        <h2 className="text-xl font-bold">Regional Manager · Remove the obstacle</h2>
        <p className="mt-2 text-sm leading-7 text-slate-200">Protect savings through real company activity: Bridger prospect outreach, Agent food orders, available workshops, assigned tasks, verified earnings and authorized one-to-one support. The manager supervises the work, not the private bank account.</p>
        <label className="mt-4 block text-sm font-semibold">What is disrupting your work?
          <select value={obstacle} onChange={e=>setObstacle(e.target.value)}
            className="mt-2 min-h-11 w-full rounded-lg border border-white/25 bg-slate-950 p-3">
            {Object.entries(obstacleLabels).map(([key,value])=><option key={key} value={key}>{value}</option>)}
          </select>
        </label>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" disabled={!enrolled||!mine?.managerId||!mine?.plan?.managerVisibility||busy}
            onClick={()=>void send({action:'request_help',obstacleKind:obstacle})}
            className="min-h-11 rounded-lg bg-cyan-200 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40">Ask Regional Manager for help</button>
          {mine?.plan?.needsHelp&&<button type="button" disabled={busy} onClick={()=>void send({action:'resolve_help'})} className="min-h-11 rounded-lg border border-white/25 px-4 py-2 text-sm">Mark obstacle resolved</button>}
          <Link className="inline-flex min-h-11 items-center rounded-lg border border-cyan-200/40 px-4 py-2 text-sm text-cyan-100" href={supportLink}>Open private Company Support</Link>
        </div>
        {mine?.plan?.needsHelp&&<p className="mt-3 text-sm text-amber-100">Support requested · {obstacleLabels[mine.plan.obstacleKind||'other']}. Use Company Support for private details and verified assistance.</p>}
      </section>
      {team!==null&&<section className="rounded-2xl border border-amber-200/25 bg-[#0e1c24] p-5" data-sunshine-manager-team>
        <h2 className="text-xl font-bold">My region · Sunshine continuity</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">Only staff who opted into manager support appear here. Declared capital, account details and money remain private. Review obstacles and arrange authorized help using existing Weave tools.</p>
        {!team.length?<p className="mt-4 text-sm">No assigned staff has opted into Sunshine visibility yet.</p>:
          <div className="mt-4 space-y-3">{team.map(member=><div key={member.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/15 p-4">
            <div><p className="font-semibold">{member.name} · {member.position}</p><p className="mt-1 text-sm text-slate-300">Withdrawals reported this month: {member.withdrawalCount}/2</p>
            {member.needsHelp&&<p className="mt-1 text-sm text-amber-100">Needs support · {obstacleLabels[member.obstacleKind||'other']}</p>}</div>
            <Link href={'/weave/lifestyles/support?workerId='+encodeURIComponent(member.userId)} className="inline-flex min-h-11 items-center rounded-lg border border-cyan-200/40 px-4 py-2 text-sm text-cyan-100">Open worker support</Link>
          </div>)}</div>}
        <Link href="/weave/lifestyles/regional-manager/workspace" className="mt-5 inline-flex text-sm font-semibold text-cyan-200">Daily tasks, activity records and regional operations →</Link>
      </section>}
    </>}
  </main>
}
