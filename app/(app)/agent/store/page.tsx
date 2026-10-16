'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AGILITY_AGENT_BOX_PRICE_NGN,
  AGILITY_AGENT_GROSS_PROFIT_PER_BOX_NGN,
  AGILITY_PACKAGES_PER_BOX,
  AGILITY_RETAIL_UNIT_PRICE_NGN,
  AGILITY_VARIANTS,
  type AgilityVariant,
} from '@/lib/agility-catalog'
import {
  Box,
  CheckCircle2,
  PackageCheck,
  RefreshCcw,
  ShoppingBag,
  Store,
  TrendingUp,
  Truck,
} from 'lucide-react'

type StoreOrder = {
  id:string
  variant_id:string
  distribution_mode:'wholesaler'|'retailer'
  box_count:number
  package_count:number
  total_ngn:number|string
  payment_status:string
  fulfillment_status:string
  payment_reference:string
  opay_account_number:string
  sold_packages:number
  recorded_revenue_ngn?:number|string
  realized_agent_gross_profit_ngn?:number|string
  delivery_address?:string|null
  delivery_phone?:string|null
  created_at:string
}

const money=(value:number|string)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(value||0))
const todayKey=()=>new Date().toLocaleDateString('en-CA')
const orderDay=(value:string)=>new Date(value).toLocaleDateString('en-CA')

function productName(id:string){
  return AGILITY_VARIANTS.find(item=>item.id===id)?.name||id
}

export default function AgentStorePage(){
  const {user,token}=useAuth()
  const isAgent=user?.role==='agent'
  const [orders,setOrders]=useState<StoreOrder[]>([])
  const [loading,setLoading]=useState(false)
  const [message,setMessage]=useState('')
  const [cartons,setCartons]=useState<Record<string,number>>(()=>Object.fromEntries(AGILITY_VARIANTS.map(v=>[v.id,3])))
  const [address,setAddress]=useState('')
  const [phone,setPhone]=useState('')
  const [proof,setProof]=useState<Record<string,string>>({})
  const [working,setWorking]=useState<string|null>(null)

  useEffect(()=>{
    if(typeof window==='undefined')return
    setAddress(localStorage.getItem('weave:agent-store-address')||'')
    setPhone(localStorage.getItem('weave:agent-store-phone')||'')
  },[])

  const load=async()=>{
    if(!token||!isAgent)return
    setLoading(true)
    try{
      const response=await fetch('/api/agility/stock',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
      const data=await response.json()
      if(response.ok&&data.success)setOrders(data.orders||[])
      else setMessage(data.error||'Unable to load store stock')
    }finally{setLoading(false)}
  }

  useEffect(()=>{load()},[token,isAgent])

  const todayOrders=useMemo(()=>orders.filter(order=>orderDay(order.created_at)===todayKey()),[orders])
  const todayCartons=todayOrders.reduce((sum,order)=>sum+Number(order.box_count||0),0)
  const todayRevenue=todayOrders.reduce((sum,order)=>sum+Number(order.recorded_revenue_ngn||0),0)
  const todayGross=todayOrders.reduce((sum,order)=>sum+Number(order.realized_agent_gross_profit_ngn||0),0)
  const availablePacks=orders.reduce((sum,order)=>{
    if(order.fulfillment_status!=='received')return sum
    return sum+Math.max(0,Number(order.package_count)-Number(order.sold_packages||0))
  },0)

  const productSummary=useMemo(()=>AGILITY_VARIANTS.map(product=>{
    const productOrders=orders.filter(order=>order.variant_id===product.id)
    const received=productOrders.filter(order=>order.fulfillment_status==='received')
    const available=received.reduce((sum,order)=>sum+Math.max(0,Number(order.package_count)-Number(order.sold_packages||0)),0)
    const soldToday=productOrders
      .filter(order=>orderDay(order.created_at)===todayKey())
      .reduce((sum,order)=>sum+Number(order.sold_packages||0),0)
    const openOrder=productOrders.find(order=>order.payment_status!=='paid'||!['received'].includes(order.fulfillment_status))
    return {product,available,soldToday,openOrder,received}
  }),[orders])

  const orderCartons=async(product:AgilityVariant)=>{
    if(!token)return
    const boxCount=Math.max(1,Math.min(50,Number(cartons[product.id]||3)))
    if(address.trim().length<5||phone.replace(/\D/g,'').length<7){
      setMessage('Add the Agent Store delivery address and phone before ordering stock.')
      return
    }
    localStorage.setItem('weave:agent-store-address',address.trim())
    localStorage.setItem('weave:agent-store-phone',phone.trim())
    setWorking(`order:${product.id}`)
    setMessage('')
    try{
      const response=await fetch('/api/agility/stock',{
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body:JSON.stringify({variantId:product.id,boxCount,distributionMode:'retailer',deliveryAddress:address,deliveryPhone:phone,note:'Agent Store daily replenishment'}),
      })
      const data=await response.json()
      if(!response.ok||!data.success)throw new Error(data.error||'Unable to create store stock order')
      setMessage(`${product.name}: ${boxCount} carton${boxCount===1?'':'s'} opened for today. Pay ${money(data.payment.amountNgn)} to OPay ${data.payment.accountNumber}, then submit the receipt below.`)
      await load()
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to create store order')}
    finally{setWorking(null)}
  }

  const submitProof=async(order:StoreOrder)=>{
    if(!token)return
    const receipt=String(proof[order.id]||'').trim()
    if(!receipt){setMessage('Enter the OPay transaction reference or receipt first.');return}
    setWorking(`proof:${order.id}`)
    try{
      const response=await fetch('/api/agility/payment/opay/receipt',{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body:JSON.stringify({orderId:order.id,receipt}),
      })
      const data=await response.json()
      if(!response.ok||!data.success)throw new Error(data.error||'Unable to submit payment proof')
      setProof(current=>({...current,[order.id]:''}))
      setMessage('Payment proof submitted. Administration verification opens preparation and delivery.')
      await load()
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to submit payment proof')}
    finally{setWorking(null)}
  }

  const confirmReceipt=async(order:StoreOrder)=>{
    if(!token)return
    setWorking(`receive:${order.id}`)
    try{
      const response=await fetch('/api/agility/receive',{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({orderId:order.id}),
      })
      const data=await response.json()
      if(!response.ok||!data.success)throw new Error(data.error||'Unable to confirm stock receipt')
      setMessage(`${productName(order.variant_id)} stock is now on your Store shelf and ready to sell.`)
      await load()
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to confirm stock receipt')}
    finally{setWorking(null)}
  }

  const sellPack=async(productId:string)=>{
    if(!token)return
    const order=orders.find(item=>item.variant_id===productId&&item.fulfillment_status==='received'&&Number(item.package_count)-Number(item.sold_packages||0)>0)
    if(!order){setMessage(`No received ${productName(productId)} stock is available to sell.`);return}
    setWorking(`sell:${productId}`)
    try{
      const response=await fetch('/api/agility/sales',{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({orderId:order.id,quantity:1}),
      })
      const data=await response.json()
      if(!response.ok||!data.success)throw new Error(data.error||'Unable to record sale')
      setMessage(`${productName(productId)} sold. ${money(data.economics.saleRevenueNgn)} revenue recorded; ${data.inventory.availablePackages} packs remain in this carton order.`)
      await load()
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to record sale')}
    finally{setWorking(null)}
  }

  if(!user)return null
  if(!isAgent)return <div className="p-8 text-sm text-slate-300">Agent account required.</div>

  return <div className="mx-auto max-w-7xl space-y-7 pb-20">
    <section className="overflow-hidden rounded-[2rem] border border-emerald-300/20 bg-gradient-to-br from-emerald-500/12 via-slate-950 to-cyan-500/5 p-6 md:p-9">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.3em] text-emerald-300">Agent Department · Daily Distribution</p>
          <h1 className="mt-2 text-4xl font-black text-white md:text-6xl">MY WEAVE STORE</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
            This is the Agent position in motion. Bring cartons into your Store, receive the physical stock, sell the packs, close the stock, then return for the next day’s movement.
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[.06] px-5 py-4">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300">Daily rhythm</p>
          <p className="mt-1 text-xl font-black text-white">3 cartons → sell out → reorder</p>
        </div>
      </div>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[
        ['Cartons ordered today',String(todayCartons),Box],
        ['Packs on shelf',String(availablePacks),PackageCheck],
        ['Recorded sales',money(todayRevenue),TrendingUp],
        ['Agent gross today',money(todayGross),Store],
      ].map(([label,value,Icon]:any)=><div key={label} className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
        <Icon className="h-5 w-5 text-emerald-300"/>
        <p className="mt-4 text-[10px] font-black uppercase tracking-[.18em] text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-black text-white">{value}</p>
      </div>)}
    </section>

    <section className="rounded-[2rem] border border-white/10 bg-white/[.02] p-5 md:p-7">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-300">Store destination</p>
          <h2 className="mt-1 text-2xl font-black text-white">Where WEAVE delivers your cartons</h2>
        </div>
        <Truck className="h-7 w-7 text-cyan-300"/>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Agent Store delivery address"/>
        <Input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Delivery phone"/>
      </div>
      <p className="mt-2 text-xs text-slate-500">Saved on this device so daily reordering does not repeat unnecessary steps.</p>
    </section>

    {message&&<div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[.06] px-5 py-4 text-sm leading-6 text-cyan-50">{message}</div>}

    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.24em] text-emerald-300">WEAVE products</p>
          <h2 className="mt-1 text-2xl font-black text-white">Stock the Store. Sell the Store.</h2>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}><RefreshCcw className="mr-2 h-4 w-4"/>Refresh</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {productSummary.map(({product,available,soldToday})=><article key={product.id} className="rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300">{product.accent}</p>
              <h3 className="mt-1 text-2xl font-black text-white">{product.name}</h3>
              <p className="mt-1 text-sm text-slate-400">{product.note}</p>
            </div>
            <ShoppingBag className="h-6 w-6 shrink-0 text-emerald-300"/>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/[.04] p-3"><p className="text-[9px] uppercase text-slate-500">Shelf</p><p className="mt-1 font-black text-white">{available}</p></div>
            <div className="rounded-xl bg-white/[.04] p-3"><p className="text-[9px] uppercase text-slate-500">Sold</p><p className="mt-1 font-black text-white">{soldToday}</p></div>
            <div className="rounded-xl bg-white/[.04] p-3"><p className="text-[9px] uppercase text-slate-500">Retail</p><p className="mt-1 font-black text-white">{money(AGILITY_RETAIL_UNIT_PRICE_NGN)}</p></div>
          </div>
          <div className="mt-5 rounded-xl border border-white/10 bg-white/[.025] p-4">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-[10px] font-black uppercase tracking-[.17em] text-slate-500">Daily carton order</p><p className="mt-1 text-xs text-slate-400">{AGILITY_PACKAGES_PER_BOX} packs/carton · {money(AGILITY_AGENT_BOX_PRICE_NGN)} Agent cost</p></div>
              <Input className="w-20 text-center" type="number" min={1} max={50} value={cartons[product.id]||3} onChange={e=>setCartons(c=>({...c,[product.id]:Number(e.target.value)}))}/>
            </div>
            <Button className="mt-3 w-full" onClick={()=>orderCartons(product)} disabled={working===`order:${product.id}`}>
              <Box className="mr-2 h-4 w-4"/>Order {cartons[product.id]||3} carton{Number(cartons[product.id]||3)===1?'':'s'}
            </Button>
          </div>
          <Button variant="outline" className="mt-3 w-full" onClick={()=>sellPack(product.id)} disabled={available<1||working===`sell:${product.id}`}>
            <CheckCircle2 className="mr-2 h-4 w-4"/>Record 1 pack sold
          </Button>
          <p className="mt-3 text-center text-[10px] uppercase tracking-[.15em] text-slate-600">Full carton gross target {money(AGILITY_AGENT_GROSS_PROFIT_PER_BOX_NGN)}</p>
        </article>)}
      </div>
    </section>

    <section className="rounded-[2rem] border border-white/10 bg-white/[.02] p-5 md:p-7">
      <p className="text-[10px] font-black uppercase tracking-[.22em] text-orange-300">Carton movement</p>
      <h2 className="mt-1 text-2xl font-black text-white">Payment, delivery and shelf entry</h2>
      <div className="mt-5 space-y-3">
        {orders.length===0&&<p className="text-sm text-slate-500">No Store stock orders yet. Start with a product above.</p>}
        {orders.slice(0,12).map(order=>{
          const remaining=Math.max(0,Number(order.package_count)-Number(order.sold_packages||0))
          return <div key={order.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-black text-white">{productName(order.variant_id)} · {order.box_count} carton{Number(order.box_count)===1?'':'s'}</p>
                <p className="mt-1 text-xs text-slate-500">{order.payment_reference} · {order.payment_status} · {order.fulfillment_status} · {remaining} packs remaining</p>
              </div>
              <p className="text-sm font-black text-emerald-300">{money(order.total_ngn)}</p>
            </div>
            {['pending','rejected'].includes(order.payment_status)&&<div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input value={proof[order.id]||''} onChange={e=>setProof(p=>({...p,[order.id]:e.target.value}))} placeholder={`OPay receipt / transaction reference · ${order.opay_account_number}`}/>
              <Button onClick={()=>submitProof(order)} disabled={working===`proof:${order.id}`}>Submit proof</Button>
            </div>}
            {order.fulfillment_status==='delivered'&&<Button className="mt-3" onClick={()=>confirmReceipt(order)} disabled={working===`receive:${order.id}`}><PackageCheck className="mr-2 h-4 w-4"/>Confirm cartons received</Button>}
          </div>
        })}
      </div>
    </section>

    <section className="rounded-[2rem] border border-emerald-300/15 bg-emerald-300/[.04] p-6">
      <p className="text-[10px] font-black uppercase tracking-[.23em] text-emerald-300">Agent operating cycle</p>
      <div className="mt-4 grid gap-3 md:grid-cols-6">
        {['Order cartons','Pay','Receive','Sell packs','Sell out','Return tomorrow'].map((step,index)=><div key={step} className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-xs font-black text-emerald-300">0{index+1}</p><p className="mt-2 text-sm font-bold text-white">{step}</p></div>)}
      </div>
    </section>
  </div>
}
