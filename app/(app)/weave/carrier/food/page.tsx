'use client'
import { AgentFoodPricingInfo, FarmToFamilySettlementInfo, DaisyPricingInfo } from '@/components/weave-food/food-program-info'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, Clipboard, ExternalLink, Image as ImageIcon, Loader2, Package, RefreshCw, Share2, ShoppingBag, Truck, Users, WalletCards, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AGILITY_VARIANTS } from '@/lib/agility-catalog'

type Door={referralCode:string;agentName:string;publicUrl:string;shareImageUrl:string;bridgerInfoUrl:string;bridgerJoinUrl:string;shareText:string}
type PaymentAccount={bank_name:string;account_number:string;account_name:string;payment_note?:string|null}
type Availability={variantId:string;availablePackages:number;weaveAgentUnitPriceNgn:number;agentUnitCostNgn:number;agentSellingUnitPriceNgn:number;retailUnitPriceNgn:number;agentMarginPerPackageNgn:number;customerPriceLocked:boolean}
type CarrierOrder={
  id:string;variant_id:string;quantity_packages:number;unit_price_ngn:number|string;food_subtotal_ngn:number|string;waybill_fee_ngn:number|string;total_ngn:number|string;
  customer_name:string;customer_phone:string;delivery_mode:'local'|'waybill';delivery_location:string;customer_note?:string|null;status:string;
  payment_bank_name?:string|null;payment_account_number:string;payment_account_name?:string|null;payment_reference?:string|null;opay_transaction_reference?:string|null;
  payment_status:string;payment_verified_at?:string|null;payment_admin_note?:string|null;agent_margin_ngn:number|string;created_at:string
}
type FoodCarrierData={
  door:Door;paymentAccount:PaymentAccount|null;availability:Availability[];orders:CarrierOrder[];
  stats:{unique_views:number;shares:number;payment_verification:number;open_orders:number;fulfilled_food_revenue_ngn:number|string;fulfilled_customer_paid_ngn:number|string;fulfilled_waybill_fees_ngn:number|string;fulfilled_margin_ngn:number|string;fulfilled_packages:number}
}
type NativeShare=(data:{title?:string;text?:string;url?:string})=>Promise<void>

const money=(value:number|string)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(value||0))
const productName=(id:string)=>AGILITY_VARIANTS.find(v=>v.id===id)?.name||id
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
      const account=body.paymentAccount
      if(account){setBankName(account.bank_name||'');setAccountNumber(account.account_number||'');setAccountName(account.account_name||'');setPaymentNote(account.payment_note||'')}
      setPrices(Object.fromEntries((body.availability||[]).map((item:Availability)=>[item.variantId,String(item.agentSellingUnitPriceNgn)])))
    }catch(err){setError(err instanceof Error?err.message:'Food Carrier Door could not open')}
    finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[])

  const patch=async(body:Record<string,unknown>,key:string)=>{
    setMoving(key);setError('');setMessage('')
    try{
      const response=await fetch('/api/carrier/food',{method:'PATCH',headers:headers(),body:JSON.stringify(body)})
      const result=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(result.error||'Carrier movement failed')
      setMessage(result.message||'Carrier updated.')
      await load()
    }catch(err){setError(err instanceof Error?err.message:'Carrier movement failed')}
    finally{setMoving(null)}
  }

  const saveAccount=()=>patch({action:'save_payment_account',bankName,accountNumber,accountName,paymentNote},'account')
  const setPrice=(item:Availability)=>patch({action:'set_price',variantId:item.variantId,sellingUnitPriceNgn:Number(prices[item.variantId])},`price:${item.variantId}`)
  const verify=(order:CarrierOrder,decision:'approve'|'reject')=>patch({action:'verify_payment',orderId:order.id,decision},`${decision}:${order.id}`)
  const fulfill=(order:CarrierOrder)=>patch({action:'fulfill',orderId:order.id},`fulfill:${order.id}`)

  const copyDoor=async()=>{if(!data?.door.publicUrl)return;await navigator.clipboard.writeText(data.door.publicUrl);void patch({action:'share',channel:'copy'},'share-copy')}
  const copyPost=async()=>{if(!data?.door.shareText)return;await navigator.clipboard.writeText(data.door.shareText);void patch({action:'share',channel:'copy_post'},'share-post')}
  const shareWhatsApp=()=>{if(!data)return;void fetch('/api/carrier/food',{method:'PATCH',headers:headers(),body:JSON.stringify({action:'share',channel:'whatsapp'})});window.open(`https://wa.me/?text=${encodeURIComponent(data.door.shareText)}`,'_blank','noopener,noreferrer')}
  const shareNative=async()=>{if(!data)return;const nativeShare=(navigator as unknown as {share?:NativeShare}).share;if(nativeShare){try{await nativeShare.call(navigator,{title:'WEAVE Food Carrier',text:data.door.shareText,url:data.door.publicUrl});return}catch{}}await navigator.clipboard.writeText(data.door.publicUrl)}

  if(loading)return <div className="flex min-h-[520px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-300"/></div>
  if(error&&!data)return <main className="mx-auto max-w-4xl px-4 py-12 text-white"><Link href="/weave/carrier" className="text-xs text-slate-500">← Carrier</Link><h1 className="mt-6 text-3xl font-black">FOOD CARRIER DOOR</h1><p className="mt-3 text-sm text-red-300">{error}</p></main>

  return <main className="mx-auto max-w-6xl px-4 py-8 text-white md:px-7 md:py-12" data-agent-food-carrier="true">
    <Link href="/food-store" className="mb-4 inline-flex border border-emerald-300/30 px-4 py-3 text-xs font-black text-emerald-200">Open branded WEAVE Family Food Store · groceries + ready baskets + Daisy</Link>
    <div className="mt-6 space-y-4" data-agent-carrier-all-food-info><AgentFoodPricingInfo/><DaisyPricingInfo/><FarmToFamilySettlementInfo audience="seller"/></div>
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/weave/carrier" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-white"><ArrowLeft className="h-4 w-4"/>Carrier</Link><Button onClick={()=>void load()} variant="outline" className="border-white/15 text-slate-200"><RefreshCw className="mr-2 h-4 w-4"/>REFRESH</Button></div>

    <header className="mt-5 border-b border-emerald-300/15 pb-7">
      <p className="text-[10px] font-black uppercase tracking-[.28em] text-emerald-300">Ace · Carrier · Agent instrument</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-6xl">FOOD CARRIER DOOR</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">You pay WEAVE ₦3,000 per unit of Agility or Electrolyte stock and sell each pack or bowl at the official ₦4,000 price. You earn ₦1,000 per unit: ₦5,000 per half carton (5), ₦10,000 per full carton (10). Prices are fixed; delivery waybill is separate.</p>
    </header>

    <section className="mt-5 grid gap-3 sm:grid-cols-3" data-weave-official-food-earnings>
      <div className="border border-emerald-300/20 p-4"><p className="text-xs text-stone-400">Customer price per pack or bowl</p><p className="mt-2 text-2xl font-black text-white">₦4,000</p></div>
      <div className="border border-emerald-300/20 p-4"><p className="text-xs text-stone-400">Agent margin per sale</p><p className="mt-2 text-2xl font-black text-emerald-200">₦1,000</p></div>
      <div className="border border-emerald-300/20 p-4"><p className="text-xs text-stone-400">Agent margin per carton (10)</p><p className="mt-2 text-2xl font-black text-emerald-200">₦10,000</p></div>
    </section>
    {message&&<div className="mt-5 border border-emerald-300/20 bg-emerald-300/[.06] px-4 py-3 text-sm text-emerald-100">{message}</div>}
    {error&&<div className="mt-5 border border-red-300/20 bg-red-300/[.05] px-4 py-3 text-sm text-red-200">{error}</div>}

    <section className="mt-7 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
      <div className="border border-white/10 bg-black/20 p-5 sm:p-6">
        <p className="text-[9px] font-black uppercase tracking-[.24em] text-sky-300">Your permanent Carrier link</p>
        <p className="mt-3 break-all text-sm font-bold text-white">{data?.door.publicUrl}</p>
        <p className="mt-2 text-xs text-slate-500">Referral identity · {data?.door.referralCode}</p>
        <div className="mt-5 flex flex-wrap gap-2"><Button onClick={()=>void copyDoor()} className="bg-sky-300 font-black text-slate-950 hover:bg-sky-200"><Clipboard className="mr-2 h-4 w-4"/>COPY LINK</Button><Button onClick={shareWhatsApp} variant="outline" className="border-white/15 text-white"><Share2 className="mr-2 h-4 w-4"/>WHATSAPP</Button><Button onClick={()=>void shareNative()} variant="outline" className="border-white/15 text-white"><Share2 className="mr-2 h-4 w-4"/>SHARE</Button><Button asChild variant="outline" className="border-white/15 text-white"><a href={data?.door.publicUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4"/>OPEN DOOR</a></Button></div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-5"><Button asChild variant="outline" className="border-amber-300/20 text-amber-100"><a href={data?.door.shareImageUrl} target="_blank" rel="noreferrer"><ImageIcon className="mr-2 h-4 w-4"/>OPEN SHARE IMAGE</a></Button><Button onClick={()=>void copyPost()} variant="outline" className="border-white/15 text-white"><Clipboard className="mr-2 h-4 w-4"/>COPY POST TEXT</Button><Button asChild variant="outline" className="border-violet-300/20 text-violet-100"><a href={data?.door.bridgerInfoUrl} target="_blank" rel="noreferrer"><Users className="mr-2 h-4 w-4"/>BRIDGER EXPLANATION</a></Button></div>
      </div>
      <div className="grid grid-cols-2 border border-white/10 bg-black/20"><div className="border-b border-r border-white/10 p-4"><Users className="h-4 w-4 text-sky-300"/><p className="mt-2 text-2xl font-black">{Number(data?.stats.unique_views||0)}</p><p className="mt-1 text-[8px] uppercase tracking-wider text-slate-600">Door reach</p></div><div className="border-b border-white/10 p-4"><Share2 className="h-4 w-4 text-violet-300"/><p className="mt-2 text-2xl font-black">{Number(data?.stats.shares||0)}</p><p className="mt-1 text-[8px] uppercase tracking-wider text-slate-600">Shares</p></div><div className="border-r border-white/10 p-4"><WalletCards className="h-4 w-4 text-amber-300"/><p className="mt-2 text-2xl font-black">{Number(data?.stats.payment_verification||0)}</p><p className="mt-1 text-[8px] uppercase tracking-wider text-slate-600">Payments to verify</p></div><div className="p-4"><ShoppingBag className="h-4 w-4 text-emerald-300"/><p className="mt-2 text-2xl font-black">{Number(data?.stats.open_orders||0)}</p><p className="mt-1 text-[8px] uppercase tracking-wider text-slate-600">Paid orders ready</p></div></div>
    </section>

<section className="mt-7 border border-emerald-300/20 bg-emerald-300/[.035] p-5 sm:p-6" data-carrier-farm-supply>
      <h2 className="text-xl font-black text-white">Your farm produce · Same Carrier Door</h2>
      <p className="mt-2 text-xs leading-5 text-slate-400">
        An Agent who farms manages surplus stock inside Lifestyle Farm to Family. Approved farm listings automatically appear on this exact public Carrier link along with Agility, Electrolyte and Daisy Pastries. Customers coming from WhatsApp can request farm produce without a WEAVE account.
      </p>
      <Link href="/weave/lifestyles/food" className="mt-4 inline-flex border border-emerald-300/25 px-4 py-3 text-[10px] font-black uppercase tracking-wide text-emerald-200">Manage my farm products in Lifestyle</Link>
    </section>
    <section className="mt-7 border border-white/10 bg-black/20 p-5 sm:p-6">
      <p className="text-[9px] font-black uppercase tracking-[.22em] text-emerald-300">Customer receiving account</p>
      <h2 className="mt-1 text-2xl font-black">WEAVE FOOD & DAISY CUSTOMERS PAY YOU</h2>
      <p className="mt-2 text-xs leading-5 text-slate-500">This account is for Agility, Electrolyte and Daisy Pastries customer orders only. Farm-to-Family buyers pay WEAVE instead; Administration verifies and holds their payment and releases the seller payout after buyer receipt, deducting exactly one ₦1,000 seller fee per completed farm order. Never send a farm buyer to this Agent receiving account.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2"><Input value={bankName} onChange={e=>setBankName(e.target.value)} placeholder="Bank / OPay name"/><Input value={accountNumber} onChange={e=>setAccountNumber(e.target.value)} placeholder="Account number"/><Input value={accountName} onChange={e=>setAccountName(e.target.value)} placeholder="Account name"/><Input value={paymentNote} onChange={e=>setPaymentNote(e.target.value)} placeholder="Payment note · optional"/></div>
      <Button onClick={saveAccount} disabled={moving==='account'} className="mt-4 bg-emerald-300 font-black text-slate-950 hover:bg-emerald-200">SAVE CUSTOMER RECEIVING ACCOUNT</Button>
    </section>

    <section className="mt-7 border-y border-white/10 py-6 sm:border sm:p-6">
      <div className="flex items-center gap-2"><Package className="h-4 w-4 text-emerald-300"/><p className="text-[9px] font-black uppercase tracking-[.22em] text-emerald-300">Stock visible through the door</p></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(data?.availability||[]).map(item=>{
          const electrolyte=item.variantId.startsWith('electrolyte')
          return <div key={item.variantId} className={`border p-4 ${electrolyte?'border-emerald-300/20 bg-emerald-300/[.035]':'border-orange-300/20 bg-orange-300/[.035]'}`}>
            <p className="font-black">{productName(item.variantId)}</p><p className="mt-2 text-2xl font-black">{item.availablePackages}</p><p className="text-[9px] uppercase tracking-wider text-slate-500">packs / bowls free for Carrier</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div><span className="text-slate-600">WEAVE → Agent</span><p className="font-black">{money(item.weaveAgentUnitPriceNgn)}</p></div><div><span className="text-slate-600">Agent → Customer</span><p className="font-black text-emerald-200">{money(item.agentSellingUnitPriceNgn)}</p></div></div>
            {item.customerPriceLocked?<p className="mt-3 text-[9px] font-black uppercase tracking-wider text-emerald-300">Fixed WEAVE customer price</p>:<div className="mt-3 flex gap-2"><Input type="number" min={item.agentSellingUnitPriceNgn} value={prices[item.variantId]||String(item.agentSellingUnitPriceNgn)} onChange={e=>setPrices(p=>({...p,[item.variantId]:e.target.value}))}/><Button onClick={()=>setPrice(item)} disabled={moving===`price:${item.variantId}`} variant="outline" className="border-white/15">SET</Button></div>}
          </div>
        })}
        {!data?.availability?.length&&<p className="text-sm text-slate-500">No received stock is free for Carrier orders. Buy and receive cartons in Agent Distribution first.</p>}
      </div>
      <Button asChild className="mt-5 bg-emerald-300 font-black text-slate-950 hover:bg-emerald-200"><Link href="/agent/distribution">BUY / PAY WEAVE FOR STOCK</Link></Button>
    </section>

    <section className="mt-7">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.22em] text-amber-300">Carrier orders</p><h2 className="mt-1 text-2xl font-black">CUSTOMERS FROM YOUR LINK</h2></div><p className="max-w-xl text-xs leading-5 text-slate-500">Customer pays your receiving account first. If the destination is far away, the customer total includes the waybill fee you quoted. Verify the money in your account before moving the food.</p></div>
      <div className="mt-4 space-y-3">
        {(data?.orders||[]).map(order=>{
          const waiting=order.status==='awaiting_payment_verification'
          const ready=order.status==='requested'&&order.payment_status==='paid'
          return <article key={order.id} className="border border-white/10 bg-black/15 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-black">{productName(order.variant_id)} · {order.quantity_packages}</p><span className={`px-2 py-1 text-[8px] font-black uppercase ${order.status==='fulfilled'?'bg-emerald-300/10 text-emerald-300':order.status==='cancelled'?'bg-red-300/10 text-red-300':waiting?'bg-amber-300/10 text-amber-300':'bg-sky-300/10 text-sky-300'}`}>{waiting?'payment verification':ready?'paid · ready':order.status}</span>{order.delivery_mode==='waybill'&&<span className="inline-flex items-center gap-1 bg-violet-300/10 px-2 py-1 text-[8px] font-black uppercase text-violet-200"><Truck className="h-3 w-3"/>waybill</span>}</div><p className="mt-2 text-sm font-bold">{order.customer_name} · {order.customer_phone}</p><p className="mt-1 text-xs text-slate-500">{order.delivery_location}</p><div className="mt-3 grid gap-2 text-xs sm:grid-cols-3"><div><span className="text-slate-600">Food</span><p className="font-black">{money(order.food_subtotal_ngn)}</p></div><div><span className="text-slate-600">Waybill</span><p className="font-black">{money(order.waybill_fee_ngn)}</p></div><div><span className="text-slate-600">Customer paid</span><p className="font-black text-emerald-200">{money(order.total_ngn)}</p></div></div><p className="mt-3 text-[10px] text-slate-500">Customer transfer ref · <span className="text-slate-300">{order.opay_transaction_reference||'—'}</span></p>{order.payment_admin_note&&<p className="mt-2 text-xs text-slate-500">Payment note · {order.payment_admin_note}</p>}</div><div className="text-right"><p className="text-[9px] uppercase tracking-wider text-slate-600">Agent product margin</p><p className="mt-1 text-lg font-black text-emerald-200">{money(order.agent_margin_ngn||0)}</p></div></div>
            {waiting&&<div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4"><Button onClick={()=>verify(order,'approve')} disabled={Boolean(moving)} className="bg-emerald-300 font-black text-slate-950 hover:bg-emerald-200"><CheckCircle2 className="mr-2 h-4 w-4"/>I RECEIVED THIS PAYMENT</Button><Button onClick={()=>verify(order,'reject')} disabled={Boolean(moving)} variant="outline" className="border-red-300/25 text-red-200"><XCircle className="mr-2 h-4 w-4"/>REJECT</Button></div>}
            {ready&&<div className="mt-4 border-t border-white/10 pt-4"><Button onClick={()=>fulfill(order)} disabled={Boolean(moving)} className="bg-emerald-300 font-black text-slate-950 hover:bg-emerald-200"><CheckCircle2 className="mr-2 h-4 w-4"/>{order.delivery_mode==='waybill'?'DISPATCHED BY WAYBILL':'DELIVERED / PICKED UP'}</Button></div>}
          </article>
        })}
        {!data?.orders?.length&&<div className="border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">No paid customer movement from your Carrier link yet.</div>}
      </div>
    </section>
  </main>
}
