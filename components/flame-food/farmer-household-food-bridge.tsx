'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, ClipboardCopy, Flame, MapPin, Package, RefreshCw, ShieldCheck, Truck } from 'lucide-react'
import { FOOD_BRIDGE_STATES, FOOD_BRIDGE_UNITS } from '@/lib/food-bridge-states'

type Offer = {
  id:string;produce:string;unit:string;unit_price_ngn:string;available_quantity:string;
  minimum_quantity:string;farm_name:string;state:string;community:string;details:string
}
type FarmerData = {
  farmer:{farm_name:string;status:string;state:string;community:string}
  offers:{id:string;produce:string;unit:string;available_quantity:string;status:string}[]
  orders:{id:string;produce:string;unit:string;quantity:string;destination_state:string;destination_area:string;
    delivery_mode:string;food_subtotal_ngn:string;delivery_quote_ngn:string|null;
    status:string;buyer_name?:string|null;buyer_contact?:string|null}[]
}
type BuyerOrder = {
  id:string;status:string;produce:string;unit:string;quantity:string;farm_name:string;origin_state:string;community:string;
  destination_state:string;destination_area:string;delivery_mode:string;food_subtotal_ngn:string;
  delivery_quote_ngn:string|null;quote_note:string|null;farmer_contact:string|null
}
const money=(v:unknown)=>'₦'+Number(v||0).toLocaleString('en-NG',{maximumFractionDigits:2,minimumFractionDigits:0})

export default function FarmerHouseholdFoodBridge() {
  const [offers,setOffers]=useState<Offer[]>([])
  const [source,setSource]=useState('')
  const [search,setSearch]=useState('')
  const [selected,setSelected]=useState<Offer|null>(null)
  const [buyerName,setBuyerName]=useState('')
  const [buyerPhone,setBuyerPhone]=useState('')
  const [destination,setDestination]=useState('Lagos')
  const [area,setArea]=useState('')
  const [qty,setQty]=useState('1')
  const [shareBuyer,setShareBuyer]=useState(false)
  const [deliveryMode,setDeliveryMode]=useState<'delivery'|'pickup'>('delivery')
  const [farmerKey,setFarmerKey]=useState('')
  const [existingFarmerKey,setExistingFarmerKey]=useState('')
  const [buyerKey,setBuyerKey]=useState('')
  const [farmName,setFarmName]=useState('')
  const [farmPhone,setFarmPhone]=useState('')
  const [farmState,setFarmState]=useState('Kano')
  const [community,setCommunity]=useState('')
  const [shareFarmer,setShareFarmer]=useState(false)
  const [farmer,setFarmer]=useState<FarmerData|null>(null)
  const [buyerOrder,setBuyerOrder]=useState<BuyerOrder|null>(null)
  const [produce,setProduce]=useState('')
  const [unit,setUnit]=useState<string>('kg')
  const [available,setAvailable]=useState('')
  const [minimum,setMinimum]=useState('')
  const [price,setPrice]=useState('')
  const [details,setDetails]=useState('')
  const [quoteFee,setQuoteFee]=useState<Record<string,string>>({})
  const [quoteNote,setQuoteNote]=useState<Record<string,string>>({})
  const [tab,setTab]=useState<'buy'|'farm'>('buy')
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)

  const catalogue=useCallback(async()=>{
    try{
      const query=new URLSearchParams()
      if(source)query.set('origin',source)
      if(search.trim())query.set('search',search.trim())
      const response=await fetch('/api/flame/food?'+query.toString(),{cache:'no-store'})
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Unable to fetch available produce')
      setOffers(body.offers||[])
    }catch(e){setMessage(e instanceof Error?e.message:'Unable to load available produce')}
  },[source,search])
  const refreshFarmer=useCallback(async(key:string)=>{
    if(!key)return
    const res=await fetch('/api/flame/food/farmer',{headers:{'x-farmer-key':key},cache:'no-store'})
    const body=await res.json()
    if(!res.ok)throw new Error(body.error||'Unable to open farmer desk')
    setFarmer(body)
  },[])
  const trackBuyer=useCallback(async(key:string)=>{
    if(!key)return
    const res=await fetch('/api/flame/food/orders',{headers:{'x-food-order-key':key},cache:'no-store'})
    const body=await res.json()
    if(!res.ok)throw new Error(body.error||'Unable to open order tracking')
    setBuyerOrder(body.order)
  },[])
  useEffect(()=>{void catalogue()},[catalogue])
  useEffect(()=>{
    const farmer=localStorage.getItem('weave_food_farmer_key')||''
    const buyer=localStorage.getItem('weave_food_buyer_key')||''
    if(farmer){setFarmerKey(farmer);void refreshFarmer(farmer).catch(()=>{})}
    if(buyer){setBuyerKey(buyer);void trackBuyer(buyer).catch(()=>{})}
  },[refreshFarmer,trackBuyer])
  async function post(action:string,payload:Record<string,unknown>,headers:Record<string,string>={}){
    const res=await fetch('/api/flame/food',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify({action,...payload})})
    const body=await res.json()
    if(!res.ok)throw new Error(body.error||'Unable to complete this step')
    return body
  }
  async function registerFarm(event:FormEvent){
    event.preventDefault();setBusy(true);setMessage('')
    try{
      const body=await post('register',{farmName,contact:farmPhone,community,state:farmState,shareFarmerContact:shareFarmer})
      setFarmerKey(body.managementKey)
      localStorage.setItem('weave_food_farmer_key',body.managementKey)
      setMessage('Farmer request received. Save your private farmer key. Administration must verify you before your food appears in the market.')
      await refreshFarmer(body.managementKey)
    }catch(e){setMessage(e instanceof Error?e.message:'Unable to register farm')}
    finally{setBusy(false)}
  }
  async function publish(event:FormEvent){
    event.preventDefault();setBusy(true);setMessage('')
    try{
      await post('offer',{produce,unit,quantity:Number(available),minimumQuantity:Number(minimum),priceNgn:Number(price),details},{'x-farmer-key':farmerKey})
      setMessage('Surplus published to the public market.')
      setProduce('');setAvailable('');setMinimum('');setPrice('');setDetails('')
      await Promise.all([refreshFarmer(farmerKey),catalogue()])
    }catch(e){setMessage(e instanceof Error?e.message:'Unable to publish produce')}
    finally{setBusy(false)}
  }
  async function requestFood(event:FormEvent){
    event.preventDefault();if(!selected)return
    setBusy(true);setMessage('')
    try{
      const res=await fetch('/api/flame/food/orders',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({offerId:selected.id,quantity:Number(qty),buyerName,buyerPhone,destinationState:destination,
          destinationArea:area,shareBuyerContact:shareBuyer,deliveryMode})})
      const body=await res.json()
      if(!res.ok)throw new Error(body.error||'Unable to request produce')
      localStorage.setItem('weave_food_buyer_key',body.buyerKey)
      setBuyerKey(body.buyerKey)
      await trackBuyer(body.buyerKey)
      await catalogue()
      setSelected(null)
      setMessage('Produce reserved for 24 hours while the farmer responds. This is not a payment. Keep your private order key.')
    }catch(e){setMessage(e instanceof Error?e.message:'Unable to request food')}
    finally{setBusy(false)}
  }
  async function farmerAction(orderId:string,action:string){
    setBusy(true);setMessage('')
    try{
      const response=await fetch('/api/flame/food/farmer',{method:'PATCH',
        headers:{'Content-Type':'application/json','x-farmer-key':farmerKey},
        body:JSON.stringify({action,orderId,deliveryFeeNgn:Number(quoteFee[orderId]||0),quoteNote:quoteNote[orderId]||''})})
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Cannot update order')
      setMessage('Farmer order movement recorded.')
      await Promise.all([refreshFarmer(farmerKey),catalogue()])
    }catch(e){setMessage(e instanceof Error?e.message:'Unable to move order')}
    finally{setBusy(false)}
  }
  async function buyerAction(action:string){
    setBusy(true);setMessage('')
    try{
      const response=await fetch('/api/flame/food/orders',{method:'PATCH',
        headers:{'Content-Type':'application/json','x-food-order-key':buyerKey},body:JSON.stringify({action})})
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Cannot update order')
      await Promise.all([trackBuyer(buyerKey),catalogue()])
      setMessage(action==='accept_quote'?'You accepted the food and delivery quote. Coordinate payment and dispatch directly with the supplier; WEAVE has not received payment.'
        :action==='confirm_delivery'?'Household delivery acknowledged.':'Household request cancelled and quantity released.')
    }catch(e){setMessage(e instanceof Error?e.message:'Unable to update order')}
    finally{setBusy(false)}
  }

  return <main className="min-h-screen bg-[#080e0b] text-white" data-weave-food-bridge="farmer-to-household">
    <header className="border-b border-emerald-200/15 bg-[radial-gradient(circle_at_75%_0%,rgba(34,197,94,.13),transparent_48%)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        <Link href="/market" className="inline-flex items-center gap-2 text-xs text-emerald-200"><ArrowLeft className="h-4 w-4"/> WEAVE Customer Market</Link>
        <p className="mt-7 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-amber-200"><Flame className="h-4 w-4"/> Flame Event · Food movement</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">From surplus at the farm to food on the family table.</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-300">A farmer in the North can make surplus food available. A household in Lagos can order from that actual stock. WEAVE connects the two; origin, quantity, farm price and delivery quotation stay visible.</p>
        <div className="mt-6 flex flex-wrap gap-2 text-[10px] font-bold text-stone-300">
          <span className="border border-white/10 px-3 py-2">Direct farmer offers</span>
          <span className="border border-white/10 px-3 py-2">Real available quantities</span>
          <span className="border border-white/10 px-3 py-2">Delivery quote before acceptance</span>
          <span className="border border-white/10 px-3 py-2">No payment collected here</span>
        </div>
      </div>
    </header>

    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex border-b border-white/15">
        <button type="button" onClick={()=>setTab('buy')} className={'px-5 py-4 text-xs font-black '+(tab==='buy'?'border-b-2 border-emerald-300 text-white':'text-stone-500')}>Household · Find food</button>
        <button type="button" onClick={()=>setTab('farm')} className={'px-5 py-4 text-xs font-black '+(tab==='farm'?'border-b-2 border-amber-300 text-white':'text-stone-500')}>Farmer · Sell surplus</button>
      </div>
      {message&&<p role="status" className="my-4 border-l-2 border-emerald-300 bg-emerald-300/5 p-3 text-sm text-emerald-100">{message}</p>}

      {tab==='buy'&&<div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,.9fr)]">
        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="text-2xl font-black">Food available from farmers</h2><p className="mt-2 text-xs text-stone-400">Only approved farmers with actual available produce appear here.</p></div>
            <button type="button" onClick={()=>void catalogue()} className="flex items-center gap-2 border border-white/15 px-3 py-2 text-xs"><RefreshCw className="h-4 w-4"/> Refresh</button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-stone-300">Origin state
              <select value={source} onChange={e=>setSource(e.target.value)} className="mt-2 w-full border border-white/15 bg-[#18251d] p-3">
                <option value="">All states</option>{FOOD_BRIDGE_STATES.map(state=><option key={state} value={state}>{state}</option>)}
              </select>
            </label>
            <label className="text-xs text-stone-300">Produce
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rice, yam, tomatoes…" className="mt-2 w-full border border-white/15 bg-[#18251d] p-3 text-white"/>
            </label>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {offers.map(offer=><article key={offer.id} className="border border-emerald-200/15 bg-white/[.025] p-5" data-food-offer={offer.id}>
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-emerald-200"><MapPin className="h-3.5 w-3.5"/>{offer.community}, {offer.state}</p>
              <h3 className="mt-3 text-xl font-black">{offer.produce}</h3>
              <p className="mt-1 text-sm text-stone-300">{offer.farm_name}</p>
              <p className="mt-4 text-2xl font-black text-white">{money(offer.unit_price_ngn)} <span className="text-xs font-normal text-stone-400">/ {offer.unit} · farm price</span></p>
              <p className="mt-2 text-xs text-stone-400">{offer.available_quantity} {offer.unit} available · minimum {offer.minimum_quantity} {offer.unit}</p>
              {offer.details&&<p className="mt-2 text-xs leading-5 text-stone-500">{offer.details}</p>}
              <button type="button" onClick={()=>{setSelected(offer);setQty(String(offer.minimum_quantity))}} className="mt-5 flex w-full items-center justify-between bg-emerald-300 px-4 py-3 text-xs font-black text-emerald-950">
                Request this produce <ArrowRight className="h-4 w-4"/>
              </button>
            </article>)}
          </div>
          {!offers.length&&<p className="mt-5 border border-dashed border-white/15 p-8 text-sm text-stone-400">No verified farm surplus matches this search yet. No inventory has been invented.</p>}
          {selected&&<form onSubmit={requestFood} className="mt-6 space-y-4 border border-emerald-300/30 bg-[#102018] p-5" data-food-order-form>
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-200">Household order request</p><h3 className="mt-1 text-lg font-black">{selected.produce} from {selected.community}, {selected.state}</h3></div><button type="button" onClick={()=>setSelected(null)} className="text-xs text-stone-400">Close</button></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs">Quantity ({selected.unit})
                <input type="number" step=".01" min={selected.minimum_quantity} max={selected.available_quantity} required value={qty} onChange={e=>setQty(e.target.value)} className="mt-1 w-full border border-white/15 bg-[#1d3024] p-3"/>
              </label>
              <label className="text-xs">Delivery mode
                <select value={deliveryMode} onChange={e=>setDeliveryMode(e.target.value as 'delivery'|'pickup')} className="mt-1 w-full border border-white/15 bg-[#1d3024] p-3"><option value="delivery">Deliver to household</option><option value="pickup">Arrange pickup</option></select>
              </label>
              <label className="text-xs">Household contact name
                <input required minLength={2} maxLength={120} value={buyerName} onChange={e=>setBuyerName(e.target.value)} className="mt-1 w-full border border-white/15 bg-[#1d3024] p-3"/>
              </label>
              <label className="text-xs">Phone / WhatsApp number
                <input required type="tel" maxLength={60} value={buyerPhone} onChange={e=>setBuyerPhone(e.target.value)} className="mt-1 w-full border border-white/15 bg-[#1d3024] p-3"/>
              </label>
              <label className="text-xs">Destination state
                <select value={destination} onChange={e=>setDestination(e.target.value)} className="mt-1 w-full border border-white/15 bg-[#1d3024] p-3">{FOOD_BRIDGE_STATES.map(state=><option key={state} value={state}>{state}</option>)}</select>
              </label>
              <label className="text-xs">Delivery district / nearest town
                <input required minLength={3} maxLength={160} value={area} onChange={e=>setArea(e.target.value)} placeholder="Lagos Mainland, Ikeja…" className="mt-1 w-full border border-white/15 bg-[#1d3024] p-3"/>
              </label>
            </div>
            <p className="text-sm">Farm produce subtotal: <strong>{money(Number(selected.unit_price_ngn)*Number(qty||0))}</strong></p>
            <p className="text-xs leading-5 text-amber-100">Delivery price is not known yet. The farmer must confirm the available food and provide a real transport quote. You can accept or decline that quote. Do not transfer money merely because you submitted a request.</p>
            <label className="flex items-start gap-2 text-xs text-stone-300"><input type="checkbox" className="mt-1" checked={shareBuyer} onChange={e=>setShareBuyer(e.target.checked)}/>After the farmer confirms, share my name and phone with that farmer so we can coordinate directly.</label>
            <button disabled={busy} type="submit" className="w-full bg-emerald-300 px-4 py-3 text-xs font-black text-emerald-950 disabled:opacity-50">Request available food · no payment</button>
          </form>}
        </section>

        <aside className="self-start border border-white/10 bg-white/[.025] p-5" data-food-buyer-tracking>
          <p className="flex items-center gap-2 text-xs font-black text-sky-200"><Package className="h-4 w-4"/> Your household order</p>
          <p className="mt-2 text-xs leading-5 text-stone-400">Your order key is private. Enter it here from this or another device to see farmer confirmation, the exact delivery quote and the current step.</p>
          <label className="mt-4 block text-xs text-stone-300">Private order key
            <input type="password" value={buyerKey} onChange={e=>setBuyerKey(e.target.value)} className="mt-2 w-full border border-white/15 bg-[#18251d] p-3"/>
          </label>
          <button type="button" onClick={()=>void trackBuyer(buyerKey).catch(e=>setMessage(String(e)))} className="mt-3 flex items-center gap-2 border border-white/20 px-4 py-2 text-xs"><RefreshCw className="h-4 w-4"/> Check order</button>
          {buyerOrder&&<div className="mt-5 border-t border-white/10 pt-4 text-sm">
            <p className="text-xs font-black uppercase tracking-wider text-emerald-200">{buyerOrder.status.replaceAll('_',' ')}</p>
            <h3 className="mt-2 text-lg font-black">{buyerOrder.produce} · {buyerOrder.quantity} {buyerOrder.unit}</h3>
            <p className="mt-1 text-xs text-stone-400">From {buyerOrder.farm_name}, {buyerOrder.origin_state} to {buyerOrder.destination_area}, {buyerOrder.destination_state}</p>
            <div className="mt-4 space-y-2 border-y border-white/10 py-3 text-xs">
              <p className="flex justify-between"><span>Food subtotal</span><strong>{money(buyerOrder.food_subtotal_ngn)}</strong></p>
              <p className="flex justify-between"><span>Delivery / pickup quotation</span><strong>{buyerOrder.delivery_quote_ngn===null?'Awaiting quote':money(buyerOrder.delivery_quote_ngn)}</strong></p>
              {buyerOrder.delivery_quote_ngn!==null&&<p className="flex justify-between text-base"><span>Total quoted</span><strong>{money(Number(buyerOrder.food_subtotal_ngn)+Number(buyerOrder.delivery_quote_ngn))}</strong></p>}
            </div>
            {buyerOrder.quote_note&&<p className="mt-3 text-xs text-stone-300">{buyerOrder.quote_note}</p>}
            {buyerOrder.farmer_contact&&<p className="mt-3 border border-emerald-300/20 p-3 text-xs">Farmer’s shared contact: <strong>{buyerOrder.farmer_contact}</strong></p>}
            {buyerOrder.status==='quoted'&&<button disabled={busy} type="button" onClick={()=>void buyerAction('accept_quote')} className="mt-4 w-full bg-emerald-300 px-3 py-3 text-xs font-black text-emerald-950"><Check className="mr-1 inline h-3.5 w-3.5"/> Accept this food + transport total</button>}
            {buyerOrder.status==='dispatched'&&<button disabled={busy} type="button" onClick={()=>void buyerAction('confirm_delivery')} className="mt-4 w-full bg-emerald-300 px-3 py-3 text-xs font-black text-emerald-950">Confirm food received</button>}
            {['requested','farmer_confirmed','quoted'].includes(buyerOrder.status)&&<button disabled={busy} type="button" onClick={()=>void buyerAction('cancel')} className="mt-4 w-full border border-rose-300/30 px-3 py-2 text-xs text-rose-200">Cancel request and release quantity</button>}
            <p className="mt-4 text-[11px] leading-5 text-amber-200">WEAVE has not collected payment, verified a transfer or guaranteed transport through this service.</p>
          </div>}
        </aside>
      </div>}

      {tab==='farm'&&<div className="mt-7 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-2xl font-black">Farmer supply desk</h2>
          <p className="mt-2 text-xs leading-6 text-stone-400">A farmer can bring real village surplus into the WEAVE food current. No paid File Folder is required for this initial supply registration. Administration confirms the supplier before offers are shown to households.</p>
          {!farmerKey?<form onSubmit={registerFarm} className="mt-5 space-y-4 border border-white/10 p-5">
            <label className="block text-xs">Farm or producer name<input value={farmName} onChange={e=>setFarmName(e.target.value)} required minLength={3} maxLength={120} className="mt-2 w-full border border-white/15 bg-[#18251d] p-3"/></label>
            <label className="block text-xs">Private phone / WhatsApp number<input type="tel" required value={farmPhone} onChange={e=>setFarmPhone(e.target.value)} className="mt-2 w-full border border-white/15 bg-[#18251d] p-3"/></label>
            <label className="block text-xs">State<select value={farmState} onChange={e=>setFarmState(e.target.value)} className="mt-2 w-full border border-white/15 bg-[#18251d] p-3">{FOOD_BRIDGE_STATES.map(state=><option key={state} value={state}>{state}</option>)}</select></label>
            <label className="block text-xs">Village / community<input required minLength={3} maxLength={120} value={community} onChange={e=>setCommunity(e.target.value)} className="mt-2 w-full border border-white/15 bg-[#18251d] p-3"/></label>
            <label className="flex gap-2 text-xs leading-5 text-stone-300"><input type="checkbox" checked={shareFarmer} onChange={e=>setShareFarmer(e.target.checked)} className="mt-1"/>Share my contact privately with households only after I confirm their requests.</label>
            <button disabled={busy} type="submit" className="w-full bg-amber-300 px-4 py-3 text-xs font-black text-black">Register actual farmer supply</button>
          </form>:<div className="mt-5 border border-emerald-300/25 p-5">
            <p className="text-xs font-black text-emerald-200">Farmer access · {farmer?.farmer.status||'Checking verification'}</p>
            <p className="mt-2 text-sm">{farmer?.farmer.farm_name||'Your farm'} · {farmer?.farmer.community}, {farmer?.farmer.state}</p>
            <p className="mt-3 text-xs text-stone-400">Your private key is saved in this browser. Store it somewhere secure before changing devices. Anyone holding the key can act for this farm.</p>
            <div className="mt-3 flex gap-2"><button type="button" onClick={()=>void navigator.clipboard?.writeText(farmerKey)} className="flex items-center gap-2 border border-white/15 px-3 py-2 text-xs"><ClipboardCopy className="h-4 w-4"/> Copy farmer key</button><button type="button" onClick={()=>void refreshFarmer(farmerKey).catch(e=>setMessage(String(e)))} className="flex items-center gap-2 border border-white/15 px-3 py-2 text-xs"><RefreshCw className="h-4 w-4"/> Refresh</button></div>
          </div>}
          {!farmerKey&&<div className="mt-5"><p className="mb-2 text-xs text-stone-400">Already registered? Enter your secret farmer key:</p><input type="password" value={existingFarmerKey} onChange={e=>setExistingFarmerKey(e.target.value)} className="w-full border border-white/15 bg-[#18251d] p-3"/><button type="button" onClick={()=>{setFarmerKey(existingFarmerKey);localStorage.setItem('weave_food_farmer_key',existingFarmerKey);void refreshFarmer(existingFarmerKey).catch(e=>setMessage(String(e)))}} className="mt-2 border border-white/15 px-4 py-2 text-xs">Open farmer desk</button></div>}
          {farmer?.farmer.status==='approved'&&<form onSubmit={publish} className="mt-7 space-y-4 border border-amber-200/20 p-5" data-food-farmer-offer>
            <h3 className="text-lg font-black">Publish available harvest</h3>
            <label className="block text-xs">Produce name<input required minLength={2} value={produce} onChange={e=>setProduce(e.target.value)} placeholder="Rice, yam, beans, tomatoes" className="mt-2 w-full border border-white/15 bg-[#18251d] p-3"/></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs">Unit<select value={unit} onChange={e=>setUnit(e.target.value)} className="mt-2 w-full border border-white/15 bg-[#18251d] p-3">{FOOD_BRIDGE_UNITS.map(item=><option key={item} value={item}>{item}</option>)}</select></label>
              <label className="text-xs">Unit price (₦)<input required type="number" step=".01" min=".01" value={price} onChange={e=>setPrice(e.target.value)} className="mt-2 w-full border border-white/15 bg-[#18251d] p-3"/></label>
              <label className="text-xs">Quantity available<input required type="number" step=".01" min=".01" value={available} onChange={e=>setAvailable(e.target.value)} className="mt-2 w-full border border-white/15 bg-[#18251d] p-3"/></label>
              <label className="text-xs">Minimum household order<input required type="number" step=".01" min=".01" value={minimum} onChange={e=>setMinimum(e.target.value)} className="mt-2 w-full border border-white/15 bg-[#18251d] p-3"/></label>
            </div>
            <label className="block text-xs">Produce condition / packing notes<textarea maxLength={500} rows={3} value={details} onChange={e=>setDetails(e.target.value)} className="mt-2 w-full border border-white/15 bg-[#18251d] p-3"/></label>
            <button disabled={busy} type="submit" className="w-full bg-amber-300 px-4 py-3 text-xs font-black text-black">Offer these units to households</button>
          </form>}
        </section>
        <section>
          <h2 className="flex items-center gap-2 text-xl font-black"><Truck className="h-5 w-5 text-amber-200"/> Incoming family orders</h2>
          <p className="mt-2 text-xs leading-6 text-stone-400">Requests arrive directly from households. Confirm the stock; obtain a real delivery charge; let the household approve the total; then arrange dispatch. Never invent a transport fee.</p>
          {!farmer?<div className="mt-5 border border-dashed border-white/15 p-6 text-xs text-stone-500">Open your farmer desk to see requests.</div>:!farmer.orders.length?<p className="mt-5 border border-dashed border-white/15 p-6 text-xs text-stone-500">No household requests yet.</p>:<div className="mt-5 space-y-4">
            {farmer.orders.map(order=><article key={order.id} className="border border-white/10 p-4">
              <p className="text-[10px] font-bold uppercase text-amber-200">{order.status.replaceAll('_',' ')}</p>
              <h3 className="mt-2 text-lg font-black">{order.produce} · {order.quantity} {order.unit}</h3>
              <p className="mt-2 text-xs text-stone-400">To {order.destination_area}, {order.destination_state} · {order.delivery_mode} · food subtotal {money(order.food_subtotal_ngn)}</p>
              {order.buyer_contact&&<p className="mt-2 text-xs">Contact shared by household: {order.buyer_name} · {order.buyer_contact}</p>}
              {order.status==='requested'&&<div className="mt-4 flex gap-3">
                <button disabled={busy} type="button" onClick={()=>void farmerAction(order.id,'confirm')} className="bg-emerald-300 px-4 py-2 text-xs font-bold text-black">Confirm available</button>
                <button disabled={busy} type="button" onClick={()=>void farmerAction(order.id,'reject')} className="border border-rose-300/30 px-4 py-2 text-xs text-rose-200">Decline</button>
              </div>}
              {order.status==='farmer_confirmed'&&<div className="mt-4 space-y-3">
                <label className="block text-xs">Delivery / pickup quotation in ₦
                  <input type="number" min="0" step=".01" value={quoteFee[order.id]||''} onChange={e=>setQuoteFee(p=>({...p,[order.id]:e.target.value}))} className="mt-2 w-full border border-white/15 bg-[#18251d] p-3"/>
                </label>
                <label className="block text-xs">Carrier and transport terms
                  <textarea required minLength={10} value={quoteNote[order.id]||''} onChange={e=>setQuoteNote(p=>({...p,[order.id]:e.target.value}))} rows={2} className="mt-2 w-full border border-white/15 bg-[#18251d] p-3"/>
                </label>
                <button disabled={busy} type="button" onClick={()=>void farmerAction(order.id,'quote')} className="bg-amber-300 px-4 py-3 text-xs font-black text-black">Send transport quote</button>
              </div>}
              {order.status==='accepted'&&<button disabled={busy} type="button" onClick={()=>void farmerAction(order.id,'dispatch')} className="mt-4 flex items-center gap-2 border border-emerald-300/25 px-4 py-2 text-xs"><Truck className="h-4 w-4"/> Mark dispatched</button>}
            </article>)}
          </div>}
          {farmer&&<div className="mt-6 border-t border-white/10 pt-5"><h3 className="text-sm font-black">Your available offers</h3>
            {farmer.offers.map(item=><p key={item.id} className="mt-3 text-xs text-stone-300">{item.produce} · {item.available_quantity} {item.unit} remaining · {item.status}</p>)}
          </div>}
        </section>
      </div>}
    </div>
    <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-7 text-xs text-stone-400 sm:px-6">
      <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4"/> Farmer verification by Administration · Independent household confirmation</span>
      <Link href="/" className="text-emerald-200">WEAVE Flame Event <ArrowRight className="inline h-4 w-4"/></Link>
    </footer>
  </main>
}
