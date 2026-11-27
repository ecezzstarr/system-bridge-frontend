'use client'
import {useEffect,useRef,useState} from 'react'
import {getClientToken} from '@/lib/client-auth'
type Subscription={exempt:boolean;units:number;used:number;reserved:number;costs:{native_reply:number;model_reply:number;workshop_operation:number};packUnits:number;packUsdCents:number|null}
type Quote={units:number;usdCents:number;usdPerTrx:number;amountTrx:number}
function headers(){const token=getClientToken();return {'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})}}
export function notifyFlameUsage(){window.dispatchEvent(new Event('weave:flame-usage'))}
export function FlameSubscriptionPanel(){
 const [subscription,setSubscription]=useState<Subscription|null>(null)
 const [quote,setQuote]=useState<Quote|null>(null)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const pending=useRef<string|null>(null)
 async function refresh(){
  try{
   const r=await fetch('/api/flame-subscription',{headers:headers(),cache:'no-store'})
   const b=await r.json();if(!r.ok)throw Error(b.error)
   setSubscription(b.subscription);setQuote(b.quote)
  }catch(e){setError(e instanceof Error?e.message:'Flame subscription unavailable')}
 }
 useEffect(()=>{void refresh();const listener=()=>void refresh();window.addEventListener('weave:flame-usage',listener);return()=>window.removeEventListener('weave:flame-usage',listener)},[])
 async function refill(){
  if(busy||!quote||subscription?.exempt)return
  if(!window.confirm('Buy '+quote.units+' Flame usage units for $'+(quote.usdCents/100).toFixed(2)+'? Maximum wallet debit: '+quote.amountTrx+' TRX. No automatic renewal.'))return
  pending.current ||= crypto.randomUUID()
  setBusy(true);setError('')
  try{
   const r=await fetch('/api/flame-subscription',{method:'POST',headers:headers(),body:JSON.stringify({confirmation:'BUY FLAME USAGE',requestId:pending.current,expectedUsdCents:quote.usdCents,maxAmountTrx:quote.amountTrx})})
   const b=await r.json();if(!r.ok)throw Error(b.error)
   pending.current=null;setSubscription(b.subscription);notifyFlameUsage()
  }catch(e){setError(e instanceof Error?e.message:'Purchase not confirmed. Refresh and retry the same request.')}
  finally{setBusy(false)}
 }
 return <section className="my-2 rounded-xl border border-amber-300/20 p-3 text-xs text-slate-200" aria-label="Flame usage subscription">
  <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-amber-200">Flame · usage subscription</strong><button type="button" disabled={busy} onClick={()=>{setError('');void refresh()}} className="underline">Refresh</button></div>
  {subscription?.exempt?<p className="mt-2">Administrations · company access. No usage subscription charge.</p>:subscription?<><p className="mt-2"><strong>{subscription.units.toLocaleString()} units available</strong> · {subscription.used.toLocaleString()} used{subscription.reserved>0?' · '+subscription.reserved+' reserved':''}</p><p className="mt-1">Native reply {subscription.costs.native_reply} · advanced reply {subscription.costs.model_reply} · workshop operation {subscription.costs.workshop_operation} units. Navigation and previews are free. Enterprise materials and other charges remain separate.</p>{quote?<button type="button" disabled={busy} onClick={()=>void refill()} className="mt-2 rounded-lg bg-amber-300 px-3 py-2 font-bold text-slate-950 disabled:opacity-40">Refill {quote.units} units · ${(quote.usdCents/100).toFixed(2)}</button>:<p className="mt-2 text-amber-100">{subscription.packUsdCents===null?'Administrations has not enabled the subscription tariff.':'Live USD quote unavailable. Refresh to purchase.'}</p>}</>:<p className="mt-2">Loading usage allowance…</p>}
  {error&&<p role="alert" className="mt-2 text-rose-200">{error}</p>}
 </section>
}
