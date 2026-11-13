'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Flame, Gift, LockKeyhole, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { getAuthHeaders } from '@/lib/auth-client'

type FoodOption = {id:string;label:string;priceNgn:number;fiveTimesPriceNgn:number;requiredSystemSwitch:number;unlocked:boolean}
type Claim = {
  id:string;week_start:string;product_id:string;product_price_ngn:number;
  fulfillment_status:string;fulfillment_reference?:string|null;claimed_at:string;
  required_spend_system_switch:string;actual_spend_system_switch:string
}
type HopeState = {
  success:boolean;open:boolean;enabled:boolean;claimed:boolean;eligible:boolean;
  claim:Claim|null;spent:number;options:FoodOption[];rateSource?:'live'|'fallback';error?:string
}
const money=(amount:number)=>'₦'+Math.round(amount).toLocaleString('en-NG')
const switchUnits=(value:number)=>Number(value.toFixed(4)).toLocaleString('en-NG',{maximumFractionDigits:4})
const rewardName=(id:string)=>id==='electrolyte'?'Electrolyte · Small Bowl':id==='ember-small'?'Ember · Small Box':'Food reward'
const rewardImage=(id:string)=>id==='electrolyte'?'/weave-food/electrolyte.jpeg':'/weave-food/ember.jpg'
const statusName=(status:string)=>status==='fulfilled'?'Fulfilled':status==='preparing'?'Preparing':'Awaiting fulfilment'

export default function FlameOfHopePage(){
  const {user,isInitialized}=useAuth()
  const [state,setState]=useState<HopeState|null>(null)
  const [loading,setLoading]=useState(true)
  const [opening,setOpening]=useState(false)
  const [message,setMessage]=useState('')
  const [revealed,setRevealed]=useState(false)
  const load=useCallback(async()=>{
    setLoading(true)
    try {
      const response=await fetch('/api/bridger/flame-of-hope',{headers:getAuthHeaders(),cache:'no-store'})
      const body=await response.json().catch(()=>({}))
      if(!response.ok||!body.success)throw new Error(body.error||'Unable to check your Flame of Hope')
      setState(body)
      setMessage('')
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to check the mystery box')}
    finally{setLoading(false)}
  },[])
  useEffect(()=>{if(isInitialized&&user?.role==='bridger')void load()},[isInitialized,user?.role,load])
  async function openBox(){
    if(!state?.open||!state.enabled||!state.eligible||state.claimed||opening)return
    setOpening(true);setMessage('')
    try{
      const response=await fetch('/api/bridger/flame-of-hope',{method:'POST',headers:getAuthHeaders()})
      const body=await response.json().catch(()=>({}))
      if(!response.ok||!body.success)throw new Error(body.error||'Unable to open the box')
      setState(prev=>prev?{...prev,claimed:true,eligible:false,claim:body.claim}:prev)
      setRevealed(true)
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to open the box');void load()}
    finally{setOpening(false)}
  }
  if(!isInitialized)return null
  if(user?.role!=='bridger')return <main className="mx-auto max-w-xl p-6 text-white">Flame of Hope is reserved for Bridgers.</main>
  const claim=state?.claim
  const prize=claim?.product_id
  const canClaim=!!state?.open&&!!state?.enabled&&!!state?.eligible&&!state?.claimed&&!loading
  return <main data-flame-of-hope="weekly-food-mystery-box" className="min-h-screen bg-[#080c13] px-4 py-6 text-white">
    <div className="mx-auto max-w-xl">
      <Link href="/bridger/dashboard" className="inline-flex min-h-11 items-center gap-2 text-sm text-amber-100"><ArrowLeft className="h-4 w-4"/>Hope · Work Desk</Link>
      <div className="relative mt-3 overflow-hidden rounded-[2rem] border border-amber-300/30 bg-gradient-to-b from-[#443022] via-[#211828] to-[#090d16] px-5 py-7 text-center shadow-2xl sm:p-9">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-10 top-0 h-44 rounded-full bg-amber-500/10 blur-3xl"/>
        <p className="relative text-xs font-black uppercase tracking-[.2em] text-amber-200">Burning River · Hope Department</p>
        <h1 className="relative mt-3 text-3xl font-black tracking-tight sm:text-4xl">Flame of Hope</h1>
        <p className="relative mx-auto mt-2 max-w-md text-sm leading-6 text-orange-100/85">A mystery food gift for a Bridger who continues their work through Weave. One opportunity each week during the Flame Event.</p>
        <div className="relative mx-auto mt-7 flex h-44 w-44 items-center justify-center rounded-[2.5rem] border border-amber-200/40 bg-gradient-to-br from-amber-400/35 via-orange-600/25 to-black/45 shadow-[0_0_70px_rgba(245,158,11,.16)]" aria-label={claim?'Opened weekly mystery box':'Unopened weekly mystery box'}>
          {claim?<Sparkles className="h-24 w-24 text-amber-200"/>:<Gift className="h-24 w-24 text-amber-200"/>}
          <Flame className="absolute -top-5 h-10 w-10 text-orange-300"/>
        </div>
        <p className="relative mt-6 text-xl font-black text-amber-100">Electrolyte or Ember</p>
        <p className="relative mt-1 text-xs text-amber-100/75">One food reward · weekly eligibility · no separate box fee</p>
        {claim ? <div className="relative mt-5 rounded-2xl border border-emerald-300/35 bg-emerald-400/10 p-4" role="status">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">{revealed?'Your mystery box has opened':'This week’s box has been claimed'}</p>
          <div className="mx-auto mt-3 h-32 w-32 overflow-hidden rounded-xl border border-amber-300/30"><Image src={rewardImage(prize||'')} alt={rewardName(prize||'')} width={256} height={256} className="h-full w-full object-cover"/></div>
          <p className="mt-3 text-xl font-black text-white">{rewardName(prize||'')}</p>
          <p className="mt-2 text-xs text-emerald-100/85">{statusName(claim.fulfillment_status)}. Administrations coordinates preparation and delivery or collection. This is a food reward, not a System Switch credit.</p>
          {claim.fulfillment_reference&&<p className="mt-2 break-all text-xs text-emerald-100">Delivery reference: {claim.fulfillment_reference}</p>}
        </div> : <button type="button" onClick={openBox} disabled={!canClaim||opening}
          className="relative mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-300 px-5 py-3 font-black text-[#201309] enabled:hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-200">
          {opening?<><RefreshCw className="h-5 w-5 animate-spin"/>Opening...</>:<><Gift className="h-5 w-5"/>Claim this week’s food box</>}
        </button>}
        {message&&<p className="mt-4 text-sm text-red-200" role="alert">{message}</p>}
        {!claim&&!loading&&<p className="relative mt-3 text-xs leading-5 text-orange-100/75">
          {!state?.open?'Only available during the active Flame Event.':
            !state?.enabled?'Administrations has not activated food reward fulfilment.':
            !state?.eligible?'Spend at least five times an eligible product’s retail price in verified System Switch service purchases this week.':
            'Your verified spending qualifies. Open to reveal your available food reward.'}
        </p>}
        {loading&&<p className="mt-3 text-sm text-amber-100">Checking this week’s recorded spending...</p>}
      </div>
      <section className="mt-5 rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-amber-200"/>
          <div><h2 className="text-base font-bold">Five times the food price · one claim per week</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">Weave counts completed qualifying System Switch spending on company services during the current Monday–Sunday week (Nigeria time). Transfers, deposits and unverified activity do not count. The reward does not deduct another box fee.</p></div>
        </div>
        <p className="mt-4 text-sm text-amber-100">Qualifying spend this week: <strong>{state?.spent===undefined?'—':switchUnits(state.spent)+' System Switch'}</strong></p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {state?.options?.map(product=><div key={product.id} className="overflow-hidden rounded-xl border border-white/15 bg-black/25">
            <div className="h-32 overflow-hidden"><Image src={rewardImage(product.id)} alt={product.label} width={400} height={256} className="h-full w-full object-cover"/></div>
            <div className="p-3">
              <p className="text-sm font-bold text-white">{product.label}</p>
              <p className="mt-1 text-xs text-slate-300">Retail: {money(product.priceNgn)}</p>
              <p className="mt-1 text-xs text-slate-300">5× price: {money(product.fiveTimesPriceNgn)}</p>
              <p className="mt-1 text-xs text-slate-300">Spend target: {switchUnits(product.requiredSystemSwitch)} System Switch</p>
              <p className={'mt-2 text-xs font-bold '+(product.unlocked?'text-emerald-300':'text-amber-200')}>{product.unlocked?'Unlocked':'Not yet unlocked'}</p>
            </div>
          </div>)}
          {!state?.options?.length&&!loading&&<p className="col-span-full text-sm text-slate-400">Reward details will appear when the event and food fulfilment are activated.</p>}
        </div>
        {state?.rateSource==='fallback'&&<p className="mt-3 text-xs text-slate-400">Reference conversion uses the configured company fallback rate. Final thresholds are checked again at claim.</p>}
        <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
          <Link href="/weave/market/prospects" className="flex min-h-11 items-center justify-center rounded-xl border border-white/20 p-3 text-center font-bold text-white">Prospect Market</Link>
          <Link href="/company-chat" className="flex min-h-11 items-center justify-center rounded-xl border border-white/20 p-3 text-center font-bold text-white">Company Guidance</Link>
        </div>
        <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-400"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0"/>A claim records a food entitlement, not an automatically delivered meal. Administrations confirms stock, preparation and recipient handoff. Please do not arrange a purchase solely in expectation of receiving a reward before fulfilment is officially enabled.</p>
      </section>
    </div>
  </main>
}
