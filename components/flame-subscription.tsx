'use client'
import {useEffect,useRef,useState} from 'react'
import {getClientToken} from '@/lib/client-auth'
import {useAuth} from '@/lib/auth-provider'
import Link from 'next/link'
type Subscription={exempt:boolean;units:number;used:number;reserved:number;costs:{native_reply:number;model_reply:number;workshop_operation:number;creative_image:number;creative_text:number};plans:readonly {id:string;name:string;usdCents:number;units:number;description:string}[]}
type Quote={planId:string;name:string;units:number;usdCents:number;usdPerTrx:number;amountTrx:number}
function headers(){const token=getClientToken();return {'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})}}
export function notifyFlameUsage(){window.dispatchEvent(new Event('weave:flame-usage'))}
export function FlameSubscriptionPanel(){
 const {user}=useAuth()
 return user?.id?<FlameSubscriptionAccount key={user.id} accountId={user.id}/>:<p>Sign in to manage Flame usage.</p>
}
function FlameSubscriptionAccount({accountId}:{accountId:string}){
 const [subscription,setSubscription]=useState<Subscription|null>(null)
 const [quotes,setQuotes]=useState<Quote[]>([])
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [quoteError,setQuoteError]=useState('')
 const [receipt,setReceipt]=useState<{id:string;units:number}|null>(null)
 const [pendingPlan,setPendingPlan]=useState<string|null>(null)
 const [loading,setLoading]=useState(true)
 const lock=useRef(false)
 const storageKey='weave:flame-purchase:'+accountId
 const pending=useRef<{id:string;planId:string}|null>(null)
 async function refresh(){
  setLoading(true);setError('')
  try{
   const r=await fetch('/api/flame-subscription',{headers:headers(),cache:'no-store'})
   const b=await r.json();if(!r.ok)throw Error(b.error)
   setSubscription(b.subscription);setQuotes(Array.isArray(b.quotes)?b.quotes:[]);setQuoteError(b.quoteError||'')
  }catch(e){setError(e instanceof Error?e.message:'Flame subscription unavailable')}
  finally{setLoading(false)}
 }
 useEffect(()=>{
  pending.current=null;setPendingPlan(null);setReceipt(null);setSubscription(null);setQuotes([])
  try{const raw=storageKey?localStorage.getItem(storageKey):null;if(raw){const value=JSON.parse(raw);if(typeof value.id==='string'&&typeof value.planId==='string'){pending.current=value;setPendingPlan(value.planId)}}}catch{}
  void refresh();const listener=()=>void refresh();window.addEventListener('weave:flame-usage',listener);return()=>window.removeEventListener('weave:flame-usage',listener)},[storageKey])
 async function refill(quote:Quote){
  if(busy||lock.current||subscription?.exempt||!storageKey)return
  if(pending.current&&pending.current.planId!==quote.planId){setError('A previous purchase is unconfirmed. Retry that same plan before selecting another.');return}
  if(!window.confirm('Buy '+quote.name+' with '+quote.units+' usage units for USD '+(quote.usdCents/100).toFixed(2)+'? Maximum wallet debit: '+quote.amountTrx+' TRX from your existing WEAVE wallet. No automatic renewal.'))return
  pending.current ||= {id:crypto.randomUUID(),planId:quote.planId}
  lock.current=true;setPendingPlan(quote.planId)
  try{localStorage.setItem(storageKey,JSON.stringify(pending.current))}catch{setError('Purchase reference could not be saved on this device. Enable browser storage and retry.');lock.current=false;return}
  setBusy(true);setError('');setReceipt(null)
  try{
   const r=await fetch('/api/flame-subscription',{method:'POST',headers:headers(),body:JSON.stringify({confirmation:'BUY FLAME USAGE',requestId:pending.current.id,planId:quote.planId,expectedUsdCents:quote.usdCents,maxAmountTrx:quote.amountTrx})})
   const b=await r.json();if(!r.ok){
    if(b.code==='PURCHASE_REJECTED'&&!String(b.error).startsWith('Purchase reference')){pending.current=null;setPendingPlan(null);try{localStorage.removeItem(storageKey)}catch{}}
    throw Error(b.error)
   }
   pending.current=null;setPendingPlan(null);try{localStorage.removeItem(storageKey)}catch{};setSubscription(b.subscription);if(b.purchase?.id)setReceipt({id:String(b.purchase.id),units:Number(b.purchase.units)});notifyFlameUsage()
  }catch(e){setError(e instanceof Error?e.message:'Purchase not confirmed. Refresh and retry the same request.')}
  finally{setBusy(false);lock.current=false}
 }
 return <section className="my-2 rounded-xl border border-amber-300/20 p-3 text-xs text-slate-200" aria-label="Flame usage subscription">
  <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-amber-200">Flame · usage subscription</strong><button type="button" disabled={busy||loading} onClick={()=>{void refresh()}} className="underline">Refresh</button></div>
  {subscription?.exempt?<p className="mt-2">Administrations · company access. No usage subscription charge.</p>:subscription?<><p className="mt-2"><strong>{subscription.units.toLocaleString()} units available</strong> · {subscription.used.toLocaleString()} used{subscription.reserved>0?' · '+subscription.reserved+' reserved':''}</p><p className="mt-1">Native reply {subscription.costs.native_reply} · advanced reply {subscription.costs.model_reply} · workshop operation {subscription.costs.workshop_operation} units · creative image {subscription.costs.creative_image} · written content {subscription.costs.creative_text} units. Navigation and previews are free. Enterprise materials and other charges remain separate.</p><p className="mt-2 text-slate-300">Choose a plan by expected usage. No automatic renewal; unused units remain available.</p><div className="mt-2 grid gap-2">{subscription.plans.map(plan=>{const quote=quotes.find(q=>q.planId===plan.id);return <div key={plan.id} className="rounded-lg border border-white/10 p-2"><div className="flex justify-between gap-2"><strong>{plan.name}</strong><strong className="text-amber-200">${(plan.usdCents/100).toFixed(2)}</strong></div><p className="mt-1">{plan.units.toLocaleString()} usage units · {plan.description}</p><button type="button" disabled={busy||loading||!quote||Boolean(pendingPlan&&pendingPlan!==plan.id)} onClick={()=>quote&&void refill(quote)} className="mt-2 rounded-lg bg-amber-300 px-3 py-2 font-bold text-slate-950 disabled:opacity-40">{pendingPlan===plan.id?'Retry '+plan.name:'Select '+plan.name}</button></div>})}</div>{!quotes.length&&<p className="mt-2 text-amber-100">{quoteError||'Live USD quote unavailable. Refresh to purchase.'}</p>}</>:<p className="mt-2">{loading?'Loading usage allowance…':'Usage allowance unavailable. Use Refresh to retry.'}</p>}
  {pendingPlan&&<p className="mt-3 text-amber-100">A purchase reference is retained. Retry the same plan to recover a confirmed purchase without paying twice.</p>}
  {receipt&&<div role="status" className="mt-3 rounded-lg border border-emerald-500/40 p-3"><strong>Purchase confirmed · {receipt.units.toLocaleString()} units</strong><p className="mt-1 break-all">Receipt: {receipt.id}</p></div>}
  {subscription&&!subscription.exempt&&<Link className="mt-3 inline-flex underline underline-offset-4" href="/wallet/deposit-withdraw">Fund your WEAVE wallet</Link>}
  {error&&<p role="alert" className="mt-2 text-rose-200">{error}</p>}
 </section>
}