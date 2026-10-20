'use client'
import { emberMoneySplit } from '@/lib/ember-catalog'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, CreditCard, Loader2, PackageCheck, RefreshCcw, Truck, UtensilsCrossed } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'
import { EMBER_VARIANTS } from '@/lib/ember-catalog'

type OrderRow={
  id:string
  agent_id:string
  agent_name?:string|null
  agent_username?:string|null
  agent_email?:string|null
  variant_id:string
  box_count:number|string
  package_count:number
  total_ngn:number|string
  payment_status:string
  fulfillment_status:string
  opay_receipt_data?:string|null
  payment_reference:string
  delivery_address?:string|null
  delivery_phone?:string|null
  admin_note?:string|null
  created_at:string
}

const nextStage:Record<string,{status:string,label:string}>={
  paid:{status:'preparing',label:'BEGIN FRESH PREPARATION'},
  preparing:{status:'packed',label:'CONFIRM PACKED & SEALED'},
  packed:{status:'dispatched',label:'DISPATCH TO AGENT'},
  dispatched:{status:'delivered',label:'MARK DELIVERED'},
}
const money=(value:number|string)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(value||0))
const productName=(id:string)=>EMBER_VARIANTS.find(item=>item.id===id)?.name||id

export default function AdminEmberPage(){
  const {user,token}=useAuth()
  const router=useRouter()
  const [orders,setOrders]=useState<OrderRow[]>([])
  const [loading,setLoading]=useState(true)
  const [working,setWorking]=useState<string|null>(null)
  const [message,setMessage]=useState('')

  const load=async()=>{
    if(!token)return
    setLoading(true)
    try{
      const response=await fetch('/api/admin/ember/stock',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
      const body=await response.json().catch(()=>({}))
      if(!response.ok||!body.success)throw new Error(body.error||'Unable to load Ember orders')
      setOrders(body.orders||[]);setMessage('')
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to load Ember orders')}
    finally{setLoading(false)}
  }

  useEffect(()=>{
    if(user&&user.role!=='admin'){router.replace('/dashboard');return}
    if(user?.role==='admin'&&token)void load()
  },[user?.role,token])

  const summary=useMemo(()=>({
    proof:orders.filter(order=>order.payment_status==='proof_submitted').length,
    paid:orders.filter(order=>order.payment_status==='paid').length,
    preparing:orders.filter(order=>['preparing','packed','dispatched'].includes(order.fulfillment_status)).length,
    received:orders.filter(order=>order.fulfillment_status==='received').length,
  }),[orders])

  const verify=async(order:OrderRow,status:'approved'|'rejected')=>{
    if(!token)return
    setWorking(`verify:${order.id}`);setMessage('')
    try{
      const response=await fetch('/api/admin/ember/payment/opay/verify',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({orderId:order.id,status})})
      const body=await response.json().catch(()=>({}))
      if(!response.ok||!body.success)throw new Error(body.error||'Unable to verify Ember payment')
      setMessage(body.message||'Payment decision recorded.');await load()
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to verify Ember payment')}
    finally{setWorking(null)}
  }

  const move=async(order:OrderRow)=>{
    if(!token)return
    const movement=nextStage[order.fulfillment_status]
    if(!movement)return
    setWorking(`move:${order.id}`);setMessage('')
    try{
      const response=await fetch('/api/admin/ember/stock',{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({orderId:order.id,status:movement.status})})
      const body=await response.json().catch(()=>({}))
      if(!response.ok||!body.success)throw new Error(body.error||'Unable to move Ember order')
      setMessage(`${productName(order.variant_id)} moved to ${movement.status}.`);await load()
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to move Ember order')}
    finally{setWorking(null)}
  }

  if(!user||user.role!=='admin')return null

  return <main className="mx-auto max-w-7xl space-y-7 text-white" data-admin-ember="independent">
    <p className="text-sm text-amber-200">Ember Small ₦6,000 · Large ₦12,000 · ₦1,000 Agent earning and ₦1,000 Administration allocation per box.</p>
    <header className="rounded-[2rem] border border-emerald-300/20 bg-emerald-300/[.04] p-6 md:p-8"><p className="text-[10px] font-black uppercase tracking-[.28em] text-emerald-300">Administration · Ember</p><h1 className="mt-2 text-4xl font-black">EMBER FULFILLMENT</h1><p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">Ember is administered separately from Agility. Verify each Agent OPay payment, prepare the exact Small or Medium Bowl order fresh, pack and seal it, dispatch it, then mark delivery. Existing Agent inventory never blocks another paid restock order.</p><Button variant="outline" className="mt-5 border-white/15 text-white" onClick={()=>void load()}><RefreshCcw className="mr-2 h-4 w-4"/>REFRESH</Button></header>

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Proof waiting" value={summary.proof} icon={<CreditCard className="h-5 w-5"/>}/><Metric label="Paid orders" value={summary.paid} icon={<CheckCircle2 className="h-5 w-5"/>}/><Metric label="In preparation / dispatch" value={summary.preparing} icon={<UtensilsCrossed className="h-5 w-5"/>}/><Metric label="Agent received" value={summary.received} icon={<PackageCheck className="h-5 w-5"/>}/></section>

    <section className="grid gap-3 md:grid-cols-2">{EMBER_VARIANTS.map(item=><article key={item.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><p className="text-[9px] font-black uppercase tracking-wider text-emerald-300">{item.accent}</p><h2 className="mt-1 text-xl font-black">{item.name}</h2><p className="mt-2 text-xs text-slate-500">WEAVE → Agent: {money(Number(item.agentBuyUnitPriceNgn||0))} / bowl · Agent → Customer: {money(Number(item.agentSellingUnitPriceNgn||0))} / bowl · 10 bowls / carton</p></article>)}</section>

    {message&&<div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[.05] p-4 text-sm text-emerald-50">{message}</div>}

    <section className="space-y-4">{loading?<div className="flex min-h-[260px] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-emerald-300"/></div>:orders.length===0?<div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-500">No Ember orders yet.</div>:orders.map(order=>{const movement=nextStage[order.fulfillment_status];return <article key={order.id} className="rounded-[1.6rem] border border-white/10 bg-black/20 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-wider text-emerald-300">{productName(order.variant_id)}</p><h2 className="mt-1 text-xl font-black">{order.agent_name||order.agent_username||'Agent'}</h2><p className="mt-1 text-xs text-slate-500">{Number(order.box_count)} carton(s) · {order.package_count} bowls · {money(order.total_ngn)}</p><p className="mt-1 text-xs text-slate-500">Payment: {order.payment_status} · Fulfillment: {order.fulfillment_status}</p><p className="mt-2 break-all text-[10px] text-slate-600">{order.payment_reference}</p></div><div className="text-right"><p className="text-xs text-slate-500">Deliver to</p><p className="mt-1 max-w-xs text-sm font-semibold">{order.delivery_address||'—'}</p><p className="text-xs text-slate-500">{order.delivery_phone||''}</p></div></div>{order.payment_status==='proof_submitted'&&<div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[.04] p-4"><p className="text-[9px] font-black uppercase tracking-wider text-amber-300">Agent OPay proof</p><p className="mt-2 break-all text-sm text-slate-300">{order.opay_receipt_data}</p><div className="mt-3 flex gap-2"><Button onClick={()=>void verify(order,'approved')} disabled={working===`verify:${order.id}`} className="bg-emerald-700 hover:bg-emerald-600">APPROVE PAYMENT</Button><Button variant="outline" onClick={()=>void verify(order,'rejected')} disabled={working===`verify:${order.id}`} className="border-rose-300/30 text-rose-200">REJECT</Button></div></div>}{order.payment_status==='paid'&&movement&&<Button className="mt-4 bg-emerald-700 font-black hover:bg-emerald-600" onClick={()=>void move(order)} disabled={working===`move:${order.id}`}><Truck className="mr-2 h-4 w-4"/>{movement.label}</Button>}{order.fulfillment_status==='delivered'&&<p className="mt-4 text-xs text-amber-200">Waiting for the Agent to confirm physical receipt.</p>}{order.fulfillment_status==='received'&&<p className="mt-4 text-xs text-emerald-300">Received by Agent. This completed stock does not prevent another Ember order.</p>}</article>})}</section>
  </main>
}

function Metric({label,value,icon}:{label:string,value:number,icon:React.ReactNode}){return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><div className="text-emerald-300">{icon}</div><p className="mt-3 text-xs text-slate-500">{label}</p><p className="mt-1 text-3xl font-black">{value}</p></div>}
