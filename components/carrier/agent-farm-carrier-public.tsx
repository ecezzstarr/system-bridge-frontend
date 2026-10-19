'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, CheckCircle2, ClipboardCopy, MapPin, RefreshCw, Sprout, Truck } from 'lucide-react'
import { FOOD_BRIDGE_STATES } from '@/lib/food-bridge-states'

type FarmOffer = {
  id:string; produce:string; unit:string; available_quantity:string; minimum_quantity:string;
  unit_price_ngn:string; details?:string|null; farm_name:string; state:string; community:string
}
type Order = {
  id:string;status:string;quantity:string;unit_price_ngn:string;food_subtotal_ngn:string;
  delivery_quote_ngn:string|null;quote_note:string|null;delivery_mode:string;
  destination_state:string;destination_area:string;produce:string;unit:string;
  farm_name:string;origin_state:string;community:string;farmer_contact?:string|null;
  escrow_status?:string|null;escrow_reference?:string|null;buyer_total_ngn?:string|null;
  seller_payout_ngn?:string|null;paymentAccountNumber?:string|null;weaveCommissionNgn?:number
}
const money=(value:unknown)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:2}).format(Number(value||0))

export function AgentFarmCarrierPublic({referralCode}:{referralCode:string}){
  const [offers,setOffers]=useState<FarmOffer[]>([])
  const [selected,setSelected]=useState<FarmOffer|null>(null)
  const [quantity,setQuantity]=useState('1')
  const [buyerName,setBuyerName]=useState('')
  const [buyerPhone,setBuyerPhone]=useState('')
  const [destinationState,setDestinationState]=useState('Lagos')
  const [destinationArea,setDestinationArea]=useState('')
  const [deliveryMode,setDeliveryMode]=useState<'delivery'|'pickup'>('delivery')
  const [shareBuyerContact,setShareBuyerContact]=useState(false)
  const [paymentReference,setPaymentReference]=useState('')
  const [disputeNote,setDisputeNote]=useState('')
  const [orderKey,setOrderKey]=useState('')
  const [order,setOrder]=useState<Order|null>(null)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const endpoint=`/api/carrier/food/${encodeURIComponent(referralCode)}/farm`
  const keyStorage=`weave:carrier-farm-order:${referralCode.toUpperCase()}`
  const [available,setAvailable]=useState(true)

  const loadOffers=useCallback(async()=>{
    try{
      const result=await fetch(endpoint,{cache:'no-store'})
      const data=await result.json()
      if(!result.ok)throw new Error(data.error||'Farm produce unavailable')
      setOffers(data.offers||[])
      setAvailable(true)
    }catch{
      setAvailable(false)
    }
  },[endpoint])

  const loadOrder=useCallback(async(key:string)=>{
    if(!key)return
    const result=await fetch(endpoint+'/order',{headers:{'x-farm-order-key':key},cache:'no-store'})
    const data=await result.json()
    if(!result.ok)throw new Error(data.error||'Unable to track this order')
    setOrder(data.order)
  },[endpoint])

  useEffect(()=>{void loadOffers()},[loadOffers])
  useEffect(()=>{
    const key=localStorage.getItem(keyStorage)
    if(key){setOrderKey(key);void loadOrder(key).catch(()=>{})}
  },[keyStorage,loadOrder])

  async function requestFood(event:FormEvent){
    event.preventDefault()
    if(!selected)return
    setBusy(true);setError('');setMessage('')
    try{
      const result=await fetch(endpoint,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          offerId:selected.id,quantity:Number(quantity),buyerName,buyerPhone,
          destinationState,destinationArea,deliveryMode,shareBuyerContact,
        }),
      })
      const data=await result.json()
      if(!result.ok)throw new Error(data.error||'Unable to submit food request')
      localStorage.setItem(keyStorage,data.orderKey)
      setOrderKey(data.orderKey)
      await Promise.all([loadOffers(),loadOrder(data.orderKey)])
      setSelected(null)
      setMessage('Request received by this farmer. Your food is reserved while confirmation and a delivery quote are arranged. Save the private tracking key below.')
    }catch(cause){
      setError(cause instanceof Error?cause.message:'Unable to submit food request')
    }finally{setBusy(false)}
  }
  async function orderAction(action:'accept_quote'|'submit_payment_proof'|'dispute'|'cancel'|'confirm_delivery'){
    if(!orderKey)return
    setBusy(true);setError('');setMessage('')
    try{
      const res=await fetch(endpoint+'/order',{
        method:'PATCH',headers:{'Content-Type':'application/json','x-farm-order-key':orderKey},
        body:JSON.stringify({action,transactionReference:paymentReference,disputeNote}),
      })
      const data=await res.json()
      if(!res.ok)throw new Error(data.error||'Unable to update your order')
      await Promise.all([loadOrder(orderKey),loadOffers()])
      setMessage(action==='accept_quote'
        ? 'Quote accepted. Pay the exact amount to WEAVE and submit your actual bank transfer reference below. Farmer dispatch is blocked until funds are confirmed.'
        :action==='submit_payment_proof'?'Bank proof received for WEAVE Administration reconciliation. Seller cannot dispatch yet.'
        :action==='dispute'?'Your concern has been recorded and seller payout is blocked.'
        :action==='confirm_delivery'?'Your receipt is recorded. WEAVE now processes full farmer payout with zero commission.':'Your reserved stock was returned to the farm.')
    }catch(cause){setError(cause instanceof Error?cause.message:'Unable to update your order')}
    finally{setBusy(false)}
  }

  return <section id="agent-farm-produce" className="border-y border-emerald-300/15 bg-[#09140e] px-4 py-8 text-white sm:px-8" data-carrier-agent-farm={referralCode}>
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] text-emerald-200">
            <Sprout className="h-4 w-4"/> Village surplus · Agent Carrier
          </p>
          <h2 className="mt-2 text-2xl font-black sm:text-4xl">Food directly from the farm</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-400">
            Produce listed by this Agent's approved farm appears here on the same Carrier link shared through WhatsApp.
            No WEAVE registration is needed to request farm food. Farmers pay ₦0 commission. WEAVE confirms buyer funds before dispatch and records farmer payout after delivery.
          </p>
        </div>
        <button type="button" onClick={()=>void loadOffers()} className="inline-flex items-center gap-2 border border-white/15 px-3 py-2 text-xs text-emerald-100"><RefreshCw className="h-4 w-4"/> Refresh stock</button>
      </header>
      {!available&&<p className="mt-5 text-xs text-stone-500">Farm catalogue temporarily unavailable. The existing Carrier food and cake sections remain accessible below.</p>}
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {offers.map(offer=><article key={offer.id} className="flex flex-col border border-emerald-200/20 bg-white/[.035] p-5" data-farm-offer={offer.id}>
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-emerald-200"><MapPin className="h-4 w-4"/>{offer.community}, {offer.state}</p>
          <h3 className="mt-3 text-xl font-black">{offer.produce}</h3>
          <p className="mt-1 text-xs text-stone-400">{offer.farm_name}</p>
          <p className="mt-4 text-2xl font-black">{money(offer.unit_price_ngn)}<span className="text-xs font-normal text-stone-400"> / {offer.unit} · farm price</span></p>
          <p className="mt-3 text-xs text-stone-300">{offer.available_quantity} {offer.unit} reported available · minimum {offer.minimum_quantity}</p>
          {offer.details&&<p className="mt-2 text-xs leading-5 text-stone-400">{offer.details}</p>}
          <button type="button" onClick={()=>{setSelected(offer);setQuantity(String(offer.minimum_quantity))}} className="mt-5 flex items-center justify-between bg-emerald-300 px-4 py-3 text-xs font-black text-emerald-950">
            Request from this farm <ArrowRight className="h-4 w-4"/>
          </button>
        </article>)}
        {available&&offers.length===0&&<p className="border border-dashed border-white/10 p-6 text-sm text-stone-500 sm:col-span-2">This Agent has not published farm produce yet. You can still order their WEAVE food products and cakes below.</p>}
      </div>
      {selected&&<form onSubmit={requestFood} className="mt-6 border border-emerald-300/25 bg-black/20 p-5 sm:p-6" data-carrier-farm-request>
        <h3 className="text-lg font-black">Request {selected.produce} · {selected.farm_name}</h3>
        <p className="mt-2 text-xs text-stone-400">Farm price {money(selected.unit_price_ngn)} / {selected.unit}. Logistics are quoted separately.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-xs text-stone-300">Quantity ({selected.unit})
            <input type="number" step=".01" required min={selected.minimum_quantity} max={selected.available_quantity}
              value={quantity} onChange={e=>setQuantity(e.target.value)}
              className="mt-2 block w-full border border-white/15 bg-[#17261b] p-3 text-white"/>
          </label>
          <label className="text-xs text-stone-300">Your name
            <input required minLength={2} maxLength={120} value={buyerName} onChange={e=>setBuyerName(e.target.value)}
              className="mt-2 block w-full border border-white/15 bg-[#17261b] p-3 text-white"/>
          </label>
          <label className="text-xs text-stone-300">Phone / WhatsApp
            <input required type="tel" maxLength={60} value={buyerPhone} onChange={e=>setBuyerPhone(e.target.value)}
              className="mt-2 block w-full border border-white/15 bg-[#17261b] p-3 text-white"/>
          </label>
          <label className="text-xs text-stone-300">Destination state
            <select value={destinationState} onChange={e=>setDestinationState(e.target.value)} className="mt-2 block w-full border border-white/15 bg-[#17261b] p-3 text-white">
              {FOOD_BRIDGE_STATES.map(state=><option value={state} key={state}>{state}</option>)}
            </select>
          </label>
          <label className="text-xs text-stone-300">Delivery area / town
            <input required minLength={3} maxLength={160} placeholder="Ikeja, Lagos" value={destinationArea} onChange={e=>setDestinationArea(e.target.value)}
              className="mt-2 block w-full border border-white/15 bg-[#17261b] p-3 text-white"/>
          </label>
          <label className="text-xs text-stone-300">Receiving method
            <select value={deliveryMode} onChange={e=>setDeliveryMode(e.target.value as 'delivery'|'pickup')} className="mt-2 block w-full border border-white/15 bg-[#17261b] p-3 text-white">
              <option value="delivery">Deliver to me</option><option value="pickup">I can arrange pickup</option>
            </select>
          </label>
        </div>
        <p className="mt-4 text-sm font-black">Farm goods subtotal: {money(Number(quantity||0)*Number(selected.unit_price_ngn))}</p>
        <p className="mt-2 text-xs leading-5 text-amber-100">Transport costs are not yet known. You are requesting available stock, not making a payment. The Agent farmer confirms and provides the total quote before you approve it.</p>
        <label className="mt-4 flex items-start gap-2 text-xs text-stone-300">
          <input type="checkbox" checked={shareBuyerContact} onChange={e=>setShareBuyerContact(e.target.checked)} className="mt-1"/>
          After WEAVE verifies my payment, share my name and phone with this farmer to arrange delivery.
        </label>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="submit" disabled={busy} className="bg-emerald-300 px-5 py-3 text-xs font-black text-emerald-950 disabled:opacity-40">Request and reserve produce</button>
          <button type="button" onClick={()=>setSelected(null)} className="border border-white/15 px-5 py-3 text-xs text-stone-300">Close</button>
        </div>
      </form>}
      {error&&<p role="alert" className="mt-4 border border-rose-300/20 px-4 py-3 text-xs text-rose-200">{error}</p>}
      {message&&<p role="status" className="mt-4 border border-emerald-300/20 px-4 py-3 text-xs text-emerald-200">{message}</p>}
      <div className="mt-6 border-t border-white/10 pt-6" data-carrier-farm-order-tracking>
        <h3 className="text-lg font-black">Track your farm order</h3>
        <p className="mt-2 text-xs leading-5 text-stone-400">The private tracking key protects your order; it is saved on this device. Keep a separate copy before changing devices or clearing browser data.</p>
        <label className="mt-4 block text-xs text-stone-300">Private tracking key
          <input type="password" value={orderKey} onChange={e=>setOrderKey(e.target.value)} className="mt-2 block w-full max-w-xl border border-white/15 bg-[#17261b] p-3 text-white"/>
        </label>
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" onClick={()=>void loadOrder(orderKey).catch(cause=>setError(cause instanceof Error?cause.message:'Order not found'))} className="inline-flex items-center gap-2 border border-white/15 px-4 py-2 text-xs"><RefreshCw className="h-4 w-4"/> Check order</button>
          {orderKey&&<button type="button" onClick={()=>void navigator.clipboard.writeText(orderKey).then(()=>setMessage('Tracking key copied. Keep it private.')).catch(()=>setError('Copy failed: save the key manually.'))} className="inline-flex items-center gap-2 border border-white/15 px-4 py-2 text-xs"><ClipboardCopy className="h-4 w-4"/> Copy tracking key</button>}
        </div>
        {order&&<div className="mt-5 max-w-2xl border border-emerald-300/20 p-5">
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-200">{order.status.replaceAll('_',' ')}</p>
          <h4 className="mt-2 text-lg font-black">{order.produce} · {order.quantity} {order.unit}</h4>
          <p className="mt-2 text-xs text-stone-400">{order.farm_name}, {order.origin_state} → {order.destination_area}, {order.destination_state}</p>
          <div className="mt-4 space-y-2 border-y border-white/10 py-3 text-xs">
            <p className="flex justify-between"><span>Farm subtotal</span><strong>{money(order.food_subtotal_ngn)}</strong></p>
            <p className="flex justify-between"><span>Delivery quote</span><strong>{order.delivery_quote_ngn===null?'Not received':money(order.delivery_quote_ngn)}</strong></p>
            {order.delivery_quote_ngn!==null&&<p className="flex justify-between text-sm"><strong>Total quoted</strong><strong>{money(Number(order.food_subtotal_ngn)+Number(order.delivery_quote_ngn))}</strong></p>}
          </div>
          {order.quote_note&&<p className="mt-3 text-xs text-stone-400">{order.quote_note}</p>}
          {order.farmer_contact&&<p className="mt-3 text-xs text-emerald-200">Farm contact: {order.farmer_contact}</p>}
          {order.status==='quoted'&&<button type="button" disabled={busy} onClick={()=>void orderAction('accept_quote')} className="mt-4 bg-emerald-300 px-4 py-3 text-xs font-black text-emerald-950"><CheckCircle2 className="mr-2 inline h-4 w-4"/> Accept full quote</button>}
          {order.status==='accepted'&&<div className="mt-4 border border-emerald-300/25 p-4" data-guest-farm-weave-payment>
            <p className="text-xs font-black text-emerald-200">WEAVE payment holding · no fee to farmer</p>
            <p className="mt-2 text-sm">Pay <strong>{money(order.buyer_total_ngn)}</strong> to WEAVE OPay <strong>{order.paymentAccountNumber||'Refer to the verified WEAVE order'}</strong>, reference <strong>{order.escrow_reference}</strong>.</p>
            <p className="mt-2 text-xs text-stone-400">Farmer dispatch begins only when Administration verifies actual receipt of funds.</p>
            {order.escrow_status==='awaiting_payment'&&<div className="mt-3 flex flex-wrap gap-2"><input aria-label="Actual bank transfer reference" value={paymentReference} onChange={e=>setPaymentReference(e.target.value)} placeholder="Your OPay/bank transfer reference" className="min-w-48 flex-1 border border-white/10 bg-[#17261b] p-3 text-sm"/><button type="button" disabled={busy||paymentReference.trim().length<8} onClick={()=>void orderAction('submit_payment_proof')} className="bg-emerald-300 px-4 py-2 text-xs font-black text-black">Submit bank proof</button></div>}
            {order.escrow_status==='proof_submitted'&&<p className="mt-2 text-xs text-amber-200">Payment confirmation pending; no seller dispatch until verified.</p>}
          </div>}
          {order.status==='funds_held'&&<p className="mt-3 text-xs text-emerald-200">WEAVE confirmed buyer funds held; farmer can send your food.</p>}
          {order.status==='dispatched'&&<div className="mt-4 space-y-2"><label className="text-xs">Delivery problem?<textarea value={disputeNote} onChange={e=>setDisputeNote(e.target.value)} placeholder="Explain the problem (at least 15 characters)" className="mt-2 block w-full border border-white/10 bg-[#17261b] p-3"/></label><button type="button" disabled={busy||disputeNote.trim().length<15} onClick={()=>void orderAction('dispute')} className="border border-rose-300/30 px-3 py-2 text-xs text-rose-200">Hold seller payout · report problem</button></div>}
          {order.status==='dispatched'&&<button type="button" disabled={busy} onClick={()=>void orderAction('confirm_delivery')} className="mt-4 inline-flex items-center gap-2 bg-emerald-300 px-4 py-3 text-xs font-black text-emerald-950"><Truck className="h-4 w-4"/> Confirm food received</button>}
          {['requested','farmer_confirmed','quoted','accepted'].includes(order.status)&&<button type="button" disabled={busy} onClick={()=>void orderAction('cancel')} className="mt-4 border border-rose-300/20 px-4 py-3 text-xs text-rose-200">Cancel request</button>}
          <p className="mt-4 text-xs leading-5 text-stone-500">WEAVE charges farmers ₦0 commission. A payment reference alone is not proof of received money; verified escrow funds must be held before the farmer dispatches. Payout is recorded after buyer receipt and actual bank settlement.</p>
        </div>}
      </div>
    </div>
  </section>
}
