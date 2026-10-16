'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, Clipboard, ExternalLink, Image as ImageIcon, Loader2, Package, RefreshCw, Share2, ShoppingBag, Users, WalletCards, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Door={referralCode:string;agentName:string;publicUrl:string;shareImageUrl:string;bridgerInfoUrl:string;shareText:string}
type Availability={variantId:string;availablePackages:number;weaveRetailUnitPriceNgn:number;agentUnitCostNgn:number;agentSellingUnitPriceNgn:number;agentMarginPerPackageNgn:number}
type PaymentAccount={bank_name:string;account_number:string;account_name:string;payment_note?:string|null}
type CarrierOrder={
  id:string;variant_id:string;quantity_packages:number;unit_price_ngn:number|string;total_ngn:number|string
  weave_unit_price_ngn?:number|string|null;agent_unit_cost_ngn?:number|string|null;agent_margin_ngn?:number|string|null
  customer_name:string;customer_phone:string;delivery_location:string;customer_note?:string|null
  status:string;payment_reference?:string|null;opay_transaction_reference?:string|null;payment_status:string;payment_verified_at?:string|null;payment_admin_note?:string|null;created_at:string
}
type FoodCarrierData={
  door:Door;paymentAccount:PaymentAccount|null;availability:Availability[];orders:CarrierOrder[]
  stats:{unique_views:number;shares:number;payment_verification:number;open_orders:number;fulfilled_revenue_ngn:number|string;fulfilled_margin_ngn:number|string;fulfilled_packages:number}
}
type NativeShare=(data:{title?:string;text?:string;url?:string})=>Promise<void>

const money=(value:number|string)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(value||0))
const productName=(id:string)=>id==='electrolyte'?'Electrolyte':id==='classic'?'Agility':`Agility · ${id.charAt(0).toUpperCase()+id.slice(1)}`
function headers(){const token=typeof window!=='undefined'?localStorage.getItem('ssb_auth_token'):null;return {'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})}}

export default function AgentFoodCarrierConsole(){
  const [data,setData]=useState<FoodCarrierData|null>(null)
  const [loading,setLoading]=useState(true)
  const [moving,setMoving]=useState<string|null>(null)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [bankName,setBankName]=useState('')
  const [accountNumber,setAccountNumber]=useState('')
  const [accountName,setAccountName]=useState('')
  const [paymentNote,setPaymentNote]=useState('')
  const [prices,setPrices]=useState<Record<string,string>>({})

  const load=async()=>{
    setLoading(true);setError('')
    try{
      const response=await fetch('/api/carrier/food',{headers:headers(),cache:'no-store'})
      const body=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(body.error||'Food Carrier Door could not open')
      setData(body)
      if(body.paymentAccount){setBankName(body.paymentAccount.bank_name||'');setAccountNumber(body.paymentAccount.account_number||'');setAccountName(body.paymentAccount.account_name||'');setPaymentNote(body.paymentAccount.payment_note||'')}
      setPrices(Object.fromEntries((body.availability||[]).map((item:Availability)=>[item.variantId,String(item.agentSellingUnitPriceNgn)])))
    }catch(err){setError(err instanceof Error?err.message:'Food Carrier Door could not open')}
    finally{setLoading(false)}
  }

  useEffect(()=>{void load()},[])

  const patch=async(payload:Record<string,unknown>)=>{
    const response=await fetch('/api/carrier/food',{method:'PATCH',headers:headers(),body:JSON.stringify(payload)})
    const body=await response.json().catch(()=>({}))
    if(!response.ok)throw new Error(body.error||'Carrier movement failed')
    return body
  }

  const savePaymentAccount=async()=>{
    setMoving('account');setError('');setMessage('')
    try{const body=await patch({action:'save_payment_account',bankName,accountNumber,accountName,paymentNote});setMessage(body.message||'Customer receiving account saved.');await load()}catch(err){setError(err instanceof Error?err.message:'Unable to save receiving account')}finally{setMoving(null)}
  }

  const savePrice=async(item:Availability)=>{
    setMoving(`price-${item.variantId}`);setError('');setMessage('')
    try{const body=await patch({action:'set_price',variantId:item.variantId,sellingUnitPriceNgn:Number(prices[item.variantId])});setMessage(body.message||'Selling price updated.');await load()}catch(err){setError(err instanceof Error?err.message:'Unable to update selling price')}finally{setMoving(null)}
  }

  const verifyPayment=async(order:CarrierOrder,decision:'approve'|'reject')=>{
    setMoving(order.id);setError('');setMessage('')
    try{const body=await patch({action:'verify_payment',orderId:order.id,decision});setMessage(body.message||'Customer payment updated.');await load()}catch(err){setError(err instanceof Error?err.message:'Unable to verify customer payment')}finally{setMoving(null)}
  }

  const fulfill=async(orderId:string)=>{
    setMoving(orderId);setError('');setMessage('')
    try{const body=await patch({action:'fulfill',orderId});setMessage(`Sale completed${body.revenueNgn?` · ${money(body.revenueNgn)}`:''}.`);await load()}catch(err){setError(err instanceof Error?err.message:'Order could not move')}finally{setMoving(null)}
  }

  const recordShare=async(channel:string)=>{await patch({action:'share',channel}).catch(()=>{})}
  const copyDoor=async()=>{if(!data?.door.publicUrl)return;await navigator.clipboard.writeText(data.door.publicUrl);await recordShare('copy');setMessage('Carrier Door link copied.')}
  const copyPost=async()=>{if(!data?.door.shareText)return;await navigator.clipboard.writeText(data.door.shareText);await recordShare('copy_post');setMessage('Carrier post text copied.')}
  const shareWhatsApp=async()=>{if(!data)return;await recordShare('whatsapp');window.open(`https://wa.me/?text=${encodeURIComponent(data.door.shareText)}`,'_blank','noopener,noreferrer')}
  const shareNative=async()=>{if(!data)return;const nativeShare=(navigator as unknown as {share?:NativeShare}).share;if(nativeShare){await recordShare('native');try{await nativeShare.call(navigator,{title:'WEAVE Food Carrier',text:data.door.shareText,url:data.door.publicUrl});return}catch{}}await copyDoor()}

  const waiting=useMemo(()=>data?.orders.filter(order=>order.status==='awaiting_payment_verification')||[],[data?.orders])

  if(loading)return <div className="flex min-h-[520px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-300"/></div>
  if(error&&!data)return <main className="mx-auto max-w-4xl px-4 py-12 text-white"><Link href="/weave/carrier" className="text-xs text-slate-500">← Carrier</Link><h1 className="mt-6 text-3xl font-black">FOOD CARRIER DOOR</h1><p className="mt-3 text-sm text-red-300">{error}</p></main>

  return <main className="mx-auto max-w-6xl px-4 py-8 text-white md:px-7 md:py-12" data-agent-food-carrier="true">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/weave/carrier" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-white"><ArrowLeft className="h-4 w-4"/>Carrier</Link><Button onClick={()=>void load()} variant="outline" className="border-white/15 text-slate-200"><RefreshCw className="mr-2 h-4 w-4"/>REFRESH</Button></div>

    <header className="mt-5 border-b border-emerald-300/15 pb-7"><p className="text-[10px] font-black uppercase tracking-[.28em] text-emerald-300">Ace · Carrier · Agent instrument</p><h1 className="mt-2 text-4xl font-black sm:text-6xl">FOOD CARRIER DOOR</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">The money movement is separated correctly: <strong className="text-white">you pay WEAVE for WEAVE stock</strong>; then you set your own customer selling price; the <strong className="text-white">customer pays your Agent receiving account</strong>; you verify that customer payment before delivery or pickup.</p></header>

    {message&&<div className="mt-5 border border-emerald-300/20 bg-emerald-300/[.06] px-4 py-3 text-sm text-emerald-100">{message}</div>}
    {error&&<div className="mt-5 border border-red-300/20 bg-red-300/[.05] px-4 py-3 text-sm text-red-200">{error}</div>}

    <section className="mt-7 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
      <div className="border border-white/10 bg-black/20 p-5 sm:p-6"><p className="text-[9px] font-black uppercase tracking-[.24em] text-sky-300">Permanent Carrier link</p><p className="mt-3 break-all text-sm font-bold">{data?.door.publicUrl}</p><div className="mt-5 flex flex-wrap gap-2"><Button onClick={()=>void copyDoor()} className="bg-sky-300 font-black text-slate-950 hover:bg-sky-200"><Clipboard className="mr-2 h-4 w-4"/>COPY LINK</Button><Button onClick={()=>void shareWhatsApp()} variant="outline" className="border-white/15 text-white"><Share2 className="mr-2 h-4 w-4"/>WHATSAPP</Button><Button onClick={()=>void shareNative()} variant="outline" className="border-white/15 text-white"><Share2 className="mr-2 h-4 w-4"/>SHARE</Button><Button asChild variant="outline" className="border-white/15 text-white"><a href={data?.door.publicUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4"/>OPEN DOOR</a></Button></div><div className="mt-4 flex gap-2"><Button asChild variant="outline" className="border-amber-300/20 text-amber-100"><a href={data?.door.shareImageUrl} target="_blank" rel="noreferrer"><ImageIcon className="mr-2 h-4 w-4"/>SHARE IMAGE</a></Button><Button onClick={()=>void copyPost()} variant="outline" className="border-white/15 text-white"><Clipboard className="mr-2 h-4 w-4"/>COPY POST</Button></div></div>
      <div className="grid grid-cols-2 border border-white/10 bg-black/20"><div className="border-b border-r border-white/10 p-4"><Users className="h-4 w-4 text-sky-300"/><p className="mt-2 text-2xl font-black">{Number(data?.stats.unique_views||0)}</p><p className="text-[8px] uppercase tracking-wider text-slate-600">Door reach</p></div><div className="border-b border-white/10 p-4"><WalletCards className="h-4 w-4 text-amber-300"/><p className="mt-2 text-2xl font-black">{waiting.length}</p><p className="text-[8px] uppercase tracking-wider text-slate-600">Payments to verify</p></div><div className="border-r border-white/10 p-4"><ShoppingBag className="h-4 w-4 text-emerald-300"/><p className="mt-2 text-2xl font-black">{Number(data?.stats.open_orders||0)}</p><p className="text-[8px] uppercase tracking-wider text-slate-600">Paid orders ready</p></div><div className="p-4"><CheckCircle2 className="h-4 w-4 text-emerald-300"/><p className="mt-2 text-xl font-black">{money(data?.stats.fulfilled_margin_ngn||0)}</p><p className="text-[8px] uppercase tracking-wider text-slate-600">Recorded Agent margin</p></div></div>
    </section>

    <section className="mt-7 border border-amber-300/20 bg-amber-300/[.035] p-5 sm:p-6"><p className="text-[9px] font-black uppercase tracking-[.22em] text-amber-300">Customer receiving account</p><h2 className="mt-2 text-2xl font-black">WHERE YOUR CUSTOMERS PAY YOU</h2><p className="mt-2 text-sm leading-6 text-slate-400">Enter only receiving details. WEAVE never needs your banking login, PIN or password.</p><div className="mt-4 grid gap-3 md:grid-cols-2"><Input value={bankName} onChange={e=>setBankName(e.target.value)} placeholder="Bank / OPay name" className="border-white/10 bg-black/25 text-white"/><Input value={accountNumber} onChange={e=>setAccountNumber(e.target.value)} placeholder="Account number" className="border-white/10 bg-black/25 text-white"/><Input value={accountName} onChange={e=>setAccountName(e.target.value)} placeholder="Account name" className="border-white/10 bg-black/25 text-white"/><Input value={paymentNote} onChange={e=>setPaymentNote(e.target.value)} placeholder="Payment note · optional" className="border-white/10 bg-black/25 text-white"/></div><Button onClick={()=>void savePaymentAccount()} disabled={moving==='account'} className="mt-4 bg-amber-300 font-black text-slate-950 hover:bg-amber-200">{moving==='account'?'SAVING…':'SAVE CUSTOMER RECEIVING ACCOUNT'}</Button></section>

    <section className="mt-7 border border-white/10 bg-black/15 p-5 sm:p-6"><div className="flex items-center gap-2"><Package className="h-4 w-4 text-emerald-300"/><p className="text-[9px] font-black uppercase tracking-[.22em] text-emerald-300">Paid WEAVE stock + your customer price</p></div><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Only stock you already paid WEAVE for and received can appear here. Set the customer price at or above the current WEAVE retail reference. The difference above your Agent unit cost is your recorded gross margin.</p><div className="mt-5 grid gap-3 lg:grid-cols-2">
      {(data?.availability||[]).map(item=><article key={item.variantId} className="border border-white/10 bg-black/20 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black">{productName(item.variantId)}</p><p className="mt-1 text-xs text-slate-500">{item.availablePackages} packs available · Agent cost {money(item.agentUnitCostNgn)} · WEAVE retail reference {money(item.weaveRetailUnitPriceNgn)}</p></div><p className="text-sm font-black text-emerald-300">Margin {money(item.agentMarginPerPackageNgn)}/pack</p></div><div className="mt-4 flex gap-2"><Input type="number" min={item.weaveRetailUnitPriceNgn} value={prices[item.variantId]||''} onChange={e=>setPrices(current=>({...current,[item.variantId]:e.target.value}))} className="border-white/10 bg-black/25 text-white"/><Button onClick={()=>void savePrice(item)} disabled={moving===`price-${item.variantId}`} variant="outline" className="border-emerald-300/20 text-emerald-100">SET CUSTOMER PRICE</Button></div></article>)}
      {!data?.availability?.length&&<p className="text-sm text-slate-500">No paid and received stock is available. Buy WEAVE stock first.</p>}
    </div><div className="mt-5 flex flex-wrap gap-2"><Button asChild className="bg-emerald-300 font-black text-slate-950 hover:bg-emerald-200"><Link href="/agility">BUY / PAY WEAVE FOR STOCK</Link></Button><Button asChild variant="outline" className="border-white/15 text-white"><Link href="/agent/distribution">OPEN DISTRIBUTION</Link></Button></div></section>

    <section className="mt-7"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.22em] text-amber-300">Customer orders</p><h2 className="mt-1 text-2xl font-black">PAYMENT TO YOU → VERIFY → DELIVER</h2></div><p className="max-w-xl text-xs leading-5 text-slate-500">A customer submits the transfer reference from your receiving account. Check your own account, then approve or reject it. WEAVE does not verify money that was paid to you.</p></div><div className="mt-4 space-y-3">
      {(data?.orders||[]).map(order=>{const verify=order.status==='awaiting_payment_verification';const ready=order.status==='requested'&&order.payment_status==='paid';return <article key={order.id} className="border border-white/10 bg-black/15 p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-black">{productName(order.variant_id)} · {order.quantity_packages} pack{order.quantity_packages===1?'':'s'}</p><span className={`px-2 py-1 text-[8px] font-black uppercase ${order.status==='fulfilled'?'bg-emerald-300/10 text-emerald-300':order.status==='cancelled'?'bg-red-300/10 text-red-300':verify?'bg-amber-300/10 text-amber-300':'bg-sky-300/10 text-sky-300'}`}>{verify?'customer payment to verify':ready?'paid · ready':order.status}</span></div><p className="mt-2 text-sm font-bold">{order.customer_name} · {order.customer_phone}</p><p className="mt-1 text-xs text-slate-500">{order.delivery_location}</p><div className="mt-3 grid gap-2 text-[10px] text-slate-500 sm:grid-cols-2"><p>Carrier ref · <span className="text-slate-300">{order.payment_reference||'—'}</span></p><p>Customer transfer ref · <span className="text-slate-300">{order.opay_transaction_reference||'—'}</span></p></div>{order.agent_margin_ngn!=null&&<p className="mt-2 text-xs text-emerald-300">Recorded gross margin on this order · {money(order.agent_margin_ngn)}</p>}{order.payment_admin_note&&order.status==='cancelled'&&<p className="mt-2 text-xs text-red-200">Payment note · {order.payment_admin_note}</p>}</div><div className="text-right"><p className="text-xl font-black">{money(order.total_ngn)}</p><p className="mt-1 text-[8px] uppercase tracking-wider text-slate-600">{new Date(order.created_at).toLocaleString()}</p></div></div>{verify&&<div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4"><Button onClick={()=>void verifyPayment(order,'approve')} disabled={moving===order.id} className="bg-emerald-300 font-black text-slate-950 hover:bg-emerald-200"><CheckCircle2 className="mr-2 h-4 w-4"/>I RECEIVED THIS PAYMENT</Button><Button onClick={()=>void verifyPayment(order,'reject')} disabled={moving===order.id} variant="outline" className="border-red-300/20 text-red-200"><XCircle className="mr-2 h-4 w-4"/>REJECT REFERENCE</Button></div>}{ready&&<div className="mt-4 border-t border-white/10 pt-4"><Button onClick={()=>void fulfill(order.id)} disabled={moving===order.id} className="bg-emerald-300 font-black text-slate-950 hover:bg-emerald-200"><CheckCircle2 className="mr-2 h-4 w-4"/>DELIVERED / PICKED UP</Button></div>}</article>})}
      {!data?.orders?.length&&<div className="border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">Share your Carrier Door. Customer payment submissions will arrive here.</div>}
    </div></section>

    <section className="mt-8 border border-cyan-300/20 bg-cyan-300/[.035] p-6"><p className="text-[9px] font-black uppercase tracking-[.22em] text-cyan-300">Bridger formation through the same door</p><h2 className="mt-2 text-2xl font-black">PEOPLE UNDERSTAND BEFORE THEY REGISTER</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">The Carrier explains what a Bridger is, how the Bridger earns, and how you earn as the attached Agent before registration.</p><Button asChild variant="outline" className="mt-4 border-cyan-300/25 text-cyan-100"><a href={data?.door.bridgerInfoUrl} target="_blank" rel="noreferrer">TEST BRIDGER EXPLANATION <ExternalLink className="ml-2 h-4 w-4"/></a></Button></section>
  </main>
}
