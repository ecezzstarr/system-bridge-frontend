'use client'
import { useEffect,useRef,useState } from 'react'
import Link from 'next/link'
import {
  BatteryCharging,
  CheckCircle2,
  Clock3,
  Globe2,
  PackageSearch,
  Phone,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Timer,
} from 'lucide-react'
import { getAuthHeaders } from '@/lib/auth-client'
import { toast } from 'sonner'
import { WeaveSystemRoom } from '@/components/world/weave-system-room'
import { emitWeaveMotion } from '@/lib/weave-interaction-motion'
import { visiblePoll } from '@/lib/visible-poll'

function deadlineLabel(deadline:string,now:number){
 const ms=new Date(deadline).getTime()-now
 if(ms<=0)return '30-minute target passed · Administration still owes delivery'
 const mins=Math.max(1,Math.ceil(ms/60000))
 return `Due within ${mins} min`
}

export default function BridgerNumbersPage(){
 const [offers,setOffers]=useState<any[]>([])
 const [mine,setMine]=useState<any[]>([])
 const [orders,setOrders]=useState<any[]>([])
 const [requests,setRequests]=useState<any[]>([])
 const [buying,setBuying]=useState<string|null>(null)
 const [ordering,setOrdering]=useState<string|null>(null)
 const [loading,setLoading]=useState(true)
 const [now,setNow]=useState(()=>Date.now())
 const orderStateRef=useRef<Map<string,string>>(new Map())

 const readBayJson=async(url:string,fallback:string,signal?:AbortSignal)=>{
  const response=await fetch(url,{headers:getAuthHeaders(),cache:'no-store',signal})
  const data=await response.json().catch(()=>({}))
  if(!response.ok)throw new Error(data.error||fallback)
  return data
 }

 const applyNumberBayState=(x:any)=>{
  setOffers(x.offers||[])
  setMine(x.mine||[])
  const nextOrders=x.orders||[]
  for(const order of nextOrders){
   const id=String(order.id||'')
   const status=String(order.status||'')
   const previous=orderStateRef.current.get(id)
   if(previous&&previous!==status&&status==='delivered'){
    emitWeaveMotion({kind:'confirmation',label:`${order.country||'Number'} delivered into Number Bay ownership`,intensity:1.25,confirmed:true,source:'number-bay-delivery'})
   }
  }
  orderStateRef.current=new Map(nextOrders.map((order:any)=>[String(order.id||''),String(order.status||'')]))
  setOrders(nextOrders)
 }

 const load=async(silent=false,signal?:AbortSignal)=>{
  if(!silent)setLoading(true)
  try{
   const [bayResult,verificationResult]=await Promise.allSettled([
    readBayJson('/api/bridger/numbers','Unable to load Number Bay',signal),
    readBayJson('/api/bridger/number-verifications','Unable to load verification movement',signal),
   ])

   if(bayResult.status==='fulfilled'){
    applyNumberBayState(bayResult.value)
   }else{
    throw bayResult.reason
   }

   if(verificationResult.status==='fulfilled'){
    setRequests(verificationResult.value.requests||[])
   }else{
    // Verification is secondary to purchasing. A temporary verification fault
    // must never hide current stock, completed ownership or active country orders.
    setRequests([])
    console.error('[Number Bay verification rail]',verificationResult.reason)
   }
  }catch(e:any){
   if(e?.name==='AbortError')return
   toast.error(e.message||'Unable to load Number Bay')
  }finally{
   if(!silent)setLoading(false)
  }
 }

 useEffect(()=>{void load();return visiblePoll(signal=>load(true,signal),10000,false)},[])
 useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),15000);return()=>window.clearInterval(timer)},[])

 const buyCountry=async(country:string)=>{
  setBuying(country)
  try{
   const r=await fetch('/api/bridger/numbers',{
    method:'POST',
    headers:getAuthHeaders(),
    body:JSON.stringify({action:'purchase_country',country}),
   })
   const d=await r.json()
   if(!r.ok){
    if(['stock_changed','out_of_stock','stock_available'].includes(String(d.gate||'')))await load()
    throw new Error(d.error||'Purchase failed')
   }
   if(d.number){
    setMine(prev=>[d.number,...prev.filter(item=>String(item.id)!==String(d.number.id))])
    setOffers(prev=>prev.map(offer=>
     String(offer.country).toLowerCase()===country.toLowerCase()
      ? {...offer,stock_count:Math.max(0,(Number(offer.stock_count)||0)-1)}
      : offer
    ))
   }
   emitWeaveMotion({kind:'value',label:`${country} current-stock number purchased and assigned`,intensity:1.25,confirmed:true,source:'number-bay'})
   toast.success(`${country} number assigned to your Bridger account`)
   await load()
  }catch(e:any){
   emitWeaveMotion({kind:'interruption',label:e?.message||'Number purchase failed',intensity:.65,confirmed:true,source:'number-bay'})
   toast.error(e?.message||'Number purchase failed')
  }finally{
   setBuying(null)
  }
 }

 const orderCountry=async(country:string)=>{
  setOrdering(country)
  try{
   const r=await fetch('/api/bridger/numbers',{
    method:'POST',
    headers:getAuthHeaders(),
    body:JSON.stringify({action:'order_country',country}),
   })
   const d=await r.json()
   if(!r.ok)throw new Error(d.error||'Order failed')
   emitWeaveMotion({kind:'value',label:`${country} Number Bay order opened`,intensity:1,confirmed:true,source:'number-bay'})
   toast.success(`${country} number ordered · Administration delivery target is 30 minutes`)
   await load()
  }catch(e:any){
   emitWeaveMotion({kind:'interruption',label:e?.message||'Number order failed',intensity:.6,confirmed:true,source:'number-bay'})
   toast.error(e.message)
  }finally{
   setOrdering(null)
  }
 }

 const requestCode=async(numberId:string,method:'sms'|'call')=>{
  const r=await fetch('/api/bridger/number-verifications',{
   method:'POST',
   headers:getAuthHeaders(),
   body:JSON.stringify({numberId,method}),
  })
  const d=await r.json()
  if(!r.ok)return toast.error(d.error||'Could not request code')
  emitWeaveMotion({kind:'route',label:method==='sms'?'Verification SMS movement requested':'Verification call movement requested',intensity:.8,confirmed:true,source:'number-bay'})
  toast.success(method==='sms'?'SMS verification requested':'Call verification requested')
  void load()
 }

 const verify=async(id:string)=>{
  const r=await fetch('/api/bridger/number-verifications',{
   method:'PATCH',
   headers:getAuthHeaders(),
   body:JSON.stringify({id}),
  })
  const d=await r.json()
  if(!r.ok)return toast.error(d.error||'Could not complete verification')
  emitWeaveMotion({kind:'confirmation',label:'Number verification completed',intensity:1.15,confirmed:true,source:'number-bay'})
  toast.success('Number verification completed')
  void load()
 }

 const activeFor=(id:string)=>requests.find(r=>r.number_id===id&&['requested','pending','code_ready'].includes(r.status))
 const activeOrders=orders.filter(o=>['requested','fulfilling'].includes(o.status))
 const availableCountries=offers.filter(o=>Number(o.stock_count)>0).length
 const orderCountries=offers.filter(o=>Number(o.stock_count)===0).length
 const stockedCount=offers.reduce((total,o)=>total+(Number(o.stock_count)||0),0)

 const left=<>
  <section className="rounded-3xl border border-cyan-300/15 bg-cyan-400/[.035] p-4">
   <Globe2 className="h-5 w-5 text-cyan-300"/>
   <p className="mt-3 text-sm font-black text-white">Worldwide Number Bay</p>
   <p className="mt-2 text-xs leading-5 text-slate-400">Choose the country first. If WEAVE has stock, assignment is immediate. If stock is empty, place a country order and Administration delivers the number through this system with a 30-minute target.</p>
  </section>
  <section className="rounded-3xl border border-white/10 bg-black/20 p-4">
   <p className="text-[9px] font-black uppercase text-slate-500">Bay state</p>
   <div className="mt-3 grid grid-cols-2 gap-2 text-center">
    <div className="rounded-xl border border-white/10 bg-white/[.025] p-3"><p className="text-xl font-black text-cyan-200">{stockedCount}</p><p className="text-[8px] uppercase text-slate-500">Stocked numbers</p></div>
    <div className="rounded-xl border border-white/10 bg-white/[.025] p-3"><p className="text-xl font-black text-emerald-200">{mine.length}</p><p className="text-[8px] uppercase text-slate-500">Owned</p></div>
    <div className="rounded-xl border border-white/10 bg-white/[.025] p-3"><p className="text-xl font-black text-sky-200">{availableCountries}</p><p className="text-[8px] uppercase text-slate-500">Countries in stock</p></div>
    <div className="rounded-xl border border-white/10 bg-white/[.025] p-3"><p className="text-xl font-black text-amber-200">{orderCountries}</p><p className="text-[8px] uppercase text-slate-500">Orderable</p></div>
   </div>
  </section>
 </>

 const center=<>
  <div className="flex items-end justify-between gap-3 border-b border-white/10 pb-4">
   <div>
    <p className="text-[9px] font-black uppercase tracking-[.2em] text-cyan-300">Country selection</p>
    <h2 className="mt-1 text-xl font-black text-white">Choose country → buy or order</h2>
    <p className="mt-2 text-xs text-slate-400">You always see the country and Flame Coin price before spending. The exact phone number is revealed only after assignment or Administration delivery.</p>
   </div>
   <button onClick={()=>void load()} aria-label="Refresh Number Bay" className="rounded-xl border border-white/10 p-2"><RefreshCw className={`h-4 w-4 text-slate-400 ${loading?'animate-spin':''}`}/></button>
  </div>

  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
   {offers.length===0?
    <p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-500">No countries are published in the Number Bay yet.</p>
    :offers.map(offer=>{
     const stock=Number(offer.stock_count)||0
     const price=Number(offer.price_flame_coin)||0
     return <article key={offer.country} className={`rounded-2xl border p-4 ${stock>0?'border-cyan-300/10 bg-cyan-400/[.025]':'border-amber-300/10 bg-amber-400/[.025]'}`}>
      <div className="flex items-start justify-between gap-3">
       <div>
        <p className={`text-[9px] font-black uppercase tracking-wider ${stock>0?'text-cyan-300':'text-amber-300'}`}>Country</p>
        <h3 className="mt-1 text-lg font-black text-white">{offer.country}</h3>
       </div>
       {stock>0?<BatteryCharging className="h-5 w-5 text-cyan-300"/>:<PackageSearch className="h-5 w-5 text-amber-300"/>}
      </div>
      <p className="mt-4 text-2xl font-black text-white">{price.toLocaleString()} <span className="text-xs text-slate-500">FC</span></p>
      {stock>0?
       <p className="mt-2 text-[10px] leading-5 text-slate-500">{stock} in WEAVE stock · immediate assignment after successful purchase.</p>
       :<p className="mt-2 text-[10px] leading-5 text-slate-400">Out of stock · Administration can acquire and deliver this country through WEAVE within the {Number(offer.delivery_minutes)||30}-minute target.</p>}
      {stock>0?
       <button
        data-presence-output={`Buy ${offer.country} WEAVE number for ${price.toLocaleString()} Flame Coin`}
        onClick={()=>void buyCountry(offer.country)}
        disabled={buying===offer.country}
        className="mt-4 w-full rounded-xl bg-cyan-300 p-2.5 text-xs font-black text-slate-950 disabled:opacity-40"
       ><ShoppingCart className="mr-2 inline h-4 w-4"/>{buying===offer.country?'Assigning…':'Buy '+offer.country+' number'}</button>
       :<button data-presence-output={`Order ${offer.country} WEAVE number for Administration delivery`} onClick={()=>void orderCountry(offer.country)} disabled={ordering===offer.country||activeOrders.some(o=>String(o.country).toLowerCase()===String(offer.country).toLowerCase())} className="mt-4 w-full rounded-xl bg-amber-300 p-2.5 text-xs font-black text-slate-950 disabled:opacity-40"><Timer className="mr-2 inline h-4 w-4"/>{ordering===offer.country?'Ordering…':activeOrders.some(o=>String(o.country).toLowerCase()===String(offer.country).toLowerCase())?'Order active':'Order · '+(Number(offer.delivery_minutes)||30)+' min delivery'}</button>}
     </article>
    })
   }
  </div>

  <div className="mt-6 border-t border-white/10 pt-5">
   <p className="text-[9px] font-black uppercase tracking-[.2em] text-amber-300">Administration fulfillment</p>
   <h2 className="mt-1 text-xl font-black text-white">My country orders</h2>
  </div>
  <div className="mt-4 space-y-3">
   {orders.length===0?
    <p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-500">No out-of-stock country orders yet.</p>
    :orders.map(o=>{
     const active=['requested','fulfilling'].includes(o.status)
     return <article key={o.id} className="rounded-2xl border border-amber-300/10 bg-amber-400/[.025] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
       <div>
        <p className="text-[9px] font-black uppercase tracking-wider text-amber-300">{o.country} · {o.status}</p>
        <p className="mt-1 text-sm font-black text-white">{Number(o.price_flame_coin).toLocaleString()} FC</p>
       </div>
       {active&&<span className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase ${new Date(o.deadline_at).getTime()<now?'border-rose-300/20 bg-rose-400/10 text-rose-200':'border-amber-300/20 bg-amber-400/10 text-amber-200'}`}>{deadlineLabel(o.deadline_at,now)}</span>}
      </div>
      {o.admin_message&&<p className="mt-3 text-xs leading-5 text-slate-300">{o.admin_message}</p>}
      {o.status==='delivered'&&o.phone_e164&&<p className="mt-3 font-mono text-lg font-black text-emerald-200">{o.phone_e164}</p>}
      {o.status==='cancelled'&&<p className="mt-3 text-xs text-slate-500">Order cancelled. The charged Flame Coin was returned by Administration.</p>}
     </article>
    })
   }
  </div>

  <div className="mt-6 border-t border-white/10 pt-5">
   <p className="text-[9px] font-black uppercase tracking-[.2em] text-emerald-300">Assigned stack</p>
   <h2 className="mt-1 text-xl font-black text-white">My numbers + verification</h2>
  </div>
  <div className="mt-4 space-y-3">
   {mine.length===0?
    <p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-500">No assigned number yet.</p>
    :mine.map(n=>{
     const r=activeFor(n.id)
     return <article key={n.id} className="rounded-2xl border border-emerald-300/10 bg-emerald-400/[.025] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
       <div><p className="flex items-center gap-2 font-mono text-lg font-black text-white"><CheckCircle2 className="h-4 w-4 text-emerald-400"/>{n.phone_e164}</p><p className="mt-1 text-[9px] font-black uppercase text-slate-500">Country · {n.country}</p></div>
       <p className="text-sm font-black text-emerald-200">{Number(n.price_flame_coin).toLocaleString()} FC</p>
      </div>
      {!r?
       <div className="mt-3 flex flex-wrap gap-2"><button onClick={()=>void requestCode(n.id,'sms')} className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-[10px] font-black text-white">Request SMS</button><button onClick={()=>void requestCode(n.id,'call')} className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-[10px] font-black text-white">Request Call</button></div>
       :<div className="mt-3 rounded-xl border border-amber-300/10 bg-amber-300/[.025] p-3"><p className="flex items-center gap-1 text-[9px] font-black uppercase text-amber-300"><Clock3 className="h-3 w-3"/>{r.status} · {r.method}</p>{r.status==='requested'&&<p className="mt-2 text-xs text-slate-400">Administration is processing verification. Window ends {new Date(r.deadline_at).toLocaleTimeString()}.</p>}{r.status==='pending'&&<p className="mt-2 text-xs text-slate-300">{r.admin_message||'Verification remains pending. The number stays reserved to you.'}</p>}{r.status==='code_ready'&&<><p className="mt-2 text-[9px] uppercase text-slate-500">Verification code</p><p className="mt-1 font-mono text-2xl font-black tracking-widest text-white">{r.verification_code}</p><button onClick={()=>void verify(r.id)} className="mt-3 rounded-xl bg-emerald-300 px-3 py-2 text-[10px] font-black text-slate-950">I verified WhatsApp</button></>}</div>}
     </article>
    })
   }
  </div>
 </>

 const right=<>
  <section className="rounded-3xl border border-amber-300/15 bg-amber-400/[.035] p-4"><ShieldCheck className="h-5 w-5 text-amber-300"/><p className="mt-3 text-sm font-black text-white">WEAVE wrapper</p><p className="mt-2 text-xs leading-5 text-slate-400">Provider acquisition details remain Administration-only. You see the country, Flame Coin price, stock state, delivery deadline, assigned number and verification movement.</p></section>
  <section className="rounded-3xl border border-white/10 bg-black/20 p-4"><Phone className="h-5 w-5 text-emerald-300"/><p className="mt-3 text-sm font-black text-white">30-minute order path</p><p className="mt-2 text-xs leading-5 text-slate-400">When a published country is out of stock: order → Flame Coin reserved as purchase → Administration acquires number → delivery enters My Numbers → request SMS/call verification.</p></section>
  <Link href="/bridger/functions" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.025] px-4 py-3 text-xs font-black text-white">Bridger Operating Room <span className="text-cyan-300">→</span></Link>
 </>

 return <WeaveSystemRoom
  roomKey="bridger-number-bay"
  eyebrow="Bridge · Worldwide Number Access"
  title="Number Bay"
  detail="Choose a country, buy live stock immediately, or place a 30-minute Administration delivery order when stock is empty. Assignment and verification remain one continuous Bridger movement."
  tone="cyan"
  left={left}
  center={center}
  right={right}
  pulse={activeOrders.length?'Number delivery movement active':requests.some(r=>['requested','pending'].includes(r.status))?'Verification movement active':'Number Bay ready'}
 />
}
