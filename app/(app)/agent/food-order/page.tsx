'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Boxes, CheckCircle2, CreditCard, Loader2, PackageCheck, RefreshCcw, Truck } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AGILITY_PRODUCT_VARIANTS, type AgilityVariant } from '@/lib/agility-catalog'
import {
  WEAVE_FOOD_CARTON_STEP,
  WEAVE_FOOD_MAX_CARTON_ORDER,
  WEAVE_FOOD_MIN_CARTON_ORDER,
  formatWeaveFoodCartonQuantity,
  getWeaveFoodVariantEconomics,
  isValidWeaveFoodCartonQuantity,
} from '@/lib/weave-food-economics'

type StockOrder={id:string;variant_id:string;box_count:number|string;package_count:number;total_ngn:number|string;payment_status:string;fulfillment_status:string;payment_reference:string;opay_account_number:string;created_at:string}
type OrderResult={orderId:string;productName:string;cartonText:string;amount:number;accountNumber:string;reference:string}
const money=(value:number|string)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(value||0))
const productName=(id:string)=>AGILITY_PRODUCT_VARIANTS.find(item=>item.id===id)?.name||id

export default function AgentAgilityOrderPage(){
  const {user,token}=useAuth()
  const isAgent=user?.role==='agent'
  const [address,setAddress]=useState('')
  const [phone,setPhone]=useState('')
  const [quantity,setQuantity]=useState<Record<string,number>>(()=>Object.fromEntries(AGILITY_PRODUCT_VARIANTS.map(item=>[item.id,0.5])))
  const [orders,setOrders]=useState<StockOrder[]>([])
  const [proof,setProof]=useState<Record<string,string>>({})
  const [working,setWorking]=useState<string|null>(null)
  const [message,setMessage]=useState('')
  const [lastOrder,setLastOrder]=useState<OrderResult|null>(null)
  const paymentPanel=useRef<HTMLElement>(null)
  const orderInFlight=useRef(false)

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
      const response=await fetch('/api/agility/stock',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
      const body=await response.json().catch(()=>({}))
      if(!response.ok||!body.success)throw new Error(body.error||'Unable to load Agility orders')
      setOrders(body.orders||[])
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to load Agility orders')}
  }
  useEffect(()=>{void load()},[token,isAgent])

  const orderProduct=async(product:AgilityVariant)=>{
    if(orderInFlight.current||!token)return
    const boxCount=Number(quantity[product.id]??0.5)
    if(!isValidWeaveFoodCartonQuantity(boxCount)){setMessage('Choose ½ carton or full-carton steps only.');return}
    if(address.trim().length<5||phone.replace(/\D/g,'').length<7){setMessage('Enter your receiving location and reachable phone number before ordering.');return}
    try{
      localStorage.setItem('weave:agent-receiving-address',address.trim())
      localStorage.setItem('weave:agent-receiving-phone',phone.trim())
    }catch{}
    orderInFlight.current=true;setWorking(`order:${product.id}`);setMessage('');setLastOrder(null)
    try{
      const response=await fetchWithTimeout('/api/agility/stock',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({variantId:product.id,boxCount,distributionMode:'wholesaler',deliveryAddress:address.trim(),deliveryPhone:phone.trim(),note:'Agent Agility stock order'})})
      const body=await response.json().catch(()=>({}))
      if(!response.ok||!body.success)throw new Error(body.error||'WEAVE could not create this Agility order')
      const next={orderId:String(body.order?.id||''),productName:String(body.product?.name||product.name),cartonText:String(body.economics?.cartonDescription||formatWeaveFoodCartonQuantity(boxCount)),amount:Number(body.payment?.amountNgn||0),accountNumber:String(body.payment?.accountNumber||''),reference:String(body.payment?.reference||'')}
      setLastOrder(next);setMessage(`${next.productName} order created. Pay WEAVE, then send the payment reference for Administration verification.`);await load()
    }catch(error){setMessage(error instanceof Error?error.message:'WEAVE could not create this Agility order')}
    finally{orderInFlight.current=false;setWorking(null)}
  }

  const submitProof=async(order:StockOrder)=>{
    if(!token)return
    const receipt=String(proof[order.id]||'').trim();if(receipt.length<5){setMessage('Enter the OPay transaction reference or receipt.');return}
    setWorking(`proof:${order.id}`)
    try{
      const response=await fetch('/api/agility/payment/opay/receipt',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({orderId:order.id,receipt})})
      const body=await response.json().catch(()=>({}));if(!response.ok||!body.success)throw new Error(body.error||'Payment proof could not be submitted')
      setProof(current=>({...current,[order.id]:''}));setMessage(body.message||'Payment proof sent.');await load()
    }catch(error){setMessage(error instanceof Error?error.message:'Payment proof could not be submitted')}
    finally{setWorking(null)}
  }

  const confirmReceipt=async(orderId:string)=>{
    if(!token)return
    setWorking(`receive:${orderId}`)
    try{
      const response=await fetch('/api/agility/receive',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({orderId})})
      const body=await response.json().catch(()=>({}));if(!response.ok||!body.success)throw new Error(body.error||'Receipt confirmation failed')
      setMessage('Agility stock received. It is now available for outlets and Carrier.');await load()
    }catch(error){setMessage(error instanceof Error?error.message:'Receipt confirmation failed')}
    finally{setWorking(null)}
  }

  if(!user)return <main className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-orange-300"/></main>
  if(!isAgent)return <main className="p-8 text-sm text-slate-300">Agent account required.</main>

  return <main className="mx-auto max-w-7xl space-y-7 pb-20 text-white" data-agility-home="independent">
    <section className="rounded-[2rem] border border-orange-300/20 bg-gradient-to-br from-orange-500/10 via-slate-950 to-amber-500/10 p-6 md:p-9"><p className="text-[10px] font-black uppercase tracking-[.3em] text-orange-300">Agent Department · Agility</p><h1 className="mt-2 text-5xl font-black md:text-7xl">AGILITY</h1><p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300 md:text-base">Agility is its own WEAVE food ground. Order Agility cartons from WEAVE, pay through OPay, wait for Administration verification and company fulfillment, then receive and move the stock through your Distribution Route or Carrier.</p><div className="mt-5 flex flex-wrap gap-2"><Link href="/agent/distribution"><Button variant="outline" className="border-white/15 text-white"><Truck className="mr-2 h-4 w-4"/>DISTRIBUTION ROUTE</Button></Link><Link href="/agent/work"><Button variant="outline" className="border-white/15 text-white">AGENT WORK</Button></Link><Button variant="outline" className="border-white/15 text-white" onClick={()=>void load()}><RefreshCcw className="mr-2 h-4 w-4"/>REFRESH</Button></div></section>

    <section className="rounded-[1.5rem] border border-white/10 bg-white/[.025] p-5"><p className="text-[10px] font-black uppercase tracking-[.2em] text-slate-500">Where WEAVE sends your Agility stock</p><div className="mt-3 grid gap-3 md:grid-cols-2"><Input value={address} onChange={event=>setAddress(event.target.value)} placeholder="Receiving location / address" className="border-white/10 bg-black/25"/><Input value={phone} onChange={event=>setPhone(event.target.value)} placeholder="Receiving phone" className="border-white/10 bg-black/25"/></div></section>
    {message&&<div role="status" className="rounded-2xl border border-orange-300/20 bg-orange-300/[.06] px-5 py-4 text-sm leading-6 text-orange-50">{message}</div>}
    {lastOrder&&<section ref={paymentPanel} className="rounded-[1.6rem] border border-amber-300/25 bg-amber-300/[.05] p-5 md:p-6"><div className="flex items-start gap-3"><CreditCard className="mt-1 h-5 w-5 text-amber-300"/><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">ORDER CREATED · PAY WEAVE</p><h2 className="mt-1 text-2xl font-black">{lastOrder.productName} · {lastOrder.cartonText}</h2><div className="mt-4 grid gap-3 sm:grid-cols-3"><div><span className="text-xs text-slate-500">Amount</span><p className="font-black">{money(lastOrder.amount)}</p></div><div><span className="text-xs text-slate-500">OPay</span><p className="font-black">{lastOrder.accountNumber}</p></div><div><span className="text-xs text-slate-500">Reference</span><p className="break-all font-black">{lastOrder.reference}</p></div></div></div></div></section>}

    <section><div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[.24em] text-orange-300">Order Agility</p><h2 className="text-3xl font-black">CHOOSE PREPARATION</h2></div><div className="grid gap-5 md:grid-cols-2">{AGILITY_PRODUCT_VARIANTS.map(product=>{const economics=getWeaveFoodVariantEconomics(product.id);if(!economics)return null;const current=Number(quantity[product.id]??0.5);return <article key={product.id} className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-black/25"><img src="/weave-food/agility.jpeg" alt="WEAVE Agility" className="h-72 w-full bg-[#fffaf0] object-contain"/><div className="p-5"><p className="text-[9px] font-black uppercase tracking-[.2em] text-orange-300">{product.accent}</p><h3 className="mt-1 text-xl font-black">{product.name}</h3><p className="mt-2 text-xs leading-5 text-slate-400">{product.note}</p><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-white/[.04] p-3"><span className="text-slate-500">½ carton</span><p className="font-black">{money(economics.agentBoxPriceNgn/2)}</p></div><div className="rounded-xl bg-white/[.04] p-3"><span className="text-slate-500">Full carton</span><p className="font-black">{money(economics.agentBoxPriceNgn)}</p></div></div><div className="mt-4 flex flex-wrap gap-2">{[0.5,1,2,5].map(value=><button key={value} type="button" onClick={()=>setQuantity(currentMap=>({...currentMap,[product.id]:value}))} className={`rounded-full border px-3 py-2 text-[10px] font-black ${current===value?'border-orange-300 bg-orange-300/10 text-orange-100':'border-white/10 text-slate-400'}`}>{formatWeaveFoodCartonQuantity(value)}</button>)}</div><div className="mt-3 flex gap-2"><Input type="number" min={WEAVE_FOOD_MIN_CARTON_ORDER} max={WEAVE_FOOD_MAX_CARTON_ORDER} step={WEAVE_FOOD_CARTON_STEP} value={current} onChange={event=>setQuantity(currentMap=>({...currentMap,[product.id]:Number(event.target.value)}))} className="w-28 border-white/10 bg-black/30 text-center"/><Button className="flex-1 font-black" onClick={()=>void orderProduct(product)} disabled={working?.startsWith('order:')}><Boxes className="mr-2 h-4 w-4"/>{working===`order:${product.id}`?'ORDERING…':'ORDER FROM WEAVE'}</Button></div></div></article>})}</div></section>

    <section className="rounded-[1.6rem] border border-white/10 bg-white/[.02] p-5 md:p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-300">Your Agility movement</p><h2 className="mt-1 text-2xl font-black">ORDERS & PAYMENT PROOF</h2></div><PackageCheck className="h-6 w-6 text-violet-300"/></div><div className="mt-5 space-y-3">{orders.length?orders.map(order=><article key={order.id} className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black">{productName(order.variant_id)} · {formatWeaveFoodCartonQuantity(Number(order.box_count))}</p><p className="mt-1 text-xs text-slate-500">{order.package_count} packages · {order.payment_status} · {order.fulfillment_status}</p><p className="mt-1 break-all text-[10px] text-slate-600">{order.payment_reference}</p></div><p className="font-black">{money(order.total_ngn)}</p></div>{['pending','rejected'].includes(order.payment_status)&&<div className="mt-3 flex flex-col gap-2 sm:flex-row"><Input value={proof[order.id]||''} onChange={event=>setProof(current=>({...current,[order.id]:event.target.value}))} placeholder="OPay transaction reference / receipt" className="border-white/10 bg-black/25"/><Button onClick={()=>void submitProof(order)} disabled={working===`proof:${order.id}`}><CreditCard className="mr-2 h-4 w-4"/>SEND PROOF</Button></div>}{order.fulfillment_status==='delivered'&&<Button className="mt-3" onClick={()=>void confirmReceipt(order.id)} disabled={working===`receive:${order.id}`}><CheckCircle2 className="mr-2 h-4 w-4"/>CONFIRM RECEIVED</Button>}</article>):<p className="text-sm text-slate-500">No Agility order yet.</p>}</div></section>
  </main>
}
