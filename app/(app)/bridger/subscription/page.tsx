'use client'

import { useEffect,useState } from 'react'
import Link from 'next/link'
import { ArrowLeft,CalendarClock,CheckCircle2,Clock3,ReceiptText,ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { WORLD_RULES } from '@/lib/world/constants'
import { WeaveSystemRoom } from '@/components/world/weave-system-room'
import { visiblePoll } from '@/lib/visible-poll'

const SUBSCRIPTION_AMOUNT=WORLD_RULES.BRIDGER_CONTINUANCE_NGN
type Continuance={id:string;role:string;subscription_status:'active'|'due'|'suspended';subscription_expiry:string|null;is_subscription_exempt:boolean;subscription_last_paid_at:string|null}

export default function BridgerContinuancePage(){
 const {user,token}=useAuth();const userId=user?.id??null
 const [subscription,setContinuance]=useState<Continuance|null>(null),[bridgeAi,setBridgeAi]=useState<any>(null),[loading,setLoading]=useState(true),[submitting,setSubmitting]=useState(false),[reference,setReference]=useState(''),[paymentMethod,setPaymentMethod]=useState('bank_transfer'),[message,setMessage]=useState<string|null>(null),[error,setError]=useState<string|null>(null)

 useEffect(()=>{if(!userId){setLoading(false);return}void fetchContinuance();return visiblePoll(signal=>fetchContinuance(true,signal),30000,false)},[userId,token])
 async function fetchContinuance(silent=false,signal?:AbortSignal){if(!silent)setLoading(true);try{const headers=token?{Authorization:`Bearer ${token}`}:{};const [res,bridgeRes]=await Promise.all([fetch('/api/bridger/subscription',{headers,cache:'no-store',signal}),fetch('/api/bridger/bridge-ai/subscribe',{headers,cache:'no-store',signal})]);const [data,bridgeData]=await Promise.all([res.json(),bridgeRes.json()]);if(data.success){setContinuance(data.subscription);setError(null)}else setError(data.error||'Failed to load continuance');if(bridgeRes.ok)setBridgeAi(bridgeData.subscription||null)}catch(error:any){if(error?.name!=='AbortError')setError('Failed to load continuance')}finally{if(!silent)setLoading(false)}}
 async function handleSubmit(e:React.FormEvent){e.preventDefault();if(!userId)return;if(!reference.trim()){setError('Enter a payment reference');return}setSubmitting(true);setError(null);setMessage(null);try{const res=await fetch('/api/bridger/subscription/submit',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({reference:reference.trim(),paymentMethod})});const data=await res.json();if(data.success){setMessage('Continuance payment submitted to Administration for review.');setReference('')}else setError(data.message||'Submission failed')}catch{setError('Submission failed')}finally{setSubmitting(false)}}

 const status=subscription?.subscription_status||'due'
 const statusTone=status==='active'?'text-emerald-300 border-emerald-300/20 bg-emerald-400/[.05]':status==='suspended'?'text-red-300 border-red-300/20 bg-red-400/[.05]':'text-amber-300 border-amber-300/20 bg-amber-400/[.05]'
 const bridgeAiActive=Boolean(bridgeAi?.status==='active'&&bridgeAi?.expiry&&new Date(bridgeAi.expiry)>new Date())
 const bridgeAiStatus=bridgeAiActive?'active':bridgeAi?.status==='active'?'expired':bridgeAi?.status||'inactive'
 const left=<>
  <section className="rounded-3xl border border-emerald-300/15 bg-emerald-400/[.035] p-4"><ShieldCheck className="h-5 w-5 text-emerald-300"/><p className="mt-3 text-sm font-black text-white">Partnership continuity</p><p className="mt-2 text-xs leading-5 text-slate-400">Continuance keeps the Bridger position connected to Prospect movement, Client continuity and company functions.</p></section>
  <section className="rounded-3xl border border-white/10 bg-black/20 p-4"><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Movement</p><div className="mt-3 space-y-3 text-xs text-slate-300"><p>1 · Check standing</p><p>2 · Submit continuance when due</p><p>3 · Administration verifies</p><p>4 · Position continues</p></div></section>
 </>

 const center=loading?<div className="flex min-h-[420px] items-center justify-center"><Clock3 className="h-7 w-7 animate-pulse text-emerald-300"/></div>:!userId?<div className="rounded-2xl border border-red-300/15 bg-red-400/[.035] p-5 text-sm text-red-200">A Bridger position is required.</div>:<>
  <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-emerald-300">Standing console</p><h2 className="mt-1 text-xl font-black text-white">Your partnership state</h2></div><span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase ${statusTone}`}>{status}</span></div>
  {subscription&&<div className="mt-4 grid gap-3 sm:grid-cols-3">
   <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><CalendarClock className="h-4 w-4 text-sky-300"/><p className="mt-3 text-[9px] uppercase text-slate-500">Expiry</p><p className="mt-1 text-sm font-black text-white">{subscription.subscription_expiry?new Date(subscription.subscription_expiry).toLocaleDateString():'Not set'}</p></div>
   <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><ReceiptText className="h-4 w-4 text-amber-300"/><p className="mt-3 text-[9px] uppercase text-slate-500">Last movement</p><p className="mt-1 text-sm font-black text-white">{subscription.subscription_last_paid_at?new Date(subscription.subscription_last_paid_at).toLocaleDateString():'Never'}</p></div>
   <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><CheckCircle2 className="h-4 w-4 text-emerald-300"/><p className="mt-3 text-[9px] uppercase text-slate-500">Position</p><p className="mt-1 text-sm font-black text-white">{subscription.is_subscription_exempt?'Exempt':'Continuance governed'}</p></div>
  </div>}
  {!subscription?.is_subscription_exempt&&<form onSubmit={handleSubmit} className="mt-5 rounded-2xl border border-emerald-300/10 bg-emerald-400/[.025] p-4"><p className="text-[9px] font-black uppercase tracking-[.18em] text-emerald-300">Continuance movement</p><h3 className="mt-1 text-lg font-black text-white">₦{SUBSCRIPTION_AMOUNT.toLocaleString()} monthly continuance</h3><p className="mt-2 text-xs leading-5 text-slate-400">Submit the real payment reference. Administration verifies it before the standing changes.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><label><span className="text-[9px] font-black uppercase text-slate-500">Payment method</span><select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"><option value="bank_transfer">Bank Transfer</option><option value="cash">Cash</option><option value="other">Other</option></select></label><label><span className="text-[9px] font-black uppercase text-slate-500">Reference / proof</span><input value={reference} onChange={e=>setReference(e.target.value)} placeholder="Transaction ID or teller number" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"/></label></div>{error&&<div className="mt-3 rounded-xl border border-red-300/15 bg-red-400/[.04] px-3 py-2 text-xs text-red-200">{error}</div>}{message&&<div className="mt-3 rounded-xl border border-emerald-300/15 bg-emerald-400/[.04] px-3 py-2 text-xs text-emerald-200">{message}</div>}<button data-presence-output="Submit Bridger continuance movement" disabled={submitting} className="mt-4 w-full rounded-xl bg-emerald-300 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-950 disabled:opacity-40">{submitting?'Submitting movement…':'Submit to Administration'}</button></form>}
 </>

 const right=<>
  <section className="rounded-3xl border border-amber-300/15 bg-amber-400/[.035] p-4"><p className="text-[9px] font-black uppercase tracking-wider text-amber-300">Continuance value</p><p className="mt-2 text-2xl font-black text-white">₦{SUBSCRIPTION_AMOUNT.toLocaleString()}</p><p className="mt-2 text-xs leading-5 text-slate-400">Administration review is part of the movement; submission alone does not activate standing.</p></section>
  <section className="rounded-3xl border border-cyan-300/15 bg-cyan-400/[.035] p-4">
   <p className="text-[9px] font-black uppercase tracking-wider text-cyan-300">Bridge AI subscription</p>
   <div className="mt-2 flex items-center justify-between gap-3"><p className="text-xl font-black text-white">{WORLD_RULES.BRIDGE_AI_SUBSCRIPTION_FEE_FLAME_COIN} Flame Coin / month</p><span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase ${bridgeAiActive?'border-emerald-300/20 bg-emerald-400/[.05] text-emerald-200':'border-amber-300/20 bg-amber-400/[.05] text-amber-200'}`}>{bridgeAiStatus}</span></div>
   <p className="mt-2 text-xs leading-5 text-slate-400">This is separate from Bridger Continuance. It activates Bridge AI crossing paths and Client AI continuity.</p>
   {bridgeAi?.expiry&&<p className="mt-2 text-[10px] text-slate-500">Expiry · {new Date(bridgeAi.expiry).toLocaleDateString()}</p>}
   <Link href="/bridger/bridge-ai" className="mt-3 flex items-center justify-between rounded-xl border border-cyan-300/15 bg-cyan-400/[.04] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-cyan-100"><span>{bridgeAiActive?'Open Bridge AI':'Subscribe to Bridge AI'}</span><span>→</span></Link>
  </section>
  <Link href="/bridger/functions" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.025] px-4 py-3 text-xs font-black text-white"><span className="inline-flex items-center gap-2"><ArrowLeft className="h-4 w-4 text-emerald-300"/>Bridger Operating Room</span></Link>
 </>

 return <WeaveSystemRoom roomKey="bridger-continuance" eyebrow="Bridge · Partnership Continuity" title="Bridger Continuance Chamber" detail="Standing, expiry, payment movement and Administration verification occupy one persistent Bridger system instead of a separate payment page." tone="emerald" left={left} center={center} right={right} pulse={status==='active'?'Partnership active':status==='suspended'?'Movement suspended':'Continuance due'}/>
}
