'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Boxes, CheckCircle2, CreditCard, Loader2, PackageCheck, RefreshCcw, Truck } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ELECTROLYTE_PROCESS, ELECTROLYTE_VARIANTS } from '@/lib/electrolyte-catalog'
import type { WeaveFoodVariant } from '@/lib/weave-food-types'
import {
  WEAVE_FOOD_CARTON_STEP,
  WEAVE_FOOD_MAX_CARTON_ORDER,
  WEAVE_FOOD_MIN_CARTON_ORDER,
  formatWeaveFoodCartonQuantity,
  getWeaveFoodVariantEconomics,
  isValidWeaveFoodCartonQuantity,
} from '@/lib/weave-food-economics'

type StockOrder = {
  id:string
  variant_id:string
  box_count:number|string
  package_count:number
  total_ngn:number|string
  payment_status:string
  fulfillment_status:string
  payment_reference:string
  opay_account_number:string
  created_at:string
}

type PaymentPanel = {
  orderId:string
  productName:string
  cartonText:string
  amount:number
  accountNumber:string
  reference:string
}

const money=(value:number|string)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(value||0))
const productName=(id:string)=>ELECTROLYTE_VARIANTS.find(item=>item.id===id)?.name||id

export default function ElectrolyteHomePage(){
  const {user,token}=useAuth()
  const isAgent=user?.role==='agent'
  const [address,setAddress]=useState('')
  const [phone,setPhone]=useState('')
  const [quantity,setQuantity]=useState<Record<string,number>>(()=>Object.fromEntries(ELECTROLYTE_VARIANTS.map(item=>[item.id,0.5])))
  const [orders,setOrders]=useState<StockOrder[]>([])
  const [proof,setProof]=useState<Record<string,string>>({})
  const [working,setWorking]=useState<string|null>(null)
  const [message,setMessage]=useState('')
  const [lastOrder,setLastOrder]=useState<PaymentPanel|null>(null)
  const paymentPanel=useRef<HTMLElement>(null)

  useEffect(()=>{
    try{
      setAddress(localStorage.getItem('weave:agent-receiving-address')||'')
      setPhone(localStorage.getItem('weave:agent-receiving-phone')||'')
    }catch{}
  },[])

  useEffect(()=>{if(lastOrder)paymentPanel.current?.scrollIntoView({behavior:'smooth',block:'center'})},[lastOrder])

  const load=async()=>{
    if(!token||!isAgent)return
    try{
      const response=await fetch('/api/electrolyte/stock',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
      const body=await response.json().catch(()=>({}))
      if(!response.ok||!body.success)throw new Error(body.error||'Unable to load Electrolyte')
      setOrders(body.orders||[])
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to load Electrolyte')}
  }
  useEffect(()=>{void load()},[token,isAgent])

  const receivedUnits=useMemo(()=>orders.filter(order=>order.fulfillment_status==='received').reduce((sum,order)=>sum+Number(order.package_count||0),0),[orders])
  const activeOrders=useMemo(()=>orders.filter(order=>!['received'].includes(order.fulfillment_status)).length,[orders])

  const orderProduct=async(product:WeaveFoodVariant)=>{
    if(!token)return
    const boxCount=Number(quantity[product.id]??0.5)
    if(!isValidWeaveFoodCartonQuantity(boxCount)){setMessage('Choose ½ carton or full-carton steps only.');return}
    if(address.trim().length<5||phone.replace(/\D/g,'').length<7){setMessage('Enter your receiving location and reachable phone number before ordering.');return}
    try{
      localStorage.setItem('weave:agent-receiving-address',address.trim())
      localStorage.setItem('weave:agent-receiving-phone',phone.trim())
    }catch{}
    setWorking(`order:${product.id}`);setMessage('');setLastOrder(null)
    try{
      const response=await fetch('/api/electrolyte/stock',{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body:JSON.stringify({variantId:product.id,boxCount,deliveryAddress:address.trim(),deliveryPhone:phone.trim(),note:'Agent Electrolyte restock'}),
      })
      const body=await response.json().catch(()=>({}))
      if(!response.ok||!body.success)throw new Error(body.error||'Unable to create Electrolyte order')
      const next={
        orderId:String(body.order?.id||''),productName:String(body.product?.name||product.name),
        cartonText:String(body.economics?.cartonDescription||formatWeaveFoodCartonQuantity(boxCount)),
        amount:Number(body.payment?.amountNgn||0),accountNumber:String(body.payment?.accountNumber||''),reference:String(body.payment?.reference||''),
      }
      setLastOrder(next)
      setMessage(`${next.productName} restock created. Existing inventory does not block this order. Pay WEAVE, then send the payment proof for Administration verification.`)
      await load()
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to create Electrolyte order')}
    finally{setWorking(null)}
  }

  const submitProof=async(order:StockOrder)=>{
    if(!token)return
    const receipt=String(proof[order.id]||'').trim()
    if(receipt.length<5){setMessage('Enter the OPay transaction reference or receipt.');return}
    setWorking(`proof:${order.id}`)
    try{
      const response=await fetch('/api/electrolyte/payment/opay/receipt',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({orderId:order.id,receipt})})
      const body=await response.json().catch(()=>({}))
      if(!response.ok||!body.success)throw new Error(body.error||'Unable to send proof')
      setProof(current=>({...current,[order.id]:''}));setMessage(body.message||'Payment proof sent to Administration.');await load()
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to send proof')}
    finally{setWorking(null)}
  }

  const confirmReceipt=async(orderId:string)=>{
    if(!token)return
    setWorking(`receive:${orderId}`)
    try{
      const response=await fetch('/api/electrolyte/receive',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({orderId})})
      const body=await response.json().catch(()=>({}))
      if(!response.ok||!body.success)throw new Error(body.error||'Unable to confirm receipt')
      setMessage('Electrolyte received. The new stock can now move through outlets and Carrier. You can restock again at any time.');await load()
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to confirm receipt')}
    finally{setWorking(null)}
  }

  if(!user)return <main className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-emerald-300"/></main>
  if(!isAgent)return <main className="p-8 text-sm text-slate-300">Agent account required.</main>

  return <main className="mx-auto max-w-7xl space-y-7 pb-20 text-white" data-electrolyte-home="independent">
    <section className="overflow-hidden rounded-[2rem] border border-emerald-300/20 bg-gradient-to-br from-emerald-500/10 via-slate-950 to-lime-500/5">
      <div className="grid gap-0 lg:grid-cols-[1fr_430px]">
        <div className="p-6 md:p-9"><p className="text-[10px] font-black uppercase tracking-[.3em] text-emerald-300">Agent Department · Electrolyte</p><h1 className="mt-2 text-5xl font-black md:text-7xl">ELECTROLYTE</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">Electrolyte is its own WEAVE food ground. Order Small Bowl or Medium Bowl stock, pay WEAVE, move through Administration fresh preparation, receive it, then distribute through your local route or Carrier.</p><div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/[.05] p-4 text-sm text-emerald-50"><strong>Restock is always open.</strong> Having Electrolyte already in inventory does not stop an Agent from ordering more.</div><div className="mt-5 flex flex-wrap gap-2"><Link href="/agent/work"><Button variant="outline" className="border-white/15 text-white">AGENT WORK</Button></Link><Link href="/agent/distribution"><Button variant="outline" className="border-white/15 text-white"><Truck className="mr-2 h-4 w-4"/>DISTRIBUTION ROUTE</Button></Link><Link href="/weave/carrier/food"><Button variant="outline" className="border-white/15 text-white">CARRIER</Button></Link><Button variant="outline" className="border-white/15 text-white" onClick={()=>void load()}><RefreshCcw className="mr-2 h-4 w-4"/>REFRESH</Button></div></div>
        <img src="/weave-food/electrolyte.jpeg" alt="WEAVE Electrolyte" className="h-full min-h-[320px] w-full bg-[#fffaf0] object-contain"/>
      </div>
    </section>

    <section className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Received stock record</p><p className="mt-2 text-3xl font-black">{receivedUnits}</p><p className="text-xs text-slate-500">bowls received across completed Electrolyte orders</p></div><div className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Orders still moving</p><p className="mt-2 text-3xl font-black">{activeOrders}</p><p className="text-xs text-slate-500">payment, preparation or delivery movement</p></div></section>

    <section className="rounded-[1.5rem] border border-white/10 bg-white/[.025] p-5"><p className="text-[10px] font-black uppercase tracking-[.2em] text-slate-500">Receiving point</p><div className="mt-3 grid gap-3 md:grid-cols-2"><Input value={address} onChange={event=>setAddress(event.target.value)} placeholder="Receiving location / address" className="border-white/10 bg-black/25"/><Input value={phone} onChange={event=>setPhone(event.target.value)} placeholder="Receiving phone" className="border-white/10 bg-black/25"/></div></section>

    {message&&<div role="status" className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[.06] px-5 py-4 text-sm leading-6 text-emerald-50">{message}</div>}

    {lastOrder&&<section ref={paymentPanel} className="rounded-[1.6rem] border border-amber-300/25 bg-amber-300/[.05] p-5 md:p-6"><div className="flex items-start gap-3"><CreditCard className="mt-1 h-5 w-5 text-amber-300"/><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">ORDER CREATED · PAY WEAVE</p><h2 className="mt-1 text-2xl font-black">{lastOrder.productName} · {lastOrder.cartonText}</h2><div className="mt-4 grid gap-3 sm:grid-cols-3"><div><span className="text-xs text-slate-500">Amount</span><p className="font-black">{money(lastOrder.amount)}</p></div><div><span className="text-xs text-slate-500">OPay</span><p className="font-black">{lastOrder.accountNumber}</p></div><div><span className="text-xs text-slate-500">Reference</span><p className="break-all font-black">{lastOrder.reference}</p></div></div></div></div></section>}

    <section><div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[.24em] text-emerald-300">Order more Electrolyte</p><h2 className="text-3xl font-black">SMALL OR MEDIUM</h2></div><div className="grid gap-5 md:grid-cols-2">{ELECTROLYTE_VARIANTS.map(product=>{const economics=getWeaveFoodVariantEconomics(product.id);if(!economics)return null;const current=Number(quantity[product.id]??0.5);return <article key={product.id} className="rounded-[1.6rem] border border-white/10 bg-black/25 p-5"><p className="text-[9px] font-black uppercase tracking-[.2em] text-emerald-300">{product.accent}</p><h3 className="mt-1 text-2xl font-black">{product.name}</h3><p className="mt-2 text-xs leading-5 text-slate-400">{product.note}</p><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-white/[.04] p-3"><span className="text-slate-500">WEAVE → Agent / bowl</span><p className="font-black">{money(economics.agentBuyUnitPriceNgn)}</p></div><div className="rounded-xl bg-white/[.04] p-3"><span className="text-slate-500">Agent → Customer</span><p className="font-black">{money(economics.agentSellingUnitPriceNgn)}</p></div><div className="rounded-xl bg-white/[.04] p-3"><span className="text-slate-500">½ carton</span><p className="font-black">{money(economics.agentBoxPriceNgn/2)}</p></div><div className="rounded-xl bg-white/[.04] p-3"><span className="text-slate-500">Full carton</span><p className="font-black">{money(economics.agentBoxPriceNgn)}</p></div></div><div className="mt-4 flex flex-wrap gap-2">{[0.5,1,2,5].map(value=><button key={value} type="button" onClick={()=>setQuantity(currentMap=>({...currentMap,[product.id]:value}))} className={`rounded-full border px-3 py-2 text-[10px] font-black ${current===value?'border-emerald-300 bg-emerald-300/10 text-emerald-100':'border-white/10 text-slate-400'}`}>{formatWeaveFoodCartonQuantity(value)}</button>)}</div><div className="mt-3 flex gap-2"><Input type="number" min={WEAVE_FOOD_MIN_CARTON_ORDER} max={WEAVE_FOOD_MAX_CARTON_ORDER} step={WEAVE_FOOD_CARTON_STEP} value={current} onChange={event=>setQuantity(currentMap=>({...currentMap,[product.id]:Number(event.target.value)}))} className="w-28 border-white/10 bg-black/30 text-center"/><Button className="flex-1 bg-emerald-700 font-black hover:bg-emerald-600" onClick={()=>void orderProduct(product)} disabled={working?.startsWith('order:')}><Boxes className="mr-2 h-4 w-4"/>{working===`order:${product.id}`?'ORDERING…':'ORDER / RESTOCK'}</Button></div></article>})}</div></section>

    <section className="rounded-[1.6rem] border border-white/10 bg-white/[.02] p-5 md:p-6"><p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-300">Electrolyte order movement</p><div className="mt-4 grid gap-2 md:grid-cols-3">{ELECTROLYTE_PROCESS.map((step,index)=><div key={step.stage} className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[9px] font-black uppercase text-emerald-300">{index+1} · {step.stage}</p><p className="mt-2 text-xs leading-5 text-slate-400">{step.detail}</p></div>)}</div></section>

    <section className="rounded-[1.6rem] border border-white/10 bg-white/[.02] p-5 md:p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-300">Your Electrolyte movement</p><h2 className="mt-1 text-2xl font-black">ORDERS & PAYMENT PROOF</h2></div><PackageCheck className="h-6 w-6 text-violet-300"/></div><div className="mt-5 space-y-3">{orders.length?orders.map(order=><article key={order.id} className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black">{productName(order.variant_id)} · {formatWeaveFoodCartonQuantity(Number(order.box_count))}</p><p className="mt-1 text-xs text-slate-500">{order.package_count} bowls · {order.payment_status} · {order.fulfillment_status}</p><p className="mt-1 break-all text-[10px] text-slate-600">{order.payment_reference}</p></div><p className="font-black">{money(order.total_ngn)}</p></div>{['pending','rejected'].includes(order.payment_status)&&<div className="mt-3 flex flex-col gap-2 sm:flex-row"><Input value={proof[order.id]||''} onChange={event=>setProof(current=>({...current,[order.id]:event.target.value}))} placeholder="OPay transaction reference / receipt" className="border-white/10 bg-black/25"/><Button onClick={()=>void submitProof(order)} disabled={working===`proof:${order.id}`}><CreditCard className="mr-2 h-4 w-4"/>SEND PROOF</Button></div>}{order.fulfillment_status==='delivered'&&<Button className="mt-3" onClick={()=>void confirmReceipt(order.id)} disabled={working===`receive:${order.id}`}><CheckCircle2 className="mr-2 h-4 w-4"/>CONFIRM RECEIVED</Button>}</article>):<p className="text-sm text-slate-500">No Electrolyte order yet.</p>}</div></section>
  </main>
}
