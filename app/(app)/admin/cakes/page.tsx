'use client'

import { useEffect,useState } from 'react'
import { CakeSlice,Loader2,RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Order={id:string;agent_name?:string|null;agent_username?:string|null;customer_name:string;customer_phone:string;cake_type:string;occasion:string;size_option:string;flavor:string;event_date:string;delivery_mode:string;delivery_location:string;quoted_price_ngn?:number|string|null;waybill_fee_ngn?:number|string|null;total_ngn?:number|string|null;payment_status:string;status:string;admin_note?:string|null;created_at:string}
function headers(){const token=typeof window!=='undefined'?localStorage.getItem('ssb_auth_token'):null;return {'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})}}
const money=(v:number|string|null|undefined)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(v||0))
const next=(status:string)=>status==='paid'?'preparing':status==='preparing'?'ready':status==='ready'?'dispatched':status==='dispatched'?'completed':null

export default function AdminCakesPage(){
  const [orders,setOrders]=useState<Order[]>([])
  const [loading,setLoading]=useState(true)
  const [moving,setMoving]=useState<string|null>(null)
  const [error,setError]=useState('')
  const [notes,setNotes]=useState<Record<string,string>>({})
  const load=async()=>{setLoading(true);setError('');try{const r=await fetch('/api/admin/cakes',{headers:headers(),cache:'no-store'});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error||'Unable to load Daisy Pastries orders');setOrders(b.orders||[])}catch(e){setError(e instanceof Error?e.message:'Unable to load Daisy Pastries orders')}finally{setLoading(false)}}
  useEffect(()=>{void load()},[])
  const move=async(order:Order)=>{const status=next(order.status);if(!status)return;setMoving(order.id);setError('');try{const r=await fetch('/api/admin/cakes',{method:'PATCH',headers:headers(),body:JSON.stringify({orderId:order.id,status,adminNote:notes[order.id]||''})});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error||'Unable to move Daisy Pastries order');await load()}catch(e){setError(e instanceof Error?e.message:'Unable to move Daisy Pastries order')}finally{setMoving(null)}}
  if(loading)return <main className="flex min-h-[520px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-300"/></main>
  return <main className="mx-auto max-w-7xl space-y-7 px-4 py-8 text-white md:px-7 md:py-12" data-admin-cakes="true" data-daisy-pastries="true">
    <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.26em] text-amber-300">Administration · WEAVE Cakes</p><h1 className="mt-2 text-4xl font-black sm:text-6xl">DAISY PASTRIES FULFILLMENT</h1></div><Button onClick={()=>void load()} variant="outline" className="border-white/15 text-white"><RefreshCcw className="mr-2 h-4 w-4"/>REFRESH</Button></div>
    <div className="grid gap-2 sm:grid-cols-3"><div className="border border-amber-300/20 bg-amber-300/[.04] p-4"><p className="text-xs text-amber-200">Cake Slice</p><p className="font-black">Under ₦5,000</p></div><div className="border border-amber-300/20 bg-amber-300/[.04] p-4"><p className="text-xs text-amber-200">Bento Cake</p><p className="font-black">₦10,000</p></div><div className="border border-amber-300/20 bg-amber-300/[.04] p-4"><p className="text-xs text-amber-200">Celebration Cakes</p><p className="font-black">₦15,000 to ₦60,000</p></div></div>
    <p className="max-w-3xl text-sm leading-6 text-slate-400">Agents receive the Daisy Pastries request, quote within the official cake price band and verify customer payment. Administration only begins production after payment is verified, then moves the order through preparing → ready → dispatched → completed.</p>
    {error&&<div className="border border-red-300/20 bg-red-300/[.05] p-4 text-sm text-red-200">{error}</div>}
    <section className="space-y-4">{orders.map(order=>{const n=next(order.status);return <article key={order.id} className="border border-white/10 bg-black/20 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-amber-300"><CakeSlice className="h-4 w-4"/><p className="text-[9px] font-black uppercase tracking-[.2em]">{order.status.replaceAll('_',' ')}</p></div><h2 className="mt-2 text-xl font-black">{order.customer_name} · {order.occasion}</h2><p className="mt-2 text-xs leading-5 text-slate-400">Agent: {order.agent_name||order.agent_username||'Agent'} · {order.size_option} · {order.flavor} · Event {String(order.event_date).slice(0,10)}</p><p className="mt-1 text-xs text-slate-500">{order.delivery_mode==='waybill'?'Far location / waybill':'Local / pickup'} · {order.delivery_location}</p></div><div className="text-right"><p className="text-[9px] uppercase text-slate-600">Customer paid</p><p className="text-xl font-black text-emerald-300">{money(order.total_ngn)}</p><p className="mt-1 text-xs text-slate-500">Payment: {order.payment_status}</p></div></div>{n&&<div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]"><Input value={notes[order.id]||''} onChange={e=>setNotes(v=>({...v,[order.id]:e.target.value}))} placeholder="Administration production note · optional"/><Button disabled={moving===order.id||order.payment_status!=='paid'} onClick={()=>void move(order)} className="bg-amber-300 font-black text-slate-950 hover:bg-amber-200">MOVE TO {n.toUpperCase()}</Button></div>}</article>})}{!orders.length&&<div className="border border-white/10 p-8 text-center text-sm text-slate-500">No Daisy Pastries orders yet.</div>}</section>
  </main>
}
