'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Boxes, CheckCircle2, CreditCard, Loader2, PackageCheck, RefreshCcw, Truck } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AGILITY_VARIANTS, type AgilityVariant } from '@/lib/agility-catalog'
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

type OrderResult = {
  orderId:string
  productName:string
  cartonText:string
  amount:number
  accountNumber:string
  reference:string
}

const money=(value:number|string)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(value||0))
const productName=(id:string)=>AGILITY_VARIANTS.find(item=>item.id===id)?.name||id

export default function AgentFoodOrderPage(){
  const {user,token}=useAuth()
  const isAgent=user?.role==='agent'
  const [address,setAddress]=useState('')
  const [phone,setPhone]=useState('')
  const [quantity,setQuantity]=useState<Record<string,number>>(()=>Object.fromEntries(AGILITY_VARIANTS.map(item=>[item.id,0.5])))
  const [orders,setOrders]=useState<StockOrder[]>([])
  const [proof,setProof]=useState<Record<string,string>>({})
  const [working,setWorking]=useState<string|null>(null)
  const [message,setMessage]=useState('')
  const [lastOrder,setLastOrder]=useState<OrderResult|null>(null)
  const [orderFeedback,setOrderFeedback]=useState<{productId:string;text:string}|null>(null)
  const addressInput=useRef<HTMLInputElement>(null)
  const phoneInput=useRef<HTMLInputElement>(null)
  const paymentPanel=useRef<HTMLElement>(null)
  const orderInFlight=useRef(false)

  useEffect(()=>{
    if(lastOrder){
      paymentPanel.current?.scrollIntoView({behavior:'smooth',block:'center'})
      paymentPanel.current?.focus({preventScroll:true})
    }
  },[lastOrder])

  const agility=useMemo(()=>AGILITY_VARIANTS.filter(item=>!item.id.startsWith('electrolyte')),[ ])
  const electrolyte=useMemo(()=>AGILITY_VARIANTS.filter(item=>item.id.startsWith('electrolyte')),[ ])

  useEffect(()=>{
    if(typeof window==='undefined')return
    try{
      setAddress(localStorage.getItem('weave:agent-receiving-address')||'')
      setPhone(localStorage.getItem('weave:agent-receiving-phone')||'')
    }catch{/* Receiving details remain editable when storage is unavailable. */}
  },[])

  const load=async()=>{
    if(!token||!isAgent)return
    try{
      const response=await fetch('/api/agility/stock',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
      const body=await response.json().catch(()=>({}))
      if(!response.ok||!body.success)throw new Error(body.error||'Unable to load food orders')
      setOrders(body.orders||[])
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to load food orders')}
  }

  useEffect(()=>{void load()},[token,isAgent])

  const setPreset=(productId:string,value:number)=>setQuantity(current=>({...current,[productId]:value}))

  const orderProduct=async(product:AgilityVariant)=>{
    if(orderInFlight.current)return
    const feedback=(text:string)=>{setOrderFeedback({productId:product.id,text});setMessage(text)}
    if(!token){feedback('Your session is unavailable. Sign in again to order food.');return}
    const boxCount=Number(quantity[product.id]??0.5)
    if(!isValidWeaveFoodCartonQuantity(boxCount)){
      feedback('Choose ½ carton or full-carton steps only. Agents cannot order individual pieces from WEAVE.')
      return
    }
    if(address.trim().length<5||phone.replace(/\D/g,'').length<7){
      feedback('Enter your receiving location and reachable phone number before ordering.')
      const field=address.trim().length<5?addressInput.current:phoneInput.current
      field?.scrollIntoView({behavior:'smooth',block:'center'})
      field?.focus({preventScroll:true})
      return
    }

    try{
      localStorage.setItem('weave:agent-receiving-address',address.trim())
      localStorage.setItem('weave:agent-receiving-phone',phone.trim())
    }catch{/* Saving delivery details is optional; it must not prevent an order. */}
    orderInFlight.current=true
    setOrderFeedback(null)
    setWorking(`order:${product.id}`);setMessage('');setLastOrder(null)
    try{
      const response=await fetchWithTimeout('/api/agility/stock',{
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body:JSON.stringify({
          variantId:product.id,
          boxCount,
          distributionMode:'wholesaler',
          deliveryAddress:address.trim(),
          deliveryPhone:phone.trim(),
          note:'Agent WEAVE Food stock order',
        }),
      })
      const body=await response.json().catch(()=>({}))
      if(!response.ok||!body.success)throw new Error(body.error||'WEAVE could not create this food order')
      const next:OrderResult={
        orderId:String(body.order?.id||''),
        productName:String(body.product?.name||product.name),
        cartonText:String(body.economics?.cartonDescription||formatWeaveFoodCartonQuantity(boxCount)),
        amount:Number(body.payment?.amountNgn||0),
        accountNumber:String(body.payment?.accountNumber||''),
        reference:String(body.payment?.reference||''),
      }
      setLastOrder(next)
      setOrderFeedback({productId:product.id,text:`Order created. Reference: ${next.reference}. Payment details are shown above.`})
      setMessage(`${next.productName} order created. Pay WEAVE first, then send the payment reference for Administration verification.`)
      await load()
    }catch(error){feedback(error instanceof Error?error.message:'WEAVE could not create this food order')}
    finally{orderInFlight.current=false;setWorking(null)}
  }

  const submitProof=async(order:StockOrder)=>{
    if(!token)return
    const receipt=String(proof[order.id]||'').trim()
    if(receipt.length<4){setMessage('Enter the OPay transaction reference or receipt for this order.');return}
    setWorking(`proof:${order.id}`);setMessage('')
    try{
      const response=await fetch('/api/agility/payment/opay/receipt',{
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body:JSON.stringify({orderId:order.id,receipt}),
      })
      const body=await response.json().catch(()=>({}))
      if(!response.ok||!body.success)throw new Error(body.error||'Payment proof could not be submitted')
      setProof(current=>({...current,[order.id]:''}))
      setMessage('Payment proof sent. Administration must verify it before preparation begins.')
      await load()
    }catch(error){setMessage(error instanceof Error?error.message:'Payment proof could not be submitted')}
    finally{setWorking(null)}
  }

  const confirmReceipt=async(orderId:string)=>{
    if(!token)return
    setWorking(`receive:${orderId}`);setMessage('')
    try{
      const response=await fetch('/api/agility/receive',{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({orderId}),
      })
      const body=await response.json().catch(()=>({}))
      if(!response.ok||!body.success)throw new Error(body.error||'Receipt confirmation failed')
      setMessage('Stock received. It is now available for your outlets and Carrier Door.')
      await load()
    }catch(error){setMessage(error instanceof Error?error.message:'Receipt confirmation failed')}
    finally{setWorking(null)}
  }

  if(!user)return <main className="flex min-h-[60vh] items-center justify-center text-white"><Loader2 className="h-7 w-7 animate-spin"/></main>
  if(!isAgent)return <main className="p-8 text-sm text-slate-300">Agent account required.</main>

  const renderFoodCard=(product:AgilityVariant)=>{
    const economics=getWeaveFoodVariantEconomics(product.id)
    if(!economics)return null
    const current=Number(quantity[product.id]??0.5)
    const preview=product.id.startsWith('electrolyte')?'/weave-food/electrolyte.jpeg':'/weave-food/agility.jpeg'
    return <article key={product.id} className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-black/25">
      <a href={preview} target="_blank" rel="noopener noreferrer" aria-label={`Open ${product.id.startsWith('electrolyte')?'Electrolyte':'Agility'} product image`}><img src={preview} alt={`WEAVE ${product.id.startsWith('electrolyte')?'Electrolyte':'Agility'} product image`} className="h-80 w-full bg-[#fffaf0] object-contain" loading="lazy"/></a>
      <div className="p-5">
        <p className="text-[9px] font-black uppercase tracking-[.2em] text-slate-500">{product.accent}</p>
        <h3 className="mt-1 text-xl font-black">{product.name}</h3>
        <p className="mt-2 text-xs leading-5 text-slate-400">{product.note}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-white/[.04] p-3"><span className="text-slate-500">½ carton</span><p className="font-black">{money(economics.agentBoxPriceNgn/2)}</p></div>
          <div className="rounded-xl bg-white/[.04] p-3"><span className="text-slate-500">Full carton</span><p className="font-black">{money(economics.agentBoxPriceNgn)}</p></div>
          <div className="rounded-xl bg-white/[.04] p-3"><span className="text-slate-500">½ carton units</span><p className="font-black">{economics.packagesPerBox/2}</p></div>
          <div className="rounded-xl bg-white/[.04] p-3"><span className="text-slate-500">Full carton units</span><p className="font-black">{economics.packagesPerBox}</p></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[0.5,1,2,5].map(value=><button key={value} type="button" onClick={()=>setPreset(product.id,value)} className={`rounded-full border px-3 py-2 text-[10px] font-black ${current===value?'border-cyan-300 bg-cyan-300/10 text-cyan-100':'border-white/10 text-slate-400'}`}>{formatWeaveFoodCartonQuantity(value)}</button>)}
        </div>
        <div className="mt-3 flex gap-2">
          <Input aria-label={`${product.name} carton quantity`} type="number" min={WEAVE_FOOD_MIN_CARTON_ORDER} max={WEAVE_FOOD_MAX_CARTON_ORDER} step={WEAVE_FOOD_CARTON_STEP} value={current} onChange={event=>setQuantity(value=>({...value,[product.id]:Number(event.target.value)}))} className="w-28 border-white/10 bg-black/30 text-center"/>
          <Button type="button" className="flex-1 font-black" onClick={()=>void orderProduct(product)} disabled={working?.startsWith('order:')}><Boxes className="mr-2 h-4 w-4"/>{working===`order:${product.id}`?'ORDERING…':'ORDER FROM WEAVE'}</Button>
        </div>
        {orderFeedback?.productId===product.id&&<p role="alert" className="mt-3 text-sm leading-6 text-amber-200">{orderFeedback.text}</p>}
        <p className="mt-2 text-[9px] uppercase tracking-[.12em] text-slate-600">½ · 1 · 1½ · 2 · 2½ … cartons only · no pieces</p>
      </div>
    </article>
  }

  return <main className="mx-auto max-w-7xl space-y-7 pb-20 text-white">
    <section className="rounded-[2rem] border border-cyan-300/20 bg-gradient-to-br from-cyan-500/10 via-slate-950 to-emerald-500/10 p-6 md:p-9">
      <p className="text-[10px] font-black uppercase tracking-[.3em] text-cyan-300">Agent Department · WEAVE Food Stock</p>
      <h1 className="mt-2 text-4xl font-black md:text-6xl">ORDER FOOD FROM WEAVE</h1>
      <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300 md:text-base">This is the company stock desk. Order Agility or Electrolyte directly from WEAVE in half-carton or full-carton steps. Pay WEAVE, wait for Administration verification and fulfillment, then receive the stock before selling through outlets or Carrier.</p>
      <div className="mt-5 flex flex-wrap gap-2"><Link href="/agent/distribution"><Button variant="outline" className="border-white/15 text-white"><Truck className="mr-2 h-4 w-4"/>OPEN DISTRIBUTION ROUTE</Button></Link><Button variant="outline" className="border-white/15 text-white" onClick={()=>void load()}><RefreshCcw className="mr-2 h-4 w-4"/>REFRESH ORDERS</Button></div>
    </section>

    <section className="rounded-[1.5rem] border border-white/10 bg-white/[.025] p-5">
      <p className="text-[10px] font-black uppercase tracking-[.2em] text-slate-500">Where WEAVE sends your stock</p>
      <p className="mt-2 text-xs text-slate-400">Enter both delivery details before choosing a food order.</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2"><Input ref={addressInput} aria-label="Receiving location / address" required value={address} onChange={event=>setAddress(event.target.value)} placeholder="Receiving location / address" className="border-white/10 bg-black/25"/><Input ref={phoneInput} aria-label="Receiving phone" required type="tel" value={phone} onChange={event=>setPhone(event.target.value)} placeholder="Receiving phone" className="border-white/10 bg-black/25"/></div>
    </section>

    {message&&<div role="status" className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[.06] px-5 py-4 text-sm leading-6 text-cyan-50">{message}</div>}

    {lastOrder&&<section ref={paymentPanel} tabIndex={-1} aria-label="Food order payment details" className="rounded-[1.6rem] border border-amber-300/25 bg-amber-300/[.05] p-5 md:p-6">
      <div className="flex items-start gap-3"><CreditCard className="mt-1 h-5 w-5 text-amber-300"/><div className="flex-1"><p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">ORDER CREATED · PAY WEAVE</p><h2 className="mt-1 text-2xl font-black">{lastOrder.productName} · {lastOrder.cartonText}</h2><div className="mt-4 grid gap-3 sm:grid-cols-3"><div><span className="text-xs text-slate-500">Amount</span><p className="font-black">{money(lastOrder.amount)}</p></div><div><span className="text-xs text-slate-500">OPay account</span><p className="font-black">{lastOrder.accountNumber}</p></div><div><span className="text-xs text-slate-500">Order reference</span><p className="break-all font-black">{lastOrder.reference}</p></div></div></div></div>
    </section>}

    <section>
      <div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[.24em] text-orange-300">Food family 01</p><h2 className="text-3xl font-black">AGILITY</h2><p className="mt-1 text-sm text-slate-500">Choose the Agility preparation you want WEAVE to fulfill.</p></div>
      <div className="grid gap-5 md:grid-cols-2">{agility.map(renderFoodCard)}</div>
    </section>

    <section>
      <div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[.24em] text-emerald-300">Food family 02</p><h2 className="text-3xl font-black">ELECTROLYTE</h2><p className="mt-1 text-sm text-slate-500">Small and Medium Bowl are separate WEAVE stock products with their own carton economics.</p></div>
      <div className="grid gap-5 md:grid-cols-2">{electrolyte.map(renderFoodCard)}</div>
    </section>

    <section className="rounded-[1.6rem] border border-white/10 bg-white/[.02] p-5 md:p-6">
      <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-300">Your WEAVE Food movement</p><h2 className="mt-1 text-2xl font-black">ORDERS & PAYMENT PROOF</h2></div><PackageCheck className="h-6 w-6 text-violet-300"/></div>
      <div className="mt-5 space-y-3">{orders.length?orders.map(order=><article key={order.id} className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black">{productName(order.variant_id)} · {formatWeaveFoodCartonQuantity(Number(order.box_count))}</p><p className="mt-1 text-xs text-slate-500">{order.package_count} units · {order.payment_status} · {order.fulfillment_status}</p><p className="mt-1 break-all text-[10px] text-slate-600">{order.payment_reference}</p></div><p className="font-black">{money(order.total_ngn)}</p></div>{order.payment_status==='pending'&&<div className="mt-3 flex flex-col gap-2 sm:flex-row"><Input value={proof[order.id]||''} onChange={event=>setProof(current=>({...current,[order.id]:event.target.value}))} placeholder="OPay transaction reference / receipt" className="border-white/10 bg-black/25"/><Button onClick={()=>void submitProof(order)} disabled={working===`proof:${order.id}`}><CreditCard className="mr-2 h-4 w-4"/>SEND PROOF</Button></div>}{order.fulfillment_status==='delivered'&&<Button className="mt-3" onClick={()=>void confirmReceipt(order.id)} disabled={working===`receive:${order.id}`}><CheckCircle2 className="mr-2 h-4 w-4"/>CONFIRM RECEIVED</Button>}</article>):<p className="text-sm text-slate-500">No WEAVE Food order yet.</p>}</div>
    </section>
  </main>
}
