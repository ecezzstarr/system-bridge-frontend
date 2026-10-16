'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, CreditCard, Loader2, MapPin, Package, Share2, Truck, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Product = {
  id:string
  name:string
  accent:string
  foods:string[]
  protein:string
  fruit:string
  drink:string
  water:string
  note:string
  availablePackages:number
  weaveAgentUnitPriceNgn:number
  agentSellingUnitPriceNgn:number
  retailUnitPriceNgn:number
  customerPriceLocked:boolean
}

type DoorData = {
  active:boolean
  agent:{name:string;referralCode:string;whatsappNumber?:string|null}
  products:Product[]
  customerPaymentReady:boolean
  payment:{method:string;bankName:string;accountNumber:string;accountName:string;paymentNote?:string|null;windowMinutes:number}|null
  bridgerInfoUrl:string
  bridgerJoinUrl:string
  movement:string
}

type PaymentIntent = {
  id:string
  variant_id:string
  quantity_packages:number
  unit_price_ngn:number|string
  food_subtotal_ngn:number|string
  waybill_fee_ngn:number|string
  total_ngn:number|string
  delivery_mode:'local'|'waybill'
  payment_method:string
  payment_bank_name:string
  payment_account_number:string
  payment_account_name:string
  payment_reference:string
  payment_status:string
  payment_expires_at:string
}

type NativeShare = (data:{title?:string;text?:string;url?:string})=>Promise<void>
const money=(value:number|string)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(value||0))

function visitorKey(){
  if(typeof window==='undefined')return ''
  const key='weave:carrier-food-visitor'
  let value=localStorage.getItem(key)
  if(!value){
    value=globalThis.crypto?.randomUUID?.()||`v-${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(key,value)
  }
  return value
}

function whatsAppNumber(value?:string|null){
  return String(value||'').replace(/\D/g,'')
}

export function AgentFoodCarrierPublic({referralCode}:{referralCode:string}){
  const [data,setData]=useState<DoorData|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [selected,setSelected]=useState<Product|null>(null)
  const [quantity,setQuantity]=useState(1)
  const [name,setName]=useState('')
  const [phone,setPhone]=useState('')
  const [location,setLocation]=useState('')
  const [note,setNote]=useState('')
  const [deliveryMode,setDeliveryMode]=useState<'local'|'waybill'>('local')
  const [waybillFee,setWaybillFee]=useState('')
  const [ordering,setOrdering]=useState(false)
  const [paymentIntent,setPaymentIntent]=useState<PaymentIntent|null>(null)
  const [transactionReference,setTransactionReference]=useState('')
  const [confirmation,setConfirmation]=useState<{id:string;message:string}|null>(null)

  const load=async()=>{
    setLoading(true);setError('')
    try{
      const visitor=visitorKey()
      const response=await fetch(`/api/carrier/food/${encodeURIComponent(referralCode)}?visitor=${encodeURIComponent(visitor)}`,{cache:'no-store'})
      const body=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(body.error||'This Carrier Door is unavailable')
      setData(body)
      setSelected(current=>{
        if(current&&body.products?.some((item:Product)=>item.id===current.id))return body.products.find((item:Product)=>item.id===current.id)||current
        return body.products?.[0]||null
      })
    }catch(err){setError(err instanceof Error?err.message:'This Carrier Door is unavailable')}
    finally{setLoading(false)}
  }

  useEffect(()=>{void load()},[referralCode])

  const foodSubtotal=useMemo(()=>selected?selected.agentSellingUnitPriceNgn*quantity:0,[selected,quantity])
  const waybill=deliveryMode==='waybill'?Math.max(0,Number(waybillFee)||0):0
  const total=foodSubtotal+waybill
  const agility=data?.products.filter(product=>!product.id.startsWith('electrolyte'))||[]
  const electrolyte=data?.products.filter(product=>product.id.startsWith('electrolyte'))||[]
  const agentWhatsApp=whatsAppNumber(data?.agent?.whatsappNumber)
  const maxCustomerQuantity=Math.max(1,Number(selected?.availablePackages||1))

  const chooseProduct=(product:Product)=>{
    setSelected(product)
    setQuantity(current=>Math.max(1,Math.min(Number.isInteger(current)?current:1,Math.max(1,product.availablePackages))))
  }

  const preparePayment=async()=>{
    if(!selected)return
    if(!Number.isSafeInteger(quantity)||quantity<1||quantity>selected.availablePackages){
      setError(`Choose from 1 to ${selected.availablePackages} available ${selected.id.startsWith('electrolyte')?'bowl':'package'}${selected.availablePackages===1?'':'s'}. Customer orders are by unit, not by carton.`)
      return
    }
    if(deliveryMode==='waybill'&&waybill<=0){
      setError('Get the waybill fee from the Agent and enter it before payment.')
      return
    }
    setOrdering(true);setError('');setConfirmation(null)
    try{
      const response=await fetch(`/api/carrier/food/${encodeURIComponent(referralCode)}`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          action:'prepare_payment',variantId:selected.id,quantity,customerName:name,customerPhone:phone,
          deliveryLocation:location,customerNote:note,deliveryMode,waybillFeeNgn:waybill,
        }),
      })
      const body=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(body.error||'Payment could not be prepared')
      setPaymentIntent(body.payment||null)
      setTransactionReference('')
    }catch(err){setError(err instanceof Error?err.message:'Payment could not be prepared')}
    finally{setOrdering(false)}
  }

  const submitPayment=async()=>{
    if(!paymentIntent)return
    setOrdering(true);setError('');setConfirmation(null)
    try{
      const response=await fetch(`/api/carrier/food/${encodeURIComponent(referralCode)}`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'submit_payment',orderId:paymentIntent.id,transactionReference}),
      })
      const body=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(body.error||'Payment could not be submitted')
      setConfirmation({id:String(body.order?.id||paymentIntent.id),message:body.message||'Payment sent to the Agent for verification.'})
      setPaymentIntent(null);setTransactionReference('');setName('');setPhone('');setLocation('');setNote('');setQuantity(1);setWaybillFee('');setDeliveryMode('local')
      await load()
    }catch(err){setError(err instanceof Error?err.message:'Payment could not be submitted')}
    finally{setOrdering(false)}
  }

  const cancelPayment=async()=>{
    if(!paymentIntent)return
    setOrdering(true);setError('')
    try{
      await fetch(`/api/carrier/food/${encodeURIComponent(referralCode)}`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'cancel_payment_intent',orderId:paymentIntent.id}),
      })
      setPaymentIntent(null);setTransactionReference('');await load()
    }catch(err){setError(err instanceof Error?err.message:'Unable to change this order')}
    finally{setOrdering(false)}
  }

  const share=async()=>{
    const url=window.location.href
    const text=`WEAVE Food · Agility + Electrolyte\nOrder through ${data?.agent?.name||'this Agent'}'s Carrier Door.`
    const nativeShare=(navigator as unknown as {share?:NativeShare}).share
    void fetch(`/api/carrier/food/${encodeURIComponent(referralCode)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'share',channel:nativeShare?'native':'copy'})}).catch(()=>{})
    if(nativeShare){
      try{await nativeShare.call(navigator,{title:'WEAVE Food Carrier',text,url});return}catch{}
    }
    await navigator.clipboard.writeText(url)
  }

  const requestWaybillQuote=()=>{
    if(!agentWhatsApp)return
    const text=`Hello ${data?.agent.name||'Agent'}, I want to order ${selected?.name||'WEAVE Food'} through your Carrier Door for ${location||'a far location'}. Please tell me the waybill fee so I can pay food + waybill before sending the order.`
    window.open(`https://wa.me/${agentWhatsApp}?text=${encodeURIComponent(text)}`,'_blank','noopener,noreferrer')
  }

  if(loading)return <main className="flex min-h-screen items-center justify-center bg-[#07100b] text-white"><Loader2 className="h-8 w-8 animate-spin text-emerald-300"/></main>
  if(error&&!data)return <main className="flex min-h-screen items-center justify-center bg-[#07100b] px-5 text-center text-white"><div><p className="text-2xl font-black">CARRIER DOOR CLOSED</p><p className="mt-3 text-sm text-slate-400">{error}</p></div></main>

  return <main className="min-h-screen bg-[#07100b] text-white">
    <header className="border-b border-white/10 bg-black/20 px-5 py-7 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.28em] text-emerald-300">WEAVE · Carrier Door</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-6xl">FOOD IN MOVEMENT</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Buy one or more Agility packages or Electrolyte bowls through <strong className="text-white">{data?.agent.name}</strong>. Customer orders are by package/bowl, not by carton. Pay the Agent first; then the order moves. No WEAVE account is required to buy.</p>
        </div>
        <Button onClick={()=>void share()} variant="outline" className="border-white/15 bg-white/[.03] text-white"><Share2 className="mr-2 h-4 w-4"/>SHARE</Button>
      </div>
    </header>

    <section className="mx-auto max-w-6xl px-4 py-7 sm:px-8">
      <div className="grid gap-5 lg:grid-cols-2">
        <article className="overflow-hidden border border-orange-300/25 bg-gradient-to-br from-orange-500/20 via-[#1b1008] to-[#0b0907]">
          <div className="border-b border-orange-300/15 px-5 py-5"><p className="text-[9px] font-black uppercase tracking-[.24em] text-orange-300">WEAVE Food · Morning</p><h2 className="mt-1 text-4xl font-black text-orange-300">AGILITY</h2></div>
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {agility.length?agility.map(product=><button key={product.id} disabled={Boolean(paymentIntent)} onClick={()=>chooseProduct(product)} className={`text-left border p-4 transition disabled:opacity-60 ${selected?.id===product.id?'border-orange-300 bg-orange-300/10':'border-white/10 bg-black/15 hover:border-orange-300/40'}`}>
              <div className="flex items-center justify-between gap-3"><h3 className="font-black">{product.name}</h3><span className="text-sm font-black text-orange-300">{money(product.agentSellingUnitPriceNgn)}</span></div>
              <p className="mt-2 text-xs leading-5 text-slate-400">{[...product.foods,product.protein,product.fruit,product.drink].join(' · ')}</p>
              <p className="mt-3 text-[9px] font-black uppercase tracking-wider text-slate-500">{product.availablePackages} packages available · order from 1</p>
            </button>):<p className="text-sm text-slate-500">This Agent has no free Agility stock at this moment.</p>}
          </div>
        </article>

        <article className="overflow-hidden border border-emerald-300/25 bg-gradient-to-br from-emerald-500/18 via-[#0b1a11] to-[#07100b]">
          <div className="border-b border-emerald-300/15 px-5 py-5"><p className="text-[9px] font-black uppercase tracking-[.24em] text-emerald-300">WEAVE Food · Fresh sliced</p><h2 className="mt-1 text-4xl font-black text-emerald-200">ELECTROLYTE</h2><p className="mt-2 text-sm text-emerald-100/70">Nourish · Replenish · Stay Strong.</p></div>
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {electrolyte.length?electrolyte.map(product=><button key={product.id} disabled={Boolean(paymentIntent)} onClick={()=>chooseProduct(product)} className={`text-left border p-5 transition disabled:opacity-60 ${selected?.id===product.id?'border-emerald-300 bg-emerald-300/10':'border-white/10 bg-black/15 hover:border-emerald-300/40'}`}>
              <p className="text-[9px] font-black uppercase tracking-[.18em] text-emerald-300">{product.id==='electrolyte'?'Small Bowl':'Medium Bowl'}</p>
              <div className="mt-1 flex items-center justify-between gap-3"><h3 className="text-lg font-black">{product.name}</h3><span className="text-xl font-black text-emerald-300">{money(product.agentSellingUnitPriceNgn)}</span></div>
              <p className="mt-3 text-xs leading-5 text-slate-300">{[...product.foods,product.protein,product.fruit].join(' · ')}</p>
              <div className="mt-4 flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-emerald-200"><Package className="h-4 w-4"/>{product.availablePackages} bowls available · order from 1</div>
            </button>):<p className="text-sm text-slate-500">This Agent has no free Electrolyte stock at this moment.</p>}
          </div>
        </article>
      </div>

      {selected&&<section className="mt-7 border-y border-white/10 bg-white/[.025] py-6 sm:border sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-[9px] font-black uppercase tracking-[.22em] text-sky-300">Order from {data?.agent.name}</p><h2 className="mt-1 text-2xl font-black">{selected.name}</h2><p className="mt-1 text-xs text-slate-500">{money(selected.agentSellingUnitPriceNgn)} each · choose 1 or more · {selected.availablePackages} currently available.</p></div>
          <div className="text-right"><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Total to Agent</p><p className="mt-1 text-2xl font-black text-white">{money(paymentIntent?.total_ngn??total)}</p></div>
        </div>

        {!data?.customerPaymentReady&&<div className="mt-5 border border-amber-300/20 bg-amber-300/[.04] p-4 text-sm text-amber-100">This Agent is still setting up the receiving account for Carrier orders. You can view the products, but payment cannot start yet.</div>}

        {!paymentIntent?<>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" className="border-white/10 bg-black/25 text-white"/>
            <Input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Phone / WhatsApp" className="border-white/10 bg-black/25 text-white"/>
            <Input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Delivery / pickup / waybill destination" className="border-white/10 bg-black/25 text-white md:col-span-2"/>
            <Input type="number" min={1} max={maxCustomerQuantity} step={1} value={quantity} onChange={e=>setQuantity(Math.max(1,Math.min(maxCustomerQuantity,Math.trunc(Number(e.target.value)||1))))} placeholder="Packages / bowls" className="border-white/10 bg-black/25 text-white"/>
            <Input value={note} onChange={e=>setNote(e.target.value)} placeholder="Note · optional" className="border-white/10 bg-black/25 text-white"/>
          </div>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-[.12em] text-sky-300">Customer quantity: 1, 2, 3, 4… packages/bowls. Carton rules apply only when the Agent buys stock from WEAVE.</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button onClick={()=>{setDeliveryMode('local');setWaybillFee('')}} className={`border p-4 text-left ${deliveryMode==='local'?'border-sky-300 bg-sky-300/10':'border-white/10 bg-black/20'}`}><MapPin className="h-5 w-5 text-sky-300"/><p className="mt-2 font-black">NEAR / PICKUP</p><p className="mt-1 text-xs text-slate-500">No waybill fee is added by Carrier.</p></button>
            <button onClick={()=>setDeliveryMode('waybill')} className={`border p-4 text-left ${deliveryMode==='waybill'?'border-amber-300 bg-amber-300/10':'border-white/10 bg-black/20'}`}><Truck className="h-5 w-5 text-amber-300"/><p className="mt-2 font-black">FAR LOCATION · WAYBILL</p><p className="mt-1 text-xs text-slate-500">Food + the Agent's quoted waybill fee must be paid before the order is sent.</p></button>
          </div>

          {deliveryMode==='waybill'&&<div className="mt-4 border border-amber-300/20 bg-amber-300/[.04] p-4">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">WAYBILL REQUIRED</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">Get the exact waybill amount from the Agent for your destination, enter it here, then Carrier adds it to the food total before payment.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row"><Input type="number" min={1} value={waybillFee} onChange={e=>setWaybillFee(e.target.value)} placeholder="Waybill fee quoted by Agent" className="border-amber-300/20 bg-black/25 text-white"/>{agentWhatsApp&&<Button onClick={requestWaybillQuote} variant="outline" className="border-amber-300/25 text-amber-100"><Truck className="mr-2 h-4 w-4"/>GET WAYBILL FEE FROM AGENT</Button>}</div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs"><div><span className="text-slate-600">Food</span><p className="font-black">{money(foodSubtotal)}</p></div><div><span className="text-slate-600">Waybill</span><p className="font-black">{money(waybill)}</p></div><div><span className="text-slate-600">Pay Agent</span><p className="font-black text-amber-200">{money(total)}</p></div></div>
          </div>}

          <div className="mt-5 border border-emerald-300/20 bg-emerald-300/[.04] p-4"><div className="flex items-start gap-3"><CreditCard className="mt-0.5 h-5 w-5 text-emerald-300"/><div><p className="font-black text-emerald-100">PAYMENT COMES BEFORE THE ORDER</p><p className="mt-1 text-xs leading-5 text-slate-400">Carrier first prepares the exact amount and the Agent receiving account. The Agent does not receive an actionable order until you pay and submit your transaction reference.</p></div></div></div>
          <Button onClick={()=>void preparePayment()} disabled={ordering||selected.availablePackages<1||!data?.customerPaymentReady} className="mt-5 h-12 bg-white px-6 font-black text-black hover:bg-slate-200"><CreditCard className="mr-2 h-4 w-4"/>{ordering?'PREPARING PAYMENT…':'CONTINUE TO PAYMENT'}</Button>
        </>:<div className="mt-5 border border-emerald-300/20 bg-emerald-300/[.04] p-5 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[.22em] text-emerald-300">STEP 2 · PAY THE AGENT</p>
          <h3 className="mt-3 text-2xl font-black">PAY {money(paymentIntent.total_ngn)}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">Pay this exact amount to the Agent account below — not to WEAVE. After payment, paste your transaction reference. The Agent checks their own account before the order moves.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="border border-white/10 bg-black/25 p-4"><p className="text-[9px] uppercase tracking-wider text-slate-600">Bank / OPay</p><p className="mt-1 font-black">{paymentIntent.payment_bank_name}</p></div><div className="border border-white/10 bg-black/25 p-4"><p className="text-[9px] uppercase tracking-wider text-slate-600">Account number</p><p className="mt-1 text-xl font-black">{paymentIntent.payment_account_number}</p></div><div className="border border-white/10 bg-black/25 p-4"><p className="text-[9px] uppercase tracking-wider text-slate-600">Account name</p><p className="mt-1 font-black">{paymentIntent.payment_account_name}</p></div><div className="border border-white/10 bg-black/25 p-4"><p className="text-[9px] uppercase tracking-wider text-slate-600">Carrier payment reference</p><p className="mt-1 break-all font-black">{paymentIntent.payment_reference}</p></div></div>
          <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3"><div className="border border-white/10 p-3"><span className="text-slate-600">Food</span><p className="font-black">{money(paymentIntent.food_subtotal_ngn)}</p></div><div className="border border-white/10 p-3"><span className="text-slate-600">Waybill</span><p className="font-black">{money(paymentIntent.waybill_fee_ngn)}</p></div><div className="border border-emerald-300/20 p-3"><span className="text-slate-600">Total paid</span><p className="font-black text-emerald-200">{money(paymentIntent.total_ngn)}</p></div></div>
          <Input className="mt-4 border-emerald-300/20 bg-black/25 text-white" value={transactionReference} onChange={e=>setTransactionReference(e.target.value)} placeholder="Bank / OPay transaction reference"/>
          <div className="mt-4 flex flex-wrap gap-2"><Button onClick={()=>void submitPayment()} disabled={ordering||transactionReference.trim().length<4} className="bg-emerald-300 font-black text-slate-950 hover:bg-emerald-200"><CheckCircle2 className="mr-2 h-4 w-4"/>{ordering?'SENDING…':'I PAID THE AGENT — SEND ORDER'}</Button><Button onClick={()=>void cancelPayment()} disabled={ordering} variant="outline" className="border-white/15 text-white">CANCEL</Button></div>
        </div>}
      </section>}

      {confirmation&&<div className="mt-6 border border-emerald-300/25 bg-emerald-300/[.06] p-5"><CheckCircle2 className="h-6 w-6 text-emerald-300"/><p className="mt-2 font-black">PAYMENT SENT TO AGENT FOR VERIFICATION</p><p className="mt-2 text-sm text-slate-300">{confirmation.message}</p></div>}

      <section className="mt-8 border border-violet-300/20 bg-violet-300/[.04] p-5 sm:p-6">
        <div className="flex items-start gap-3"><Users className="mt-1 h-5 w-5 text-violet-300"/><div><p className="text-[9px] font-black uppercase tracking-[.22em] text-violet-300">Another movement through this Agent</p><h2 className="mt-1 text-2xl font-black">UNDERSTAND THE BRIDGER POSITION</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Before entering WEAVE as this Agent's Bridger, see what a Bridger is, how a Bridger earns, and how the Agent earns through the Bridger relationship.</p><a href={data?.bridgerInfoUrl} className="mt-4 inline-flex items-center font-black text-violet-200">READ BEFORE JOINING <ArrowRight className="ml-2 h-4 w-4"/></a></div></div>
      </section>
    </section>
  </main>
}