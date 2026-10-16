'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AGILITY_AGENT_BOX_PRICE_NGN,
  AGILITY_PACKAGES_PER_BOX,
  AGILITY_RETAIL_BOX_VALUE_NGN,
  AGILITY_RETAIL_UNIT_PRICE_NGN,
  AGILITY_VARIANTS,
  type AgilityVariant,
} from '@/lib/agility-catalog'
import { Boxes, CheckCircle2, HandCoins, MapPin, PackageCheck, RefreshCcw, Route, Store, Truck } from 'lucide-react'

type StockOrder = {
  id:string
  variant_id:string
  box_count:number
  package_count:number
  packages_per_box:number
  total_ngn:number|string
  payment_status:string
  fulfillment_status:string
  payment_reference:string
  opay_account_number:string
  delivery_address?:string|null
  delivery_phone?:string|null
  created_at:string
}

type Outlet = {
  id:string
  name:string
  contact_name?:string|null
  phone?:string|null
  address:string
}

type AvailableStock = StockOrder & {
  direct_sold_packages:number
  allocated_packages:number
  available_packages:number
  agent_unit_cost_ngn:number|string
  retail_unit_price_ngn:number|string
}

type Placement = {
  id:string
  outlet_id:string
  outlet_name:string
  outlet_address:string
  outlet_phone?:string|null
  order_id:string
  variant_id:string
  carton_count:number
  package_count:number
  supply_mode:'paid_now'|'pay_after_sale'
  agreed_amount_ngn:number|string
  packages_reported_sold:number
  amount_collected_ngn:number|string
  outstanding_ngn:number|string
  agent_cost_basis_ngn:number|string
  expected_agent_margin_ngn:number|string
  outlet_margin_at_weave_retail_ngn:number|string
  status:string
  supplied_at:string
}

type DistributionData = {
  outlets:Outlet[]
  placements:Placement[]
  stock:AvailableStock[]
  summary:{
    packages_still_with_outlets:number
    outstanding_ngn:number|string
    collected_today_ngn:number|string
    outlet_count:number
  }
}

const money=(value:number|string)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(value||0))
const productName=(id:string)=>AGILITY_VARIANTS.find(v=>v.id===id)?.name||id

export default function AgentDistributionPage(){
  const {user,token}=useAuth()
  const isAgent=user?.role==='agent'
  const [data,setData]=useState<DistributionData>({outlets:[],placements:[],stock:[],summary:{packages_still_with_outlets:0,outstanding_ngn:0,collected_today_ngn:0,outlet_count:0}})
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

  const [placementForm,setPlacementForm]=useState<Record<string,{outletId:string;cartonCount:number;supplyMode:'paid_now'|'pay_after_sale';agreedAmount:string}>>({})
  const [soldReport,setSoldReport]=useState<Record<string,string>>({})
  const [collection,setCollection]=useState<Record<string,string>>({})

  useEffect(()=>{
    if(typeof window==='undefined')return
    setReceivingAddress(localStorage.getItem('weave:agent-receiving-address')||'')
    setReceivingPhone(localStorage.getItem('weave:agent-receiving-phone')||'')
  },[])

  const load=async()=>{
    if(!token||!isAgent)return
    setWorking('load')
    try{
      const [distributionResponse,ordersResponse]=await Promise.all([
        fetch('/api/agent/distribution',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'}),
        fetch('/api/agility/stock',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'}),
      ])
      const distribution=await distributionResponse.json()
      const orderData=await ordersResponse.json()
      if(!distributionResponse.ok||!distribution.success)throw new Error(distribution.error||'Unable to load distribution route')
      setData(distribution)
      if(ordersResponse.ok&&orderData.success)setOrders(orderData.orders||[])
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to load Agent distribution')}
    finally{setWorking(null)}
  }

  useEffect(()=>{load()},[token,isAgent])

  const buyFromWeave=async(product:AgilityVariant)=>{
    if(!token)return
    const boxCount=Math.max(1,Math.min(50,Number(cartons[product.id]||5)))
    if(receivingAddress.trim().length<5||receivingPhone.replace(/\D/g,'').length<7){
      setMessage('Enter where WEAVE should deliver the cartons to you and your receiving phone number.')
      return
    }
    localStorage.setItem('weave:agent-receiving-address',receivingAddress.trim())
    localStorage.setItem('weave:agent-receiving-phone',receivingPhone.trim())
    setWorking(`buy:${product.id}`)
    setMessage('')
    try{
      const response=await fetch('/api/agility/stock',{
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body:JSON.stringify({
          variantId:product.id,
          boxCount,
          distributionMode:'wholesaler',
          deliveryAddress:receivingAddress,
          deliveryPhone:receivingPhone,
          note:'Agent neighborhood distribution stock',
        }),
      })
      const result=await response.json()
      if(!response.ok||!result.success)throw new Error(result.error||'Unable to order WEAVE stock')
      setMessage(`${product.name}: ${boxCount} carton${boxCount===1?'':'s'} ordered. Pay ${money(result.payment.amountNgn)} to OPay ${result.payment.accountNumber}, then submit the payment reference below.`)
      await load()
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to order WEAVE stock')}
    finally{setWorking(null)}
  }

  const submitProof=async(order:StockOrder)=>{
    if(!token)return
    const receipt=String(proof[order.id]||'').trim()
    if(!receipt){setMessage('Enter the OPay transaction reference or receipt.');return}
    setWorking(`proof:${order.id}`)
    try{
      const response=await fetch('/api/agility/payment/opay/receipt',{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body:JSON.stringify({orderId:order.id,receipt}),
      })
      const result=await response.json()
      if(!response.ok||!result.success)throw new Error(result.error||'Unable to submit proof')
      setProof(current=>({...current,[order.id]:''}))
      setMessage('Payment proof sent to Administration. Preparation begins after verification.')
      await load()
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to submit proof')}
    finally{setWorking(null)}
  }

  const confirmReceipt=async(orderId:string)=>{
    if(!token)return
    setWorking(`receive:${orderId}`)
    try{
      const response=await fetch('/api/agility/receive',{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({orderId}),
      })
      const result=await response.json()
      if(!response.ok||!result.success)throw new Error(result.error||'Unable to confirm receipt')
      setMessage('Cartons received. They are now available for your distribution route.')
      await load()
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to confirm receipt')}
    finally{setWorking(null)}
  }

  const createOutlet=async()=>{
    if(!token)return
    setWorking('outlet')
    try{
      const response=await fetch('/api/agent/distribution',{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body:JSON.stringify({action:'create_outlet',name:outletName,contactName:outletContact,phone:outletPhone,address:outletAddress}),
      })
      const result=await response.json()
      if(!response.ok||!result.success)throw new Error(result.error||'Unable to add outlet')
      setOutletName('');setOutletContact('');setOutletPhone('');setOutletAddress('')
      setMessage(`${result.outlet.name} added to your distribution route.`)
      await load()
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to add outlet')}
    finally{setWorking(null)}
  }

  const supplyOutlet=async(stock:AvailableStock)=>{
    if(!token)return
    const form=placementForm[stock.id]||{outletId:'',cartonCount:1,supplyMode:'pay_after_sale' as const,agreedAmount:''}
    setWorking(`supply:${stock.id}`)
    try{
      const response=await fetch('/api/agent/distribution',{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body:JSON.stringify({
          action:'place_stock',outletId:form.outletId,orderId:stock.id,cartonCount:Number(form.cartonCount),
          supplyMode:form.supplyMode,agreedAmountNgn:Number(form.agreedAmount),
        }),
      })
      const result=await response.json()
      if(!response.ok||!result.success)throw new Error(result.error||'Unable to supply outlet')
      setMessage(form.supplyMode==='pay_after_sale'
        ? `${productName(stock.variant_id)} placed with the outlet on pay-after-sale. WEAVE is now tracking the stock and money due.`
        : `${productName(stock.variant_id)} cartons supplied and paid immediately.`)
      await load()
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to supply outlet')}
    finally{setWorking(null)}
  }

  const postAction=async(body:Record<string,unknown>,key:string,successMessage:string)=>{
    if(!token)return
    setWorking(key)
    try{
      const response=await fetch('/api/agent/distribution',{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body),
      })
      const result=await response.json()
      if(!response.ok||!result.success)throw new Error(result.error||'Unable to update distribution movement')
      setMessage(successMessage)
      await load()
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to update distribution movement')}
    finally{setWorking(null)}
  }

  const cartonsAvailable=useMemo(()=>data.stock.reduce((sum,item)=>sum+Math.floor(Number(item.available_packages||0)/Number(item.packages_per_box||AGILITY_PACKAGES_PER_BOX)),0),[data.stock])
  const pendingOrders=orders.filter(order=>order.fulfillment_status!=='received')

  if(!user)return null
  if(!isAgent)return <div className="p-8 text-sm text-slate-300">Agent account required.</div>

  return <div className="mx-auto max-w-7xl space-y-7 pb-20">
    <section className="rounded-[2rem] border border-cyan-300/20 bg-gradient-to-br from-cyan-500/10 via-slate-950 to-emerald-500/10 p-6 md:p-9">
      <p className="text-[10px] font-black uppercase tracking-[.3em] text-cyan-300">Agent Department · Physical Distribution</p>
      <h1 className="mt-2 text-4xl font-black text-white md:text-6xl">AGENT DISTRIBUTION ROUTE</h1>
      <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300 md:text-base">
        The Agent does not operate a shop. Buy WEAVE cartons, move them into existing shops and food outlets around you, then return for more stock. If an outlet cannot pay for cartons immediately, place the cartons there on pay-after-sale and collect the agreed money as the stock sells.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Outlets on route',String(data.summary.outlet_count),MapPin],
          ['Cartons in your hands',String(cartonsAvailable),Boxes],
          ['Packs still with outlets',String(data.summary.packages_still_with_outlets||0),Store],
          ['Outlet money outstanding',money(data.summary.outstanding_ngn),HandCoins],
        ].map(([label,value,Icon]:any)=><div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4"><Icon className="h-5 w-5 text-cyan-300"/><p className="mt-3 text-[9px] font-black uppercase tracking-[.16em] text-slate-500">{label}</p><p className="mt-1 text-xl font-black text-white">{value}</p></div>)}
      </div>
      <p className="mt-4 text-xs text-emerald-300">Collected from outlets today: {money(data.summary.collected_today_ngn)}</p>
    </section>

    {message&&<div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[.06] px-5 py-4 text-sm leading-6 text-cyan-50">{message}</div>}

    <section className="rounded-[2rem] border border-white/10 bg-white/[.02] p-5 md:p-7">
      <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-orange-300">01 · Buy from WEAVE</p><h2 className="mt-1 text-2xl font-black text-white">Load cartons for your route</h2></div><Truck className="h-7 w-7 text-orange-300"/></div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Input value={receivingAddress} onChange={e=>setReceivingAddress(e.target.value)} placeholder="Where WEAVE should deliver your cartons"/>
        <Input value={receivingPhone} onChange={e=>setReceivingPhone(e.target.value)} placeholder="Receiving phone"/>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {AGILITY_VARIANTS.map(product=><article key={product.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-orange-300">{product.accent}</p>
          <h3 className="mt-1 text-xl font-black text-white">{product.name}</h3>
          <p className="mt-2 text-xs leading-5 text-slate-500">{product.note}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-white/[.04] p-3"><span className="text-slate-500">Agent carton</span><p className="font-black text-white">{money(AGILITY_AGENT_BOX_PRICE_NGN)}</p></div><div className="rounded-xl bg-white/[.04] p-3"><span className="text-slate-500">Packs</span><p className="font-black text-white">{AGILITY_PACKAGES_PER_BOX}</p></div></div>
          <div className="mt-4 flex gap-2"><Input className="w-24 text-center" type="number" min={1} max={50} value={cartons[product.id]||5} onChange={e=>setCartons(c=>({...c,[product.id]:Number(e.target.value)}))}/><Button className="flex-1" onClick={()=>buyFromWeave(product)} disabled={working===`buy:${product.id}`}><Boxes className="mr-2 h-4 w-4"/>Buy cartons</Button></div>
        </article>)}
      </div>

      {pendingOrders.length>0&&<div className="mt-6 space-y-3">
        <p className="text-xs font-black uppercase tracking-[.18em] text-slate-500">Orders moving from WEAVE to you</p>
        {pendingOrders.slice(0,10).map(order=><div key={order.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-white">{productName(order.variant_id)} · {order.box_count} carton{Number(order.box_count)===1?'':'s'}</p><p className="text-xs text-slate-500">{order.payment_status} · {order.fulfillment_status} · {order.payment_reference}</p></div><p className="font-black text-orange-300">{money(order.total_ngn)}</p></div>
          {['pending','rejected'].includes(order.payment_status)&&<div className="mt-3 flex flex-col gap-2 sm:flex-row"><Input value={proof[order.id]||''} onChange={e=>setProof(p=>({...p,[order.id]:e.target.value}))} placeholder={`OPay transaction reference · ${order.opay_account_number}`}/><Button onClick={()=>submitProof(order)} disabled={working===`proof:${order.id}`}>Submit proof</Button></div>}
          {order.fulfillment_status==='delivered'&&<Button className="mt-3" onClick={()=>confirmReceipt(order.id)} disabled={working===`receive:${order.id}`}><PackageCheck className="mr-2 h-4 w-4"/>Confirm cartons received</Button>}
        </div>)}
      </div>}
    </section>

    <section className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
      <div className="rounded-[2rem] border border-white/10 bg-white/[.02] p-5 md:p-7">
        <p className="text-[10px] font-black uppercase tracking-[.22em] text-emerald-300">02 · Build your route</p>
        <h2 className="mt-1 text-2xl font-black text-white">Add real shops around you</h2>
        <p className="mt-2 text-xs leading-5 text-slate-500">Fruit shops, kiosks, mini-marts, food points and other existing outlets can carry WEAVE products without becoming Agents.</p>
        <div className="mt-5 space-y-3">
          <Input value={outletName} onChange={e=>setOutletName(e.target.value)} placeholder="Outlet / shop name"/>
          <Input value={outletContact} onChange={e=>setOutletContact(e.target.value)} placeholder="Owner / contact name"/>
          <Input value={outletPhone} onChange={e=>setOutletPhone(e.target.value)} placeholder="Phone"/>
          <Input value={outletAddress} onChange={e=>setOutletAddress(e.target.value)} placeholder="Location · e.g. Junction fruit shop"/>
          <Button className="w-full" onClick={createOutlet} disabled={working==='outlet'}><MapPin className="mr-2 h-4 w-4"/>Add outlet to route</Button>
        </div>
        <div className="mt-5 space-y-2">{data.outlets.map(outlet=><div key={outlet.id} className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="font-bold text-white">{outlet.name}</p><p className="mt-1 text-xs text-slate-500">{outlet.address}{outlet.phone?` · ${outlet.phone}`:''}</p></div>)}</div>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-white/[.02] p-5 md:p-7">
        <p className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-300">03 · Supply the outlets</p>
        <h2 className="mt-1 text-2xl font-black text-white">Move cartons out of your hands</h2>
        <p className="mt-2 text-xs leading-5 text-slate-500">Paid now closes the Agent-outlet transaction immediately. Pay after sale keeps the cartons on your distribution ledger until the outlet settles the agreed amount.</p>
        <div className="mt-5 space-y-4">
          {data.stock.filter(stock=>Number(stock.available_packages)>=Number(stock.packages_per_box)).length===0&&<p className="text-sm text-slate-500">No complete received cartons are available yet.</p>}
          {data.stock.filter(stock=>Number(stock.available_packages)>=Number(stock.packages_per_box)).map(stock=>{
            const form=placementForm[stock.id]||{outletId:'',cartonCount:1,supplyMode:'pay_after_sale' as const,agreedAmount:''}
            const maxCartons=Math.floor(Number(stock.available_packages)/Number(stock.packages_per_box))
            return <div key={stock.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3"><div><p className="font-black text-white">{productName(stock.variant_id)}</p><p className="text-xs text-slate-500">{maxCartons} carton{maxCartons===1?'':'s'} available · WEAVE retail reference {money(AGILITY_RETAIL_BOX_VALUE_NGN)}/carton</p></div><Route className="h-5 w-5 text-cyan-300"/></div>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                <select className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white" value={form.outletId} onChange={e=>setPlacementForm(p=>({...p,[stock.id]:{...form,outletId:e.target.value}}))}><option value="">Choose outlet</option>{data.outlets.map(outlet=><option key={outlet.id} value={outlet.id}>{outlet.name} · {outlet.address}</option>)}</select>
                <select className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white" value={form.supplyMode} onChange={e=>setPlacementForm(p=>({...p,[stock.id]:{...form,supplyMode:e.target.value as 'paid_now'|'pay_after_sale'}}))}><option value="pay_after_sale">Pay after sale</option><option value="paid_now">Paid now</option></select>
                <Input type="number" min={1} max={maxCartons} value={form.cartonCount} onChange={e=>setPlacementForm(p=>({...p,[stock.id]:{...form,cartonCount:Number(e.target.value)}}))} placeholder="Cartons"/>
                <Input type="number" min={1} value={form.agreedAmount} onChange={e=>setPlacementForm(p=>({...p,[stock.id]:{...form,agreedAmount:e.target.value}}))} placeholder="Total amount outlet returns to Agent"/>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-slate-600">Agent stock cost reference: {money(AGILITY_AGENT_BOX_PRICE_NGN)} per carton. Consumer reference: {AGILITY_PACKAGES_PER_BOX} packs × {money(AGILITY_RETAIL_UNIT_PRICE_NGN)}. Agree the outlet return amount before supply so both sides know the settlement.</p>
              <Button className="mt-3 w-full" onClick={()=>supplyOutlet(stock)} disabled={working===`supply:${stock.id}`||!form.outletId}><Truck className="mr-2 h-4 w-4"/>Supply outlet</Button>
            </div>
          })}
        </div>
      </div>
    </section>

    <section className="rounded-[2rem] border border-amber-300/15 bg-amber-300/[.03] p-5 md:p-7">
      <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-amber-300">04 · Pay-after-sale ledger</p><h2 className="mt-1 text-2xl font-black text-white">Know where the food and money are</h2></div><HandCoins className="h-7 w-7 text-amber-300"/></div>
      <div className="mt-5 space-y-4">
        {data.placements.length===0&&<p className="text-sm text-slate-500">No outlet supplies recorded yet.</p>}
        {data.placements.map(placement=><div key={placement.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div><p className="text-lg font-black text-white">{placement.outlet_name} · {productName(placement.variant_id)}</p><p className="mt-1 text-xs text-slate-500">{placement.carton_count} carton{Number(placement.carton_count)===1?'':'s'} · {placement.supply_mode==='pay_after_sale'?'Pay after sale':'Paid now'} · {placement.status.replaceAll('_',' ')}</p><p className="mt-1 text-xs text-slate-600">{placement.outlet_address}</p></div>
            <div className="grid grid-cols-2 gap-2 text-right text-xs sm:grid-cols-4"><div><p className="text-slate-600">Sold</p><p className="font-black text-white">{placement.packages_reported_sold}/{placement.package_count}</p></div><div><p className="text-slate-600">Agreed</p><p className="font-black text-white">{money(placement.agreed_amount_ngn)}</p></div><div><p className="text-slate-600">Collected</p><p className="font-black text-emerald-300">{money(placement.amount_collected_ngn)}</p></div><div><p className="text-slate-600">Outstanding</p><p className="font-black text-amber-300">{money(placement.outstanding_ngn)}</p></div></div>
          </div>
          {placement.supply_mode==='pay_after_sale'&&placement.status!=='settled'&&<div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 p-3"><p className="text-[10px] font-black uppercase tracking-[.15em] text-slate-500">Outlet reports packs sold</p><div className="mt-2 flex gap-2"><Input type="number" min={1} value={soldReport[placement.id]||''} onChange={e=>setSoldReport(s=>({...s,[placement.id]:e.target.value}))} placeholder="Packs sold"/><Button onClick={()=>postAction({action:'report_sales',placementId:placement.id,soldPackages:Number(soldReport[placement.id])},`sold:${placement.id}`,'Outlet sales position updated.')} disabled={working===`sold:${placement.id}`}><CheckCircle2 className="h-4 w-4"/></Button></div></div>
            <div className="rounded-xl border border-white/10 p-3"><p className="text-[10px] font-black uppercase tracking-[.15em] text-slate-500">Money collected from outlet</p><div className="mt-2 flex gap-2"><Input type="number" min={1} value={collection[placement.id]||''} onChange={e=>setCollection(c=>({...c,[placement.id]:e.target.value}))} placeholder="Amount collected"/><Button onClick={()=>postAction({action:'record_collection',placementId:placement.id,amountNgn:Number(collection[placement.id])},`collect:${placement.id}`,'Outlet collection recorded.')} disabled={working===`collect:${placement.id}`}><HandCoins className="h-4 w-4"/></Button></div></div>
          </div>}
          <div className="mt-3 grid gap-2 text-[11px] md:grid-cols-3"><p className="rounded-lg bg-white/[.03] p-2 text-slate-500">Your cost basis: <span className="font-bold text-white">{money(placement.agent_cost_basis_ngn)}</span></p><p className="rounded-lg bg-white/[.03] p-2 text-slate-500">Expected Agent margin at agreement: <span className="font-bold text-white">{money(placement.expected_agent_margin_ngn)}</span></p><p className="rounded-lg bg-white/[.03] p-2 text-slate-500">Outlet room at WEAVE retail reference: <span className="font-bold text-white">{money(placement.outlet_margin_at_weave_retail_ngn)}</span></p></div>
        </div>)}
      </div>
    </section>

    <section className="rounded-[2rem] border border-emerald-300/15 bg-emerald-300/[.04] p-6">
      <p className="text-[10px] font-black uppercase tracking-[.23em] text-emerald-300">Agent position</p>
      <div className="mt-4 grid gap-3 md:grid-cols-6">{['Buy from WEAVE','Receive cartons','Find outlets','Supply stock','Collect after sale','Restock & repeat'].map((step,index)=><div key={step} className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-xs font-black text-emerald-300">0{index+1}</p><p className="mt-2 text-sm font-bold text-white">{step}</p></div>)}</div>
    </section>

    <div className="flex justify-end"><Button variant="outline" onClick={load} disabled={working==='load'}><RefreshCcw className="mr-2 h-4 w-4"/>Refresh route</Button></div>
  </div>
}
