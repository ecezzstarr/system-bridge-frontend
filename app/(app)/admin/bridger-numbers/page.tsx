'use client'
import { useEffect,useState } from 'react'
import Link from 'next/link'
import { BatteryCharging,Clock3,Globe2,PackageCheck,Plus,RefreshCw,ShieldCheck,Timer,Undo2 } from 'lucide-react'
import { getAuthHeaders } from '@/lib/auth-client'
import { toast } from 'sonner'
import { WeaveSystemRoom } from '@/components/world/weave-system-room'

function deadlineLabel(deadline:string,now:number){
 const ms=new Date(deadline).getTime()-now
 if(ms<=0)return 'OVERDUE'
 return Math.max(1,Math.ceil(ms/60000))+' min left'
}

export default function AdminBridgerNumbersPage(){
 const [numbers,setNumbers]=useState<any[]>([])
 const [offers,setOffers]=useState<any[]>([])
 const [orders,setOrders]=useState<any[]>([])
 const [requests,setRequests]=useState<any[]>([])
 const [loading,setLoading]=useState(true)
 const [working,setWorking]=useState<string|null>(null)
 const [now,setNow]=useState(()=>Date.now())
 const [form,setForm]=useState({phone:'',country:'Nigeria',providerReference:'',acquisitionCost:'',priceFlameCoin:'',notes:''})
 const [offerForm,setOfferForm]=useState({country:'Nigeria',priceFlameCoin:''})

 const load=async()=>{
  setLoading(true)
  try{
   const [a,b]=await Promise.all([
    fetch('/api/admin/bridger-numbers',{headers:getAuthHeaders(),cache:'no-store'}),
    fetch('/api/bridger/number-verifications',{headers:getAuthHeaders(),cache:'no-store'}),
   ])
   const x=await a.json(),y=await b.json()
   if(!a.ok)throw new Error(x.error)
   if(!b.ok)throw new Error(y.error)
   setNumbers(x.numbers||[])
   setOffers(x.offers||[])
   setOrders(x.orders||[])
   setRequests(y.requests||[])
  }catch(e:any){
   toast.error(e.message||'Unable to load Number Engine')
  }finally{
   setLoading(false)
  }
 }

 useEffect(()=>{void load()},[])
 useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),15000);return()=>window.clearInterval(timer)},[])

 const add=async(e:React.FormEvent)=>{
  e.preventDefault()
  const r=await fetch('/api/admin/bridger-numbers',{method:'POST',headers:getAuthHeaders(),body:JSON.stringify(form)})
  const d=await r.json()
  if(!r.ok)return toast.error(d.error||'Unable to load number')
  toast.success('Number loaded into WEAVE stock and country published')
  setForm({...form,phone:'',providerReference:'',acquisitionCost:'',notes:''})
  void load()
 }

 const saveOffer=async(e:React.FormEvent)=>{
  e.preventDefault()
  const r=await fetch('/api/admin/bridger-numbers',{
   method:'POST',
   headers:getAuthHeaders(),
   body:JSON.stringify({action:'upsert_offer',...offerForm}),
  })
  const d=await r.json()
  if(!r.ok)return toast.error(d.error||'Unable to publish country')
  toast.success('Country published for Number Bay ordering')
  setOfferForm(v=>({...v,priceFlameCoin:''}))
  void load()
 }

 const respond=async(id:string,status:string)=>{
  const message=status==='pending'?window.prompt('Why is the verification pending?')||'':''
  const code=status==='code_ready'?window.prompt('Enter the received verification code')||'':''
  if(status==='pending'&&!message)return
  if(status==='code_ready'&&!code)return
  const r=await fetch('/api/bridger/number-verifications',{method:'PATCH',headers:getAuthHeaders(),body:JSON.stringify({id,status,message,code})})
  const d=await r.json()
  if(!r.ok)return toast.error(d.error||'Update failed')
  toast.success(status==='code_ready'?'Code delivered to Bridger':'Request remains pending')
  void load()
 }

 const orderAction=async(order:any,action:'start_order'|'deliver_order'|'cancel_order',extra:Record<string,unknown>={})=>{
  setWorking(order.id)
  try{
   const r=await fetch('/api/admin/bridger-numbers',{
    method:'PATCH',
    headers:getAuthHeaders(),
    body:JSON.stringify({action,orderId:order.id,...extra}),
   })
   const d=await r.json()
   if(!r.ok)throw new Error(d.error||'Order update failed')
   toast.success(action==='deliver_order'?'Number delivered to Bridger':action==='cancel_order'?'Order cancelled and refunded':'Order moved into fulfillment')
   await load()
  }catch(e:any){
   toast.error(e.message)
  }finally{
   setWorking(null)
  }
 }

 const deliverAcquired=async(order:any)=>{
  const phone=window.prompt(`Enter the acquired ${order.country} number in E.164 format`)
  if(!phone)return
  const providerReference=window.prompt('Provider reference (optional)')||''
  const acquisitionCost=window.prompt('Administration acquisition cost (optional)')||''
  const message=window.prompt('Delivery message to Bridger (optional)')||''
  await orderAction(order,'deliver_order',{phone,providerReference,acquisitionCost,message})
 }

 const cancelOrder=async(order:any)=>{
  if(!window.confirm(`Cancel this ${order.country} order and return ${Number(order.price_flame_coin).toLocaleString()} Flame Coin to the Bridger?`))return
  const message=window.prompt('Cancellation reason / message to Bridger')||'Administration cancelled this number order and returned the Flame Coin to your wallet.'
  await orderAction(order,'cancel_order',{message})
 }

 const fields=[
  {key:'phone',label:'Number',placeholder:'+2348012345678',type:'text'},
  {key:'country',label:'Country',placeholder:'Nigeria',type:'text'},
  {key:'providerReference',label:'Provider reference',placeholder:'',type:'text'},
  {key:'acquisitionCost',label:'Administration acquisition cost',placeholder:'0',type:'number'},
  {key:'priceFlameCoin',label:'Bridger price · Flame Coin',placeholder:'0',type:'number'},
  {key:'notes',label:'Administration notes',placeholder:'',type:'text'},
 ] as const

 const pendingVerification=requests.filter(r=>['requested','pending'].includes(r.status))
 const openOrders=orders.filter(o=>['requested','fulfilling'].includes(o.status))
 const available=numbers.filter(n=>n.status==='available'&&!n.assigned_to).length
 const assigned=numbers.filter(n=>n.assigned_to).length

 const left=<>
  <section className="rounded-3xl border border-emerald-300/15 bg-emerald-400/[.035] p-4"><BatteryCharging className="h-5 w-5 text-emerald-300"/><p className="mt-3 text-sm font-black text-white">Inventory authority</p><p className="mt-2 text-xs leading-5 text-slate-400">Load actual provider stock or publish a country offer even when no number is currently stocked. Bridgers see only country, Flame Coin price, stock state and delivery movement.</p></section>
  <section className="rounded-3xl border border-white/10 bg-black/20 p-4"><p className="text-[9px] font-black uppercase text-slate-500">Engine state</p><div className="mt-3 grid grid-cols-2 gap-2 text-center"><div className="rounded-xl border border-white/10 p-2"><p className="text-lg font-black text-emerald-200">{available}</p><p className="text-[7px] uppercase text-slate-500">Ready stock</p></div><div className="rounded-xl border border-white/10 p-2"><p className="text-lg font-black text-sky-200">{assigned}</p><p className="text-[7px] uppercase text-slate-500">Assigned</p></div><div className="rounded-xl border border-white/10 p-2"><p className="text-lg font-black text-amber-200">{openOrders.length}</p><p className="text-[7px] uppercase text-slate-500">Orders</p></div><div className="rounded-xl border border-white/10 p-2"><p className="text-lg font-black text-violet-200">{pendingVerification.length}</p><p className="text-[7px] uppercase text-slate-500">Codes</p></div></div></section>
 </>

 const center=<>
  <div className="flex items-end justify-between gap-3 border-b border-white/10 pb-4"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-emerald-300">Stock loading station</p><h2 className="mt-1 text-xl font-black text-white">Load a number battery</h2><p className="mt-2 text-xs text-slate-400">Loading a number automatically publishes/refreshes its country offer for Bridgers.</p></div><button onClick={()=>void load()} aria-label="Refresh Administration Number Engine" className="rounded-xl border border-white/10 p-2"><RefreshCw className={`h-4 w-4 text-slate-400 ${loading?'animate-spin':''}`}/></button></div>
  <form onSubmit={add} className="mt-4 grid gap-3 sm:grid-cols-2">{fields.map(f=><label key={f.key} className={f.key==='notes'?'sm:col-span-2':'block'}><span className="text-[9px] font-black uppercase text-slate-500">{f.label}</span><input type={f.type} step={f.type==='number'?'any':undefined} min={f.type==='number'?'0':undefined} value={(form as any)[f.key]} onChange={e=>setForm(v=>({...v,[f.key]:e.target.value}))} placeholder={f.placeholder} className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-white"/></label>)}<button data-presence-output="Load number battery into WEAVE inventory" className="sm:col-span-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 p-3 text-xs font-black uppercase tracking-wider text-slate-950"><Plus className="h-4 w-4"/>Load battery</button></form>

  <div className="mt-6 border-t border-white/10 pt-5"><div className="flex items-center gap-2"><Globe2 className="h-4 w-4 text-cyan-300"/><p className="text-[9px] font-black uppercase tracking-[.2em] text-cyan-300">Country catalog</p></div><h2 className="mt-1 text-xl font-black text-white">Publish countries even when stock is empty</h2><p className="mt-2 text-xs text-slate-400">This is what makes out-of-stock ordering possible. The Bridger can still pay and Administration gets a timed delivery order.</p></div>
  <form onSubmit={saveOffer} className="mt-4 grid gap-3 sm:grid-cols-2"><label><span className="text-[9px] font-black uppercase text-slate-500">Country</span><input value={offerForm.country} onChange={e=>setOfferForm(v=>({...v,country:e.target.value}))} placeholder="Ghana" className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-white"/></label><label><span className="text-[9px] font-black uppercase text-slate-500">Bridger price · FC</span><input type="number" min="0" step="any" value={offerForm.priceFlameCoin} onChange={e=>setOfferForm(v=>({...v,priceFlameCoin:e.target.value}))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-white"/></label><div className="sm:col-span-2 rounded-xl border border-amber-300/15 bg-amber-400/[.035] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-amber-200">Delivery SLA · fixed 30 minutes</div><button className="sm:col-span-2 flex items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-400/10 p-3 text-xs font-black uppercase tracking-wider text-cyan-100"><Plus className="h-4 w-4"/>Publish country offer</button></form>
  <div className="mt-3 grid gap-2 md:grid-cols-2">{offers.map(o=><div key={o.country} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black text-white">{o.country}</p><p className="mt-1 text-[9px] text-slate-500">{Number(o.price_flame_coin).toLocaleString()} FC · {Number(o.delivery_minutes)||30} min delivery target</p></div><span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase ${Number(o.stock_count)>0?'bg-emerald-400/10 text-emerald-300':'bg-amber-400/10 text-amber-300'}`}>{Number(o.stock_count)>0?o.stock_count+' stock':'order only'}</span></div></div>)}</div>

  <div className="mt-6 border-t border-white/10 pt-5"><p className="text-[9px] font-black uppercase tracking-[.2em] text-sky-300">Administration inventory</p><h2 className="mt-1 text-xl font-black text-white">Battery stock</h2></div>
  <div className="mt-4 space-y-2">{loading?<p className="text-sm text-slate-500">Synchronizing stock…</p>:numbers.length===0?<p className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-slate-500">No numbers loaded.</p>:numbers.map(n=><article key={n.id} className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex flex-wrap justify-between gap-4"><div><p className="font-mono font-black text-white">{n.phone_e164}</p><p className="mt-1 text-[9px] font-black uppercase text-slate-500">Aphone · {n.country} · {n.status}{n.assigned_name?' · '+n.assigned_name:''}</p>{n.provider_reference&&<p className="mt-1 text-[9px] text-slate-600">Provider ref · {n.provider_reference}</p>}</div><div className="grid min-w-[240px] grid-cols-2 gap-2 text-right"><div className="rounded-xl border border-sky-300/10 bg-sky-400/[.025] p-3"><p className="text-[8px] font-black uppercase text-sky-300">Bridger value</p><p className="mt-1 text-sm font-black text-white">{Number(n.price_flame_coin).toLocaleString()} FC</p></div><div className="rounded-xl border border-amber-300/10 bg-amber-400/[.025] p-3"><p className="text-[8px] font-black uppercase text-amber-300">Acquisition cost</p><p className="mt-1 text-sm font-black text-amber-100">{n.acquisition_cost==null?'Not set':Number(n.acquisition_cost).toLocaleString()}</p></div></div></div></article>)}</div>
 </>

 const right=<>
  <section className="max-h-[620px] overflow-y-auto rounded-3xl border border-cyan-300/15 bg-cyan-400/[.025] p-4">
   <div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">30-minute delivery dock</p><p className="mt-1 text-sm font-black text-white">{openOrders.length} open orders</p></div><Timer className="h-4 w-4 text-cyan-300"/></div>
   <div className="mt-3 space-y-3">
    {openOrders.length===0?<p className="text-xs text-slate-500">No country orders waiting.</p>:openOrders.map(order=>{
     const stocked=numbers.find(n=>n.status==='available'&&!n.assigned_to&&String(n.country).toLowerCase()===String(order.country).toLowerCase())
     const overdue=new Date(order.deadline_at).getTime()<now
     return <article key={order.id} className={`rounded-xl border p-3 ${overdue?'border-rose-300/20 bg-rose-400/[.04]':'border-white/10 bg-black/20'}`}>
      <div className="flex items-start justify-between gap-2"><div><p className="text-xs font-black text-white">{order.country}</p><p className="mt-1 text-[9px] text-slate-500">{order.bridger_name} · {Number(order.price_flame_coin).toLocaleString()} FC · {order.status}</p></div><span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase ${overdue?'bg-rose-400/10 text-rose-300':'bg-amber-400/10 text-amber-300'}`}>{deadlineLabel(order.deadline_at,now)}</span></div>
      {order.admin_message&&<p className="mt-2 text-[9px] leading-4 text-slate-400">{order.admin_message}</p>}
      <div className="mt-3 grid gap-2">
       {order.status==='requested'&&<button disabled={working===order.id} onClick={()=>void orderAction(order,'start_order',{message:'Administration is acquiring and preparing your number.'})} className="rounded-lg border border-cyan-300/20 px-2 py-2 text-[8px] font-black uppercase text-cyan-200 disabled:opacity-40">Start acquisition</button>}
       {stocked&&<button disabled={working===order.id} onClick={()=>void orderAction(order,'deliver_order',{numberId:stocked.id,message:'Administration delivered your ordered number from newly available WEAVE stock.'})} className="rounded-lg bg-emerald-300 px-2 py-2 text-[8px] font-black uppercase text-slate-950 disabled:opacity-40"><PackageCheck className="mr-1 inline h-3 w-3"/>Deliver stocked {stocked.phone_e164}</button>}
       <button disabled={working===order.id} onClick={()=>void deliverAcquired(order)} className="rounded-lg border border-emerald-300/20 bg-emerald-400/5 px-2 py-2 text-[8px] font-black uppercase text-emerald-200 disabled:opacity-40">Deliver newly acquired number</button>
       <button disabled={working===order.id} onClick={()=>void cancelOrder(order)} className="rounded-lg border border-rose-300/15 px-2 py-2 text-[8px] font-black uppercase text-rose-300 disabled:opacity-40"><Undo2 className="mr-1 inline h-3 w-3"/>Cancel + refund</button>
      </div>
     </article>
    })}
   </div>
  </section>

  <section className="max-h-[520px] overflow-y-auto rounded-3xl border border-amber-300/15 bg-amber-400/[.025] p-4"><div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-amber-300">Verification dock</p><p className="mt-1 text-sm font-black text-white">{pendingVerification.length} waiting</p></div><Clock3 className="h-4 w-4 text-amber-300"/></div><div className="mt-3 space-y-2">{pendingVerification.length===0?<p className="text-xs text-slate-500">No verification movement waiting.</p>:pendingVerification.map(r=><article key={r.id} className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="font-mono text-xs font-black text-white">{r.phone_e164}</p><p className="mt-1 text-[9px] text-slate-500">{r.bridger_name} · {r.method.toUpperCase()} · {r.status}</p><p className="mt-1 text-[9px] text-amber-300">Deadline {new Date(r.deadline_at).toLocaleTimeString()}</p>{r.admin_message&&<p className="mt-2 text-[9px] text-slate-400">{r.admin_message}</p>}<div className="mt-2 grid grid-cols-2 gap-2"><button onClick={()=>void respond(r.id,'pending')} className="rounded-lg border border-amber-300/20 px-2 py-1.5 text-[8px] font-black text-amber-300">Pending</button><button onClick={()=>void respond(r.id,'code_ready')} className="rounded-lg bg-emerald-300 px-2 py-1.5 text-[8px] font-black text-slate-950">Send code</button></div></article>)}</div></section>
  <Link href="/admin/functions" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.025] px-4 py-3 text-xs font-black text-white"><span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300"/>Administration Operating Room</span></Link>
 </>

 return <WeaveSystemRoom
  roomKey="administration-number-engine"
  eyebrow="Administration · Number Authority"
  title="Number Engine Control Bay"
  detail="Publish countries, load provider stock, receive out-of-stock orders, deliver acquired numbers within the timed window and continue into verification. Internal acquisition data never crosses into the Bridger view."
  tone="emerald"
  left={left}
  center={center}
  right={right}
  pulse={openOrders.length?'Number orders awaiting delivery':pendingVerification.length?'Verification requests waiting':'Number Engine synchronized'}
 />
}
