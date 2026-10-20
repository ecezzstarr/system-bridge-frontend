'use client'
import { AgentFoodPricingInfo } from '@/components/weave-food/food-program-info'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AGILITY_PACKAGES_PER_BOX, AGILITY_VARIANTS, type AgilityVariant } from '@/lib/agility-catalog'
import {
  formatWeaveFoodCartonQuantity,
  getWeaveFoodVariantEconomics,
  isValidWeaveFoodCartonQuantity,
  WEAVE_FOOD_CARTON_STEP,
  WEAVE_FOOD_MAX_CARTON_ORDER,
  WEAVE_FOOD_MIN_CARTON_ORDER,
} from '@/lib/weave-food-economics'
import { Boxes, CheckCircle2, HandCoins, MapPin, PackageCheck, RefreshCcw, Route, Store, Truck } from 'lucide-react'

type StockOrder={id:string;variant_id:string;box_count:number;package_count:number;packages_per_box:number;total_ngn:number|string;payment_status:string;fulfillment_status:string;payment_reference:string;opay_account_number:string;delivery_address?:string|null;delivery_phone?:string|null;created_at:string}
type Outlet={id:string;name:string;contact_name?:string|null;phone?:string|null;address:string}
type AvailableStock=StockOrder&{direct_sold_packages:number;allocated_packages:number;carrier_reserved_packages:number;available_packages:number;agent_unit_cost_ngn:number|string;retail_unit_price_ngn:number|string}
type Placement={id:string;outlet_id:string;outlet_name:string;outlet_address:string;outlet_phone?:string|null;order_id:string;variant_id:string;carton_count:number|string;package_count:number;supply_mode:'paid_now'|'pay_after_sale';agreed_amount_ngn:number|string;packages_reported_sold:number;amount_collected_ngn:number|string;outstanding_ngn:number|string;agent_cost_basis_ngn:number|string;expected_agent_margin_ngn:number|string;outlet_margin_at_weave_retail_ngn:number|string;status:string;supplied_at:string}
type DistributionData={outlets:Outlet[];placements:Placement[];stock:AvailableStock[];summary:{packages_still_with_outlets:number;outstanding_ngn:number|string;collected_today_ngn:number|string;outlet_count:number;carrier_reserved_packages:number}}

type PlacementForm={outletId:string;cartonCount:number;supplyMode:'paid_now'|'pay_after_sale';agreedAmount:string}
const money=(value:number|string)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(value||0))
const productName=(id:string)=>AGILITY_VARIANTS.find(v=>v.id===id)?.name||id
const freeCartonSteps=(stock:AvailableStock)=>Math.floor((Number(stock.available_packages||0)/Math.max(1,Number(stock.packages_per_box||AGILITY_PACKAGES_PER_BOX)))*2)/2

export default function AgentDistributionPage(){
  const {user,token}=useAuth()
  const isAgent=user?.role==='agent'
  const [data,setData]=useState<DistributionData>({outlets:[],placements:[],stock:[],summary:{packages_still_with_outlets:0,outstanding_ngn:0,collected_today_ngn:0,outlet_count:0,carrier_reserved_packages:0}})
  const [orders,setOrders]=useState<StockOrder[]>([])
  const [message,setMessage]=useState('')
  const [working,setWorking]=useState<string|null>(null)
  const [receivingAddress,setReceivingAddress]=useState('')
  const [receivingPhone,setReceivingPhone]=useState('')
  const [cartons,setCartons]=useState<Record<string,number>>(()=>Object.fromEntries(AGILITY_VARIANTS.map(v=>[v.id,5])))
  const [proof,setProof]=useState<Record<string,string>>({})
  const [outletName,setOutletName]=useState('')
  const [outletContact,setOutletContact]=useState('')
  const [outletPhone,setOutletPhone]=useState('')
  const [outletAddress,setOutletAddress]=useState('')
  const [placementForm,setPlacementForm]=useState<Record<string,PlacementForm>>({})
  const [soldReport,setSoldReport]=useState<Record<string,string>>({})
  const [collection,setCollection]=useState<Record<string,string>>({})
  const [orderFeedback,setOrderFeedback]=useState<{productId:string;text:string}|null>(null)
  const addressInput=useRef<HTMLInputElement>(null)
  const phoneInput=useRef<HTMLInputElement>(null)
  const orderInFlight=useRef(false)

  useEffect(()=>{
    if(typeof window==='undefined')return
    try{
      setReceivingAddress(localStorage.getItem('weave:agent-receiving-address')||'')
      setReceivingPhone(localStorage.getItem('weave:agent-receiving-phone')||'')
    }catch{/* Delivery details can be entered without browser storage. */}
  },[])

  const load=async()=>{
    if(!token||!isAgent)return
    setWorking(current=>current||'load')
    try{
      const [distributionResponse,ordersResponse]=await Promise.all([
        fetch('/api/agent/distribution',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'}),
        fetch('/api/agility/stock',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'}),
      ])
      const distribution=await distributionResponse.json().catch(()=>({}))
      const orderData=await ordersResponse.json().catch(()=>({}))
      if(!distributionResponse.ok||!distribution.success)throw new Error(distribution.error||'Unable to load distribution route')
      setData(distribution)
      if(ordersResponse.ok&&orderData.success){
        setOrders(orderData.orders||[])
      }else if(orderData.error){
        setMessage(String(orderData.error))
      }
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to load Agent distribution')}
    finally{setWorking(current=>current==='load'?null:current)}
  }
  useEffect(()=>{void load()},[token,isAgent])

  const buyFromWeave=async(product:AgilityVariant)=>{
    if(orderInFlight.current)return
    const feedback=(text:string)=>{setOrderFeedback({productId:product.id,text});setMessage(text)}
    if(!token){feedback('Your session is unavailable. Sign in again to order food.');return}
    const boxCount=Number(cartons[product.id]??5)
    if(!isValidWeaveFoodCartonQuantity(boxCount)){
      feedback('Agents order WEAVE food only by half carton or full-carton steps: ½, 1, 1½, 2 cartons and upward. Individual pieces cannot be ordered from WEAVE.')
      return
    }
    if(receivingAddress.trim().length<5||receivingPhone.replace(/\D/g,'').length<7){
      feedback('Enter where WEAVE should deliver the cartons and your receiving phone number.')
      const field=receivingAddress.trim().length<5?addressInput.current:phoneInput.current
      field?.scrollIntoView({behavior:'smooth',block:'center'})
      field?.focus({preventScroll:true})
      return
    }
    try{
      localStorage.setItem('weave:agent-receiving-address',receivingAddress.trim())
      localStorage.setItem('weave:agent-receiving-phone',receivingPhone.trim())
    }catch{/* Saving delivery details must not block stock ordering. */}
    orderInFlight.current=true
    setOrderFeedback(null)
    setWorking(`buy:${product.id}`);setMessage('')
    try{
      const response=await fetchWithTimeout('/api/agility/stock',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({variantId:product.id,boxCount,distributionMode:'wholesaler',deliveryAddress:receivingAddress,deliveryPhone:receivingPhone,note:'Agent neighborhood distribution stock'})})
      const result=await response.json().catch(()=>({}))
      if(!response.ok||!result.success)throw new Error(result.error||'Unable to order WEAVE stock')
      feedback(`${product.name}: ${formatWeaveFoodCartonQuantity(boxCount)} ordered. Pay ${money(result.payment.amountNgn)} to OPay ${result.payment.accountNumber}. Order reference: ${result.payment.reference}. Submit your payment proof below for Administration verification.`)
      await load()
    }catch(error){feedback(error instanceof Error?error.message:'Unable to order WEAVE stock')}
    finally{orderInFlight.current=false;setWorking(null)}
  }

  const submitProof=async(order:StockOrder)=>{
    if(!token)return
    const receipt=String(proof[order.id]||'').trim()
    if(!receipt){setMessage('Enter the OPay transaction reference or receipt.');return}
    setWorking(`proof:${order.id}`)
    try{
      const response=await fetch('/api/agility/payment/opay/receipt',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({orderId:order.id,receipt})})
      const result=await response.json().catch(()=>({}))
      if(!response.ok||!result.success)throw new Error(result.error||'Unable to submit proof')
      setProof(current=>({...current,[order.id]:''}));setMessage('Payment proof sent to Administration. Preparation begins after verification.');await load()
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to submit proof')}
    finally{setWorking(null)}
  }

  const confirmReceipt=async(orderId:string)=>{
    if(!token)return
    setWorking(`receive:${orderId}`)
    try{
      const response=await fetch('/api/agility/receive',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({orderId})})
      const result=await response.json().catch(()=>({}))
      if(!response.ok||!result.success)throw new Error(result.error||'Unable to confirm receipt')
      setMessage('Cartons received. They are now available for outlets and Carrier.');await load()
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to confirm receipt')}
    finally{setWorking(null)}
  }

  const createOutlet=async()=>{
    if(!token)return
    setWorking('outlet')
    try{
      const response=await fetch('/api/agent/distribution',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action:'create_outlet',name:outletName,contactName:outletContact,phone:outletPhone,address:outletAddress})})
      const result=await response.json().catch(()=>({}))
      if(!response.ok||!result.success)throw new Error(result.error||'Unable to add outlet')
      setOutletName('');setOutletContact('');setOutletPhone('');setOutletAddress('');setMessage(`${result.outlet.name} added to your route.`);await load()
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to add outlet')}
    finally{setWorking(null)}
  }

  const supplyOutlet=async(stock:AvailableStock)=>{
    if(!token)return
    const freeCartons=freeCartonSteps(stock)
    const defaultCartons=freeCartons>=1?1:0.5
    const form=placementForm[stock.id]||{outletId:'',cartonCount:defaultCartons,supplyMode:'pay_after_sale',agreedAmount:''}
    if(!isValidWeaveFoodCartonQuantity(Number(form.cartonCount))||Number(form.cartonCount)>freeCartons){setMessage(`Choose ½ carton or more up to ${formatWeaveFoodCartonQuantity(freeCartons)} available.`);return}
    setWorking(`supply:${stock.id}`)
    try{
      const response=await fetch('/api/agent/distribution',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action:'place_stock',outletId:form.outletId,orderId:stock.id,cartonCount:Number(form.cartonCount),supplyMode:form.supplyMode,agreedAmountNgn:Number(form.agreedAmount)})})
      const result=await response.json().catch(()=>({}))
      if(!response.ok||!result.success)throw new Error(result.error||'Unable to supply outlet')
      setMessage(form.supplyMode==='pay_after_sale'?`${productName(stock.variant_id)} placed with the outlet on pay-after-sale.`:`${productName(stock.variant_id)} supplied and paid immediately.`);await load()
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to supply outlet')}
    finally{setWorking(null)}
  }

  const postAction=async(body:Record<string,unknown>,key:string,successMessage:string)=>{
    if(!token)return
    setWorking(key)
    try{
      const response=await fetch('/api/agent/distribution',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body)})
      const result=await response.json().catch(()=>({}))
      if(!response.ok||!result.success)throw new Error(result.error||'Unable to update distribution movement')
      setMessage(successMessage);await load()
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to update distribution movement')}
    finally{setWorking(null)}
  }

  const cartonsAvailable=useMemo(()=>data.stock.reduce((sum,item)=>sum+(Number(item.available_packages||0)/Number(item.packages_per_box||AGILITY_PACKAGES_PER_BOX)),0),[data.stock])
  const pendingOrders=orders.filter(order=>order.fulfillment_status!=='received')

  if(!user)return null
  if(!isAgent)return <div className="p-8 text-sm text-slate-300">Agent account required.</div>

  return <div className="mx-auto max-w-7xl space-y-7 pb-20 text-white">
    <AgentFoodPricingInfo product="both"/>
    <section className="rounded-[2rem] border border-cyan-300/20 bg-gradient-to-br from-cyan-500/10 via-slate-950 to-emerald-500/10 p-6 md:p-9">
      <p className="text-[10px] font-black uppercase tracking-[.3em] text-cyan-300">Agent Department · Physical Distribution</p><h1 className="mt-2 text-4xl font-black md:text-6xl">AGENT DISTRIBUTION ROUTE</h1><p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300 md:text-base">Buy WEAVE cartons, carry them into existing shops and outlets, collect immediately or place stock on pay-after-sale, and use Carrier to sell directly through your link. The Agent is the distributor — not the store owner.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[['Outlets',String(data.summary.outlet_count),MapPin],['Cartons in hand',String(cartonsAvailable),Boxes],['Packs with outlets',String(data.summary.packages_still_with_outlets||0),Store],['Carrier reserved',String(data.summary.carrier_reserved_packages||0),PackageCheck],['Money outstanding',money(data.summary.outstanding_ngn),HandCoins]].map(([label,value,Icon]:any)=><div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4"><Icon className="h-5 w-5 text-cyan-300"/><p className="mt-3 text-[9px] font-black uppercase tracking-[.16em] text-slate-500">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>)}</div><p className="mt-4 text-xs text-emerald-300">Collected from outlets today: {money(data.summary.collected_today_ngn)}</p>
    </section>

    {message&&<div role="status" className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[.06] px-5 py-4 text-sm leading-6 text-cyan-50">{message}</div>}

    <section className="rounded-[2rem] border border-white/10 bg-white/[.02] p-5 md:p-7">
      <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-orange-300">01 · Buy from WEAVE</p><h2 className="mt-1 text-2xl font-black">Load cartons for your route</h2><p className="mt-2 text-xs text-slate-500">Agent stock is carton-only: order ½ carton or full-carton steps. No individual pieces can be ordered from WEAVE.</p></div><Truck className="h-7 w-7 text-orange-300"/></div>
      <p className="mt-4 text-xs text-slate-400">Enter both delivery details before choosing a food order.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2"><Input ref={addressInput} aria-label="Where WEAVE should deliver your cartons" required value={receivingAddress} onChange={e=>setReceivingAddress(e.target.value)} placeholder="Where WEAVE should deliver your cartons"/><Input ref={phoneInput} aria-label="Receiving phone" required type="tel" value={receivingPhone} onChange={e=>setReceivingPhone(e.target.value)} placeholder="Receiving phone"/></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {AGILITY_VARIANTS.map(product=>{const economics=getWeaveFoodVariantEconomics(product.id);if(!economics)return null;return <article key={product.id} className={`rounded-2xl border p-5 ${product.id.startsWith('ember')?'border-orange-300/20 bg-orange-300/[.04]':product.id.startsWith('electrolyte')?'border-emerald-300/20 bg-emerald-300/[.03]':'border-white/10 bg-black/20'}`}><a href={product.id.startsWith('ember')?'/weave-food/ember.svg':product.id.startsWith('electrolyte')?'/weave-food/electrolyte.jpeg':'/weave-food/agility.jpeg'} target="_blank" rel="noopener noreferrer" aria-label={`Open ${product.id.startsWith('ember')?'Ember':product.id.startsWith('electrolyte')?'Electrolyte':'Agility'} product image`}><img src={product.id.startsWith('ember')?'/weave-food/ember.svg':product.id.startsWith('electrolyte')?'/weave-food/electrolyte.jpeg':'/weave-food/agility.jpeg'} alt={`WEAVE ${product.id.startsWith('ember')?'Ember':product.id.startsWith('electrolyte')?'Electrolyte':'Agility'} product image`} className="mb-4 h-80 w-full rounded-xl bg-[#fffaf0] object-contain" loading="lazy"/></a><p className={`text-[10px] font-black uppercase tracking-[.18em] ${product.id.startsWith('electrolyte')?'text-emerald-300':'text-orange-300'}`}>{product.accent}</p><h3 className="mt-1 text-xl font-black">{product.name}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{product.note}</p><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-white/[.04] p-3"><span className="text-slate-500">½ carton from WEAVE</span><p className="font-black">{money(economics.agentBoxPriceNgn/2)}</p></div><div className="rounded-xl bg-white/[.04] p-3"><span className="text-slate-500">Full carton from WEAVE</span><p className="font-black">{money(economics.agentBoxPriceNgn)}</p></div><div className="rounded-xl bg-white/[.04] p-3"><span className="text-slate-500">Agent → Customer</span><p className="font-black text-emerald-200">{money(economics.agentSellingUnitPriceNgn)} / unit</p></div><div className="rounded-xl bg-white/[.04] p-3"><span className="text-slate-500">Units / carton</span><p className="font-black">{economics.packagesPerBox} · half = {economics.packagesPerBox/2}</p></div></div><div className="mt-4 flex gap-2"><Input aria-label={`${product.name} carton quantity`} className="w-24 text-center" type="number" min={WEAVE_FOOD_MIN_CARTON_ORDER} max={WEAVE_FOOD_MAX_CARTON_ORDER} step={WEAVE_FOOD_CARTON_STEP} value={cartons[product.id]??5} onChange={e=>setCartons(c=>({...c,[product.id]:Number(e.target.value)}))}/><Button type="button" className="flex-1" onClick={()=>void buyFromWeave(product)} disabled={working?.startsWith('buy:')}><Boxes className="mr-2 h-4 w-4"/>{working===`buy:${product.id}`?'ORDERING…':'Buy cartons'}</Button></div>{orderFeedback?.productId===product.id&&<p role="alert" className="mt-3 text-sm leading-6 text-amber-200">{orderFeedback.text}</p>}<p className="mt-2 text-[10px] uppercase tracking-[.12em] text-slate-600">½ · 1 · 1½ · 2 · 2½ … cartons only</p></article>})}
      </div>

      {pendingOrders.length>0&&<div className="mt-7 border-t border-white/10 pt-5"><p className="text-[9px] font-black uppercase tracking-[.2em] text-amber-300">Orders moving from WEAVE to you</p><div className="mt-3 space-y-3">{pendingOrders.map(order=><article key={order.id} className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black">{productName(order.variant_id)} · {formatWeaveFoodCartonQuantity(Number(order.box_count))}</p><p className="mt-1 text-xs text-slate-500">{order.package_count} units · {order.payment_status} · {order.fulfillment_status} · {order.payment_reference}</p></div><p className="font-black">{money(order.total_ngn)}</p></div>{order.payment_status==='pending'&&<div className="mt-3 flex gap-2"><Input value={proof[order.id]||''} onChange={e=>setProof(p=>({...p,[order.id]:e.target.value}))} placeholder="OPay transaction reference / receipt"/><Button onClick={()=>submitProof(order)} disabled={working===`proof:${order.id}`}>SEND PROOF</Button></div>}{order.fulfillment_status==='delivered'&&<Button className="mt-3" onClick={()=>confirmReceipt(order.id)} disabled={working===`receive:${order.id}`}><CheckCircle2 className="mr-2 h-4 w-4"/>CONFIRM RECEIVED</Button>}</article>)}</div></div>}
    </section>

    <section className="rounded-[2rem] border border-white/10 bg-white/[.02] p-5 md:p-7">
      <div className="flex items-center gap-2"><Route className="h-5 w-5 text-cyan-300"/><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-300">02 · Build your route</p><h2 className="mt-1 text-2xl font-black">Add existing stores and outlets</h2></div></div>
      <div className="mt-5 grid gap-3 md:grid-cols-2"><Input value={outletName} onChange={e=>setOutletName(e.target.value)} placeholder="Outlet / store name"/><Input value={outletContact} onChange={e=>setOutletContact(e.target.value)} placeholder="Store owner / contact name"/><Input value={outletPhone} onChange={e=>setOutletPhone(e.target.value)} placeholder="Phone · optional"/><Input value={outletAddress} onChange={e=>setOutletAddress(e.target.value)} placeholder="Location / junction / address"/></div><Button className="mt-4" onClick={createOutlet} disabled={working==='outlet'}><MapPin className="mr-2 h-4 w-4"/>ADD OUTLET TO ROUTE</Button>
      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{data.outlets.map(outlet=><div key={outlet.id} className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="font-black">{outlet.name}</p><p className="mt-1 text-xs text-slate-500">{outlet.address}</p>{outlet.contact_name&&<p className="mt-2 text-xs text-slate-400">{outlet.contact_name}{outlet.phone?` · ${outlet.phone}`:''}</p>}</div>)}{!data.outlets.length&&<p className="text-sm text-slate-500">No outlet added yet.</p>}</div>
    </section>

    <section className="rounded-[2rem] border border-white/10 bg-white/[.02] p-5 md:p-7">
      <p className="text-[10px] font-black uppercase tracking-[.22em] text-emerald-300">03 · Supply outlets</p><h2 className="mt-1 text-2xl font-black">Move cartons out of your hands</h2><p className="mt-2 text-sm text-slate-500">Paid now means the store owner buys immediately. Pay after sale means you leave the stock, the store sells, and you return to collect the agreed money. Half-carton placement is allowed because Agents can buy half cartons from WEAVE.</p>
      <div className="mt-5 space-y-4">{data.stock.map(stock=>{const freeCartons=freeCartonSteps(stock);const defaultCartons=freeCartons>=1?1:0.5;const form=placementForm[stock.id]||{outletId:'',cartonCount:defaultCartons,supplyMode:'pay_after_sale' as const,agreedAmount:''};return <article key={stock.id} className="rounded-2xl border border-white/10 bg-black/20 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black">{productName(stock.variant_id)}</p><p className="mt-1 text-xs text-slate-500">{freeCartons>=0.5?`${formatWeaveFoodCartonQuantity(freeCartons)} free`:'No half-carton step free'} · {stock.available_packages} units · {stock.carrier_reserved_packages||0} reserved by Carrier</p></div><p className="text-xs text-slate-400">Your cost {money(stock.agent_unit_cost_ngn)} / unit · customer reference {money(stock.retail_unit_price_ngn)}</p></div>{freeCartons>=0.5&&<div className="mt-4 grid gap-3 md:grid-cols-4"><select value={form.outletId} onChange={e=>setPlacementForm(p=>({...p,[stock.id]:{...form,outletId:e.target.value}}))} className="rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm"><option value="">Choose outlet</option>{data.outlets.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select><Input type="number" min={0.5} max={freeCartons} step={0.5} value={form.cartonCount} onChange={e=>setPlacementForm(p=>({...p,[stock.id]:{...form,cartonCount:Number(e.target.value)}}))}/><select value={form.supplyMode} onChange={e=>setPlacementForm(p=>({...p,[stock.id]:{...form,supplyMode:e.target.value as 'paid_now'|'pay_after_sale'}}))} className="rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm"><option value="pay_after_sale">Pay after sale</option><option value="paid_now">Paid now</option></select><Input value={form.agreedAmount} onChange={e=>setPlacementForm(p=>({...p,[stock.id]:{...form,agreedAmount:e.target.value}}))} placeholder="Amount outlet returns"/></div>}{freeCartons>=0.5&&<Button className="mt-3" onClick={()=>supplyOutlet(stock)} disabled={working===`supply:${stock.id}`||!form.outletId}><Truck className="mr-2 h-4 w-4"/>SUPPLY OUTLET</Button>}</article>})}{!data.stock.length&&<p className="text-sm text-slate-500">No paid and received stock is available yet.</p>}</div>
    </section>

    <section className="rounded-[2rem] border border-white/10 bg-white/[.02] p-5 md:p-7">
      <p className="text-[10px] font-black uppercase tracking-[.22em] text-violet-300">04 · Follow stock and collect</p><h2 className="mt-1 text-2xl font-black">Pay-after-sale ledger</h2>
      <div className="mt-5 space-y-4">{data.placements.map(placement=><article key={placement.id} className="rounded-2xl border border-white/10 bg-black/20 p-5"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-black">{placement.outlet_name} · {productName(placement.variant_id)}</p><p className="mt-1 text-xs text-slate-500">{formatWeaveFoodCartonQuantity(Number(placement.carton_count))} · {placement.package_count} units · {placement.supply_mode==='pay_after_sale'?'pay after sale':'paid now'} · {placement.status}</p></div><div className="text-right"><p className="text-[9px] uppercase tracking-wider text-slate-600">Outstanding</p><p className="font-black text-amber-200">{money(placement.outstanding_ngn)}</p></div></div><div className="mt-4 grid gap-2 text-xs sm:grid-cols-4"><div><span className="text-slate-600">Agreed return</span><p className="font-black">{money(placement.agreed_amount_ngn)}</p></div><div><span className="text-slate-600">Collected</span><p className="font-black">{money(placement.amount_collected_ngn)}</p></div><div><span className="text-slate-600">Units sold</span><p className="font-black">{placement.packages_reported_sold}/{placement.package_count}</p></div><div><span className="text-slate-600">Expected Agent margin</span><p className="font-black text-emerald-200">{money(placement.expected_agent_margin_ngn)}</p></div></div>{placement.supply_mode==='pay_after_sale'&&placement.status!=='settled'&&<div className="mt-4 grid gap-3 md:grid-cols-2"><div className="flex gap-2"><Input value={soldReport[placement.id]||''} onChange={e=>setSoldReport(s=>({...s,[placement.id]:e.target.value}))} placeholder="Units sold since last check"/><Button onClick={()=>postAction({action:'report_sales',placementId:placement.id,soldPackages:Number(soldReport[placement.id])},`sold:${placement.id}`,'Outlet sales updated.')}>REPORT SOLD</Button></div><div className="flex gap-2"><Input value={collection[placement.id]||''} onChange={e=>setCollection(s=>({...s,[placement.id]:e.target.value}))} placeholder="Money collected now"/><Button onClick={()=>postAction({action:'record_collection',placementId:placement.id,amountNgn:Number(collection[placement.id])},`collect:${placement.id}`,'Outlet collection recorded.')}><HandCoins className="mr-2 h-4 w-4"/>COLLECT</Button></div></div>}</article>)}{!data.placements.length&&<p className="text-sm text-slate-500">No outlet stock movement recorded yet.</p>}</div>
    </section>

    <div className="flex justify-end"><Button variant="outline" onClick={()=>void load()} disabled={working==='load'}><RefreshCcw className="mr-2 h-4 w-4"/>REFRESH ROUTE</Button></div>
  </div>
}
