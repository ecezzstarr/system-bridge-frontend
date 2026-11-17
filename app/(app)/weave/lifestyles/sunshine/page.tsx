'use client'

import Link from 'next/link'
import {useAuth} from '@/lib/auth-provider'
import {useCallback,useEffect,useState} from 'react'
import {SUNSHINE_BANK_PRODUCTS,sunshineBankProduct} from '@/lib/sunshine-bank-products'
import {SunshineAdvanceDesk} from '@/components/sunshine/sunshine-advance-desk'

type Plan={
  declaredCapitalNgn:number;declaredCapitalTrx:number;capitalBasis:'NGN'|'TRX';bankProduct:string;managerVisibility:boolean;
  needsHelp:boolean;obstacleKind:string|null;createdAt:string
}
type Mine={success:boolean;plan:Plan|null;managerId:string|null;withdrawalTarget:number;withdrawalCount:number;
  savingsGoalSwitch:number;capitalProgressSwitch:number|null;rateNgnPerSystemSwitch:number|null;
  monthlyLivingMoney:{netInterestCreditedNgn:number;spentFromInterestNgn:number}|null}
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
  const [capital,setCapital]=useState('0')
  const [product,setProduct]=useState('ecobank_super_savers')
  const [share,setShare]=useState(false)
  const [ownership,setOwnership]=useState(false)
  const [obstacle,setObstacle]=useState('work_tools')
  const [rate,setRate]=useState('')
  const [interestReceived,setInterestReceived]=useState('')
  const [interestSpent,setInterestSpent]=useState('')
  const [monthlySurplus,setMonthlySurplus]=useState('')
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [posterAvailable,setPosterAvailable]=useState(true)
  const fetchMine=useCallback(async()=>{
    if(!token)return
    const res=await fetch('/api/sunshine',{headers:{Authorization:'Bearer '+token},cache:'no-store'})
    const result=await res.json()
    if(!res.ok)throw new Error(result.error||'Sunshine records unavailable')
    setMine(result)
    if(result.monthlyLivingMoney){
      setInterestReceived(String(result.monthlyLivingMoney.netInterestCreditedNgn))
      setInterestSpent(String(result.monthlyLivingMoney.spentFromInterestNgn))
    }
    if(result.plan){
      setCapital(String(result.plan.capitalBasis==='TRX'?result.plan.declaredCapitalTrx:result.plan.declaredCapitalNgn))
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
  const netInterest=Number(interestReceived)
  const interestSpend=Number(interestSpent)
  const validLivingMoney=interestReceived.trim()!==''&&interestSpent.trim()!==''&&
    Number.isFinite(netInterest)&&Number.isFinite(interestSpend)&&
    netInterest>=0&&interestSpend>=0&&interestSpend<=netInterest
  const isClient=user?.role==='client'
  const targetSwitch=mine?.savingsGoalSwitch||1000000
  const progressSwitch=mine?.capitalProgressSwitch??null
  const monthlySurplusSwitch=isClient?Number(monthlySurplus):
    mine?.rateNgnPerSystemSwitch?Number(monthlySurplus)/mine.rateNgnPerSystemSwitch:null
  const projectedMonths=progressSwitch!==null&&monthlySurplusSwitch!==null&&
    monthlySurplusSwitch>0?Math.max(0,Math.ceil(Math.max(0,targetSwitch-progressSwitch)/monthlySurplusSwitch)):null
  const supportLink='/weave/lifestyles/support'+(mine?.managerId?'?managerId='+encodeURIComponent(mine.managerId):'')
  return <main className="weave-operating-environment mx-auto min-h-screen max-w-6xl space-y-6 px-3 py-6 text-white sm:px-6" data-sunshine-workshop="mechanized-wealth">
    <section className="overflow-hidden rounded-2xl border border-amber-300/35 bg-gradient-to-b from-[#071a35] via-[#102b48] to-[#0b162e] p-3 shadow-2xl shadow-amber-950/20 sm:p-6" data-sunshine-approved-poster>
      {posterAvailable
        ? <a href="/images/sunshine-mechanized-wealth-approved.jpg" target="_blank" rel="noopener noreferrer" aria-label="Open the full-size approved Sunshine Mechanized Wealth advertisement">
            <img src="/images/sunshine-mechanized-wealth-approved.jpg"
              width={1404} height={1536} loading="eager" decoding="async"
              onError={()=>setPosterAvailable(false)}
              alt="WEAVE Sunshine Mechanized Wealth advertisement: keep personal bank savings, access eligible support up to 70% of bank interest for Weave product purchases, repay upon verified bank interest credit with a 10% interest-based service fee, and contact your Regional Manager."
              className="mx-auto h-auto w-full max-w-[840px] rounded-xl object-contain"/>
          </a>
        : <div className="mx-auto max-w-3xl space-y-3 rounded-xl border border-amber-200/20 bg-slate-950/50 p-6 text-center" role="status">
            <p className="text-lg font-black tracking-wider text-amber-200">SUNSHINE · MECHANIZED WEALTH</p>
            <p className="text-sm leading-7 text-slate-200">Need a Weave product but short of immediate funds? Eligible interest-backed support can assist without withdrawing savings from your bank. The approved promotional image is not yet available on this deployment.</p>
          </div>}
      <p className="mx-auto mt-3 max-w-[840px] text-center text-xs leading-6 text-amber-100/90">The 70% limit and 10% Weave fee are calculated against verified bank interest—not the savings principal. Support is subject to eligibility and independent approval; funding remains disabled until authorized.</p>
    </section>
    <header className="rounded-2xl border border-amber-200/30 bg-gradient-to-br from-[#283225] via-[#132630] to-[#0c1621] p-6">
      <Link className="text-sm text-cyan-200" href="/weave/lifestyles">← Weave Lifestyle</Link>
      <p className="mt-5 text-xs font-bold uppercase tracking-[.23em] text-amber-200">Sunshine · Mechanized Wealth</p>
      <h1 className="mt-3 text-3xl font-black sm:text-4xl">Capital protected. Work continues.</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">Apply before reaching your savings goal. Sunshine's initial capital target is 1,000,000 System Switch in value; Clients may declare progress using the 1 TRX = 1 System Switch reference, while actual TRX deposits require separate blockchain verification. Track a voluntary two-withdrawal monthly discipline alongside your bank's real rules. Your assigned Regional Manager helps remove work obstacles through verified Weave opportunities and company support—not by handling your bank money.</p>
      <p className="mt-3 text-xs leading-6 text-amber-100">External bank deposits, interest and withdrawal counts are not verified by Weave. No bank credentials, account number or payment are requested here. Check the rules of your actual bank product; interest rates and returns can change.</p>
    </header>
    {loading&&<p className="text-sm text-slate-300">Opening personal continuity records…</p>}
    {error&&<p role="alert" className="rounded-xl border border-rose-300/30 p-4 text-sm text-rose-100">{error}</p>}
    {notice&&<p role="status" className="rounded-xl border border-cyan-300/30 p-4 text-sm text-cyan-100">{notice}</p>}
    {isInitialized&&!loading&&token&&<>
      <section className="rounded-2xl border border-amber-200/25 bg-[#102329] p-5" data-sunshine-earn-first>
        <h2 className="text-xl font-bold">First earn. Then build savings. Then live from interest.</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-200">Sunshine is the wealth-continuity phase of real Weave work. Complete verified tasks and serve real customers; separate affordable savings from actual naira proceeds, then open the eligible savings product directly with your chosen institution. Weave does not promise earnings, transfer funds to banks, or provide a banking account.</p>
        <p className="mt-2 text-xs leading-6 text-amber-100">{isClient?'Clients declare a TRX-equivalent savings reference; actual TRX-to-System-Switch deposits are credited only after independent on-chain verification.':'Agents and Bridgers compare real NGN savings to the System Switch target using a live TRX/NGN quote.'} Weave System Switch is an internal asset, not a bank balance or guaranteed external cash. Interest in a Nigerian bank is tracked separately from Weave value.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/15 p-4"><h3 className="font-bold text-amber-100">1 · Earn through Weave</h3><p className="mt-2 text-sm leading-6 text-slate-200">{user?.role==='bridger'?'Work in Hope: outreach, qualified prospects and verified Client File Folder sales.':user?.role==='agent'?'Work in Stability: food distribution, customer fulfillment and verified Agent earnings.':user?.role==='client'?'Operate your Client File Folder and Customer Door, serve customers and verify business earnings.':'Grow income through authorized Weave activities and records.'}</p>
            <Link className="mt-3 inline-flex text-sm font-semibold text-cyan-200" href={user?.role==='bridger'?'/bridger/dashboard':user?.role==='agent'?'/agent/distribution':user?.role==='client'?'/client/dashboard':'/weave/lifestyles/work'}>Open working systems →</Link>
          </div>
          <div className="rounded-xl border border-white/15 p-4"><h3 className="font-bold text-amber-100">2 · Accumulate capital</h3><p className="mt-2 text-sm leading-6 text-slate-200">Enroll at any savings level and build toward the 1,000,000 System Switch value milestone. Keep external savings in a bank account you control. Weave does not charge the target value.</p>
            <Link className="mt-3 inline-flex text-sm font-semibold text-cyan-200" href="/weave/lifestyles/support">Request work assistance →</Link>
          </div>
          <div className="rounded-xl border border-white/15 p-4"><h3 className="font-bold text-amber-100">3 · Protect living capital</h3><p className="mt-2 text-sm leading-6 text-slate-200">Track interest, withdrawal activity and the bank's actual terms. Spend only affordable returns once the interest can cover living needs without consuming principal.</p></div>
        </div>
      </section>
      <section className="rounded-2xl border border-white/15 bg-[#0d1d25] p-5" data-sunshine-saving-goal>
        <h2 className="text-xl font-bold">Savings from actual work · 1m System Switch target</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">Use the amount you can afford to save monthly after real living and business expenses. This planning tool does not imply that Weave earnings are guaranteed or bank deposits are automatic.</p>
        <label className="mt-4 block max-w-md text-sm font-semibold">Monthly surplus available for savings ({isClient?'TRX':'₦'})
          <input type="number" min="0" step="1000" inputMode="decimal" value={monthlySurplus} onChange={e=>setMonthlySurplus(e.target.value)}
            placeholder="After expenses" className="mt-2 min-h-11 w-full rounded-lg border border-white/25 bg-slate-950 p-3 text-white"/>
        </label>
        {projectedMonths!==null&&<p className="mt-3 text-sm text-amber-100">At this monthly savings surplus, the difference between your declared balance and the 1m System Switch value target takes approximately <strong>{projectedMonths} month{projectedMonths===1?'':'s'}</strong> to close, excluding interest. Your actual results depend on work and expenses.</p>}
        <p className="mt-3 text-sm text-slate-300">Self-declared capital equivalent (not a verified deposit): {progressSwitch===null?'Live TRX/NGN conversion unavailable':progressSwitch.toLocaleString('en-NG',{maximumFractionDigits:3})+' / '+targetSwitch.toLocaleString('en-NG')+' System Switch'}. Enrollment carries no 1m System Switch charge.</p>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/15 bg-[#10212a] p-5" data-sunshine-owner-record>
          <h2 className="text-xl font-bold">My Sunshine capital</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">Self-declared information visible only to you. A Regional Manager never receives this capital amount. This is not a payment or a bank deposit.</p>
          <label className="mt-4 block text-sm font-semibold">{isClient?'Self-reported Client capital reference (TRX · 1 TRX = 1 System Switch)':'Self-reported personal bank savings balance (₦)'}
            <input type="number" min={0} max={999999999999} step={isClient?'0.000001':'0.01'} inputMode="decimal"
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
          <button type="button" disabled={busy||!ownership||Number(capital)<0||!Number.isFinite(Number(capital))}
            onClick={()=>void send({action:'enroll',capitalNgn:isClient?undefined:Number(capital),capitalTrx:isClient?Number(capital):undefined,bankProduct:product,managerVisibility:share,acknowledgeBankOwnership:true})}
            className="mt-5 min-h-12 w-full rounded-xl bg-amber-200 px-5 py-3 font-bold text-slate-950 disabled:opacity-40">
            {enrolled?'Update personal Sunshine plan':'Apply to Sunshine · start saving'}
          </button>
          {!mine?.managerId&&<p className="mt-3 text-xs leading-6 text-amber-100">No Sunshine Regional Manager is currently assigned. The user can start saving now; finance support requires an authorized appointment and your consent.</p>}
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
          <div className="mt-6 border-t border-white/15 pt-5" data-sunshine-actual-living-money>
            <h3 className="font-semibold">Interest credited · Living money</h3>
            <p className="mt-2 text-xs leading-6 text-slate-300">At month end, record only net bank interest actually credited and how much of that interest you spent. Retain the remainder as new capital. Do not record projected interest as cash received.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">Actual net interest credited (₦)
                <input type="number" min="0" step="0.01" inputMode="decimal" value={interestReceived} onChange={e=>setInterestReceived(e.target.value)}
                  className="mt-2 min-h-11 w-full rounded-lg border border-white/25 bg-slate-950 p-3"/>
              </label>
              <label className="text-sm">Living money spent from interest (₦)
                <input type="number" min="0" step="0.01" inputMode="decimal" value={interestSpent} onChange={e=>setInterestSpent(e.target.value)}
                  className="mt-2 min-h-11 w-full rounded-lg border border-white/25 bg-slate-950 p-3"/>
              </label>
            </div>
            {validLivingMoney&&<p className="mt-3 text-sm text-amber-100">Interest retained to grow capital: <strong>{money(netInterest-interestSpend)}</strong>.</p>}
            <button type="button" disabled={!enrolled||busy||!validLivingMoney}
              onClick={()=>void send({action:'record_living_money',netInterestCreditedNgn:netInterest,spentFromInterestNgn:interestSpend})}
              className="mt-3 min-h-11 rounded-lg border border-amber-200/40 px-4 py-2 text-sm font-semibold text-amber-100 disabled:opacity-40">Record actual living money</button>
          </div>
          <div className="mt-6 border-t border-white/15 pt-5">
            <h3 className="font-semibold">Optional interest illustration</h3>
            <label className="mt-3 block text-sm">Bank-confirmed annual rate (%)
              <input value={rate} onChange={e=>setRate(e.target.value)} type="number" min="0" max="100" step="0.01" placeholder="Enter rate from your bank"
                className="mt-2 min-h-11 w-full rounded-lg border border-white/25 bg-slate-950 p-3"/>
            </label>
            {validRate&&!isClient&&<p className="mt-3 text-sm">Approximate monthly gross interest at a constant balance: <strong>{money(projected)}</strong>.</p>}
            <p className="mt-2 text-xs text-slate-400">Illustration only, before withholding tax or charges. No interest rate or payout is promised by Weave.</p>
          </div>
        </div>
      </section>
      <SunshineAdvanceDesk enrolled={enrolled} managerId={mine?.managerId||null}/>
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
