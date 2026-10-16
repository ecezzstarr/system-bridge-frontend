'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, Clipboard, ExternalLink, Image as ImageIcon, Loader2, Package, RefreshCw, Share2, ShoppingBag, Users, WalletCards } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Door = {
  referralCode:string
  agentName:string
  publicUrl:string
  shareImageUrl:string
  bridgerInfoUrl:string
  bridgerJoinUrl:string
  shareText:string
}

type Availability = {variantId:string;availablePackages:number;retailUnitPriceNgn:number}
type CarrierOrder = {
  id:string
  variant_id:string
  quantity_packages:number
  unit_price_ngn:number|string
  total_ngn:number|string
  customer_name:string
  customer_phone:string
  delivery_location:string
  customer_note?:string|null
  status:'awaiting_payment_verification'|'requested'|'fulfilled'|'cancelled'
  payment_method:string
  payment_reference?:string|null
  opay_transaction_reference?:string|null
  payment_status:'proof_submitted'|'paid'|'rejected'|string
  payment_verified_at?:string|null
  payment_admin_note?:string|null
  created_at:string
}
type FoodCarrierData = {
  door:Door
  availability:Availability[]
  orders:CarrierOrder[]
  stats:{unique_views:number;shares:number;payment_verification:number;open_orders:number;fulfilled_revenue_ngn:number|string;fulfilled_packages:number}
}

type NativeShare=(data:{title?:string;text?:string;url?:string})=>Promise<void>

const money=(value:number|string)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(value||0))
const productName=(id:string)=>id==='electrolyte'?'Electrolyte':id==='classic'?'Agility':`Agility · ${id.charAt(0).toUpperCase()+id.slice(1)}`

function headers(){
  const token=typeof window!=='undefined'?localStorage.getItem('ssb_auth_token'):null
  return {'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})}
}

export default function AgentFoodCarrierConsole(){
  const [data,setData]=useState<FoodCarrierData|null>(null)
  const [loading,setLoading]=useState(true)
  const [moving,setMoving]=useState<string|null>(null)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')

  const load=async()=>{
    setLoading(true);setError('')
    try{
      const response=await fetch('/api/carrier/food',{headers:headers(),cache:'no-store'})
      const body=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(body.error||'Food Carrier Door could not open')
      setData(body)
    }catch(err){setError(err instanceof Error?err.message:'Food Carrier Door could not open')}
    finally{setLoading(false)}
  }

  useEffect(()=>{void load()},[])

  const recordShare=async(channel:string)=>{
    await fetch('/api/carrier/food',{method:'PATCH',headers:headers(),body:JSON.stringify({action:'share',channel})}).catch(()=>{})
  }

  const copyDoor=async()=>{
    if(!data?.door.publicUrl)return
    await navigator.clipboard.writeText(data.door.publicUrl)
    await recordShare('copy')
    setMessage('Carrier Door link copied.')
  }

  const copyPost=async()=>{
    if(!data?.door.shareText)return
    await navigator.clipboard.writeText(data.door.shareText)
    await recordShare('copy_post')
    setMessage('Carrier post text copied.')
  }

  const shareWhatsApp=async()=>{
    if(!data)return
    await recordShare('whatsapp')
    window.open(`https://wa.me/?text=${encodeURIComponent(data.door.shareText)}`,'_blank','noopener,noreferrer')
  }

  const shareNative=async()=>{
    if(!data)return
    const nativeShare=(navigator as unknown as {share?:NativeShare}).share
    if(nativeShare){
      await recordShare('native')
      try{await nativeShare.call(navigator,{title:'WEAVE Food Carrier',text:data.door.shareText,url:data.door.publicUrl});return}catch{}
    }
    await copyDoor()
  }

  const fulfill=async(orderId:string)=>{
    setMoving(orderId);setError('');setMessage('')
    try{
      const response=await fetch('/api/carrier/food',{method:'PATCH',headers:headers(),body:JSON.stringify({orderId,action:'fulfill'})})
      const body=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(body.error||'Order could not move')
      setMessage(`Sale completed${body.revenueNgn?` · ${money(body.revenueNgn)}`:''}.`)
      await load()
    }catch(err){setError(err instanceof Error?err.message:'Order could not move')}
    finally{setMoving(null)}
  }

  if(loading)return <div className="flex min-h-[520px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-300"/></div>
  if(error&&!data)return <main className="mx-auto max-w-4xl px-4 py-12 text-white"><Link href="/weave/carrier" className="text-xs text-slate-500">← Carrier</Link><h1 className="mt-6 text-3xl font-black">FOOD CARRIER DOOR</h1><p className="mt-3 text-sm text-red-300">{error}</p></main>

  return <main className="mx-auto max-w-6xl px-4 py-8 text-white md:px-7 md:py-12" data-agent-food-carrier="true">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/weave/carrier" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-white"><ArrowLeft className="h-4 w-4"/>Carrier</Link>
      <Button onClick={()=>void load()} variant="outline" className="border-white/15 text-slate-200"><RefreshCw className="mr-2 h-4 w-4"/>REFRESH</Button>
    </div>

    <header className="mt-5 border-b border-emerald-300/15 pb-7">
      <p className="text-[10px] font-black uppercase tracking-[.28em] text-emerald-300">Ace · Carrier · Agent instrument</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-6xl">FOOD CARRIER DOOR</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Share one permanent link for Agility and Electrolyte. Customers pay WEAVE first. Administration verifies the OPay payment before the order becomes actionable here. The same Door explains the Bridger position before registration.</p>
    </header>

    {message&&<div className="mt-5 border border-emerald-300/20 bg-emerald-300/[.06] px-4 py-3 text-sm text-emerald-100">{message}</div>}
    {error&&<div className="mt-5 border border-red-300/20 bg-red-300/[.05] px-4 py-3 text-sm text-red-200">{error}</div>}

    <section className="mt-7 grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
      <div className="border border-white/10 bg-black/20 p-5 sm:p-6">
        <p className="text-[9px] font-black uppercase tracking-[.24em] text-sky-300">Your permanent Carrier link</p>
        <p className="mt-3 break-all text-sm font-bold text-white">{data?.door.publicUrl}</p>
        <p className="mt-2 text-xs text-slate-500">Referral identity · {data?.door.referralCode}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={()=>void copyDoor()} className="bg-sky-300 font-black text-slate-950 hover:bg-sky-200"><Clipboard className="mr-2 h-4 w-4"/>COPY LINK</Button>
          <Button onClick={()=>void shareWhatsApp()} variant="outline" className="border-white/15 text-white"><Share2 className="mr-2 h-4 w-4"/>WHATSAPP</Button>
          <Button onClick={()=>void shareNative()} variant="outline" className="border-white/15 text-white"><Share2 className="mr-2 h-4 w-4"/>SHARE</Button>
          <Button asChild variant="outline" className="border-white/15 text-white"><a href={data?.door.publicUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4"/>OPEN DOOR</a></Button>
        </div>
        <div className="mt-5 border-t border-white/10 pt-5">
          <p className="text-[9px] font-black uppercase tracking-[.2em] text-amber-300">Post with image</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">The public link carries the Agility + Electrolyte social image. Customers can buy, or open the Bridger explanation from the same Door.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild variant="outline" className="border-amber-300/20 text-amber-100"><a href={data?.door.shareImageUrl} target="_blank" rel="noreferrer"><ImageIcon className="mr-2 h-4 w-4"/>OPEN SHARE IMAGE</a></Button>
            <Button onClick={()=>void copyPost()} variant="outline" className="border-white/15 text-white"><Clipboard className="mr-2 h-4 w-4"/>COPY POST TEXT</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 border border-white/10 bg-black/20">
        <div className="border-b border-r border-white/10 p-4"><Users className="h-4 w-4 text-sky-300"/><p className="mt-2 text-2xl font-black">{Number(data?.stats.unique_views||0)}</p><p className="mt-1 text-[8px] font-black uppercase tracking-wider text-slate-600">Door reach</p></div>
        <div className="border-b border-white/10 p-4"><Share2 className="h-4 w-4 text-violet-300"/><p className="mt-2 text-2xl font-black">{Number(data?.stats.shares||0)}</p><p className="mt-1 text-[8px] font-black uppercase tracking-wider text-slate-600">Shares</p></div>
        <div className="border-r border-white/10 p-4"><WalletCards className="h-4 w-4 text-amber-300"/><p className="mt-2 text-2xl font-black">{Number(data?.stats.payment_verification||0)}</p><p className="mt-1 text-[8px] font-black uppercase tracking-wider text-slate-600">Payment verification</p></div>
        <div className="p-4"><ShoppingBag className="h-4 w-4 text-emerald-300"/><p className="mt-2 text-2xl font-black">{Number(data?.stats.open_orders||0)}</p><p className="mt-1 text-[8px] font-black uppercase tracking-wider text-slate-600">Paid orders ready</p></div>
      </div>
    </section>

    <section className="mt-7 border-y border-white/10 py-6 sm:border sm:p-6">
      <div className="flex items-center gap-2"><Package className="h-4 w-4 text-emerald-300"/><p className="text-[9px] font-black uppercase tracking-[.22em] text-emerald-300">Stock visible through the door</p></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(data?.availability||[]).map(item=><div key={item.variantId} className={`border p-4 ${item.variantId==='electrolyte'?'border-emerald-300/20 bg-emerald-300/[.035]':'border-orange-300/20 bg-orange-300/[.035]'}`}><p className="font-black">{productName(item.variantId)}</p><p className="mt-2 text-2xl font-black">{item.availablePackages}</p><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">packs free for Carrier</p><p className="mt-3 text-xs text-slate-400">{money(item.retailUnitPriceNgn)} / pack</p></div>)}
        {!data?.availability?.length&&<p className="text-sm text-slate-500">No received stock is free for Carrier orders. Buy/receive cartons in Agent Distribution first.</p>}
      </div>
      <Button asChild className="mt-5 bg-emerald-300 font-black text-slate-950 hover:bg-emerald-200"><Link href="/agent/distribution">OPEN AGENT DISTRIBUTION</Link></Button>
    </section>

    <section className="mt-7">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.22em] text-amber-300">Carrier orders</p><h2 className="mt-1 text-2xl font-black">CUSTOMERS FROM YOUR LINK</h2></div><p className="max-w-xl text-xs leading-5 text-slate-500">A customer first pays WEAVE. Payment-proof orders remain locked while Administration verifies them. Only a verified paid order can be fulfilled.</p></div>
      <div className="mt-4 space-y-3">
        {(data?.orders||[]).map(order=>{
          const waiting=order.status==='awaiting_payment_verification'
          const ready=order.status==='requested'&&order.payment_status==='paid'
          return <article key={order.id} className="border border-white/10 bg-black/15 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><p className="font-black">{productName(order.variant_id)} · {order.quantity_packages} pack{order.quantity_packages===1?'':'s'}</p><span className={`px-2 py-1 text-[8px] font-black uppercase ${order.status==='fulfilled'?'bg-emerald-300/10 text-emerald-300':order.status==='cancelled'?'bg-red-300/10 text-red-300':waiting?'bg-amber-300/10 text-amber-300':'bg-sky-300/10 text-sky-300'}`}>{waiting?'payment verification':ready?'paid · ready':order.status}</span></div>
                <p className="mt-2 text-sm font-bold text-white">{order.customer_name} · {order.customer_phone}</p>
                <p className="mt-1 text-xs text-slate-500">{order.delivery_location}</p>
                {order.customer_note&&<p className="mt-1 text-xs text-slate-600">{order.customer_note}</p>}
                <div className="mt-3 grid gap-2 text-[10px] text-slate-500 sm:grid-cols-2">
                  <p>WEAVE payment ref · <span className="text-slate-300">{order.payment_reference||'—'}</span></p>
                  <p>Customer OPay ref · <span className="text-slate-300">{order.opay_transaction_reference||'—'}</span></p>
                </div>
                {waiting&&<p className="mt-3 text-xs text-amber-200">Administration is verifying this payment. Do not deliver yet.</p>}
                {order.status==='cancelled'&&order.payment_admin_note&&<p className="mt-3 text-xs text-red-200">Administration note: {order.payment_admin_note}</p>}
              </div>
              <div className="text-right"><p className="text-xl font-black">{money(order.total_ngn)}</p><p className="mt-1 text-[8px] uppercase tracking-wider text-slate-600">{new Date(order.created_at).toLocaleString()}</p></div>
            </div>
            {ready&&<div className="mt-4 border-t border-white/10 pt-4"><Button onClick={()=>void fulfill(order.id)} disabled={moving===order.id} className="bg-emerald-300 font-black text-slate-950 hover:bg-emerald-200"><CheckCircle2 className="mr-2 h-4 w-4"/>{moving===order.id?'MOVING…':'DELIVERED / PICKED UP'}</Button></div>}
          </article>
        })}
        {!data?.orders?.length&&<div className="border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">Share your Carrier Door. Paid customer orders will appear here.</div>}
      </div>
    </section>

    <section className="mt-8 border border-cyan-300/20 bg-cyan-300/[.035] p-6">
      <p className="text-[9px] font-black uppercase tracking-[.22em] text-cyan-300">Bridger formation through the same door</p>
      <h2 className="mt-2 text-2xl font-black">YOUR CARRIER EXPLAINS THE RELATIONSHIP BEFORE REGISTRATION</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">A person first sees what a Bridger is, how the Bridger earns, and how you earn as the attached Agent. Only after that explanation do they continue into Bridger registration with your referral identity carried.</p>
      <Button asChild variant="outline" className="mt-4 border-cyan-300/25 text-cyan-100"><a href={data?.door.bridgerInfoUrl} target="_blank" rel="noreferrer">TEST BRIDGER EXPLANATION <ExternalLink className="ml-2 h-4 w-4"/></a></Button>
    </section>
  </main>
}
