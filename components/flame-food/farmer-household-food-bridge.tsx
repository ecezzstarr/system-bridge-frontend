'use client'
import { FarmToFamilySettlementInfo } from '@/components/weave-food/food-program-info'
import { FormEvent,useCallback,useEffect,useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle2, Flame, MapPin, RefreshCcw, Tractor, Truck } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { FOOD_BRIDGE_STATES, FOOD_BRIDGE_UNITS } from '@/lib/food-bridge-states'
import { WEAVE_HOUSEHOLD_BASKET_TEMPLATES,WEAVE_HOUSEHOLD_FOOD_GROUPS,quoteHouseholdBasket } from '@/lib/weave-household-food-store'

type Offer={id:string;produce:string;unit:string;available_quantity:string;minimum_quantity:string;unit_price_ngn:string;details:string;farm_name:string;state:string;community:string;basket_components?:{name:string;quantity:number;unit:string}[]|null;basket_individual_total_ngn?:string|null;basket_listed_saving_ngn?:string|null}
type Order={id:string;status:string;quantity:string;food_subtotal_ngn:string;delivery_quote_ngn:string|null;
  destination_state:string;destination_area:string;delivery_mode:string;created_at:string;quote_note?:string|null;
  produce:string;unit:string;farm_name?:string;origin_state?:string;farmer_contact?:string|null;buyer_contact?:string|null;
  escrow_status?:string|null;escrow_reference?:string|null;buyer_total_ngn?:string|null;
  seller_payout_ngn?:string|null;paymentAccountNumber?:string|null;weave_commission_ngn?:string|null;weaveCommissionNgn?:number}
type Farm={farmer:{id:string;farm_name:string;state:string;community:string;status:string}|null;
  offers:{id:string;produce:string;unit:string;available_quantity:string;unit_price_ngn:string;status:string}[];orders:Order[]}
const money=(value:unknown)=>'₦'+Number(value||0).toLocaleString('en-NG',{maximumFractionDigits:2})

export default function FarmerHouseholdFoodBridge(){
  const {user,token,isInitialized}=useAuth()
  const role=user?.role
  const isFarmerEligible=role==='agent'
  const [offers,setOffers]=useState<Offer[]>([])
  const [orders,setOrders]=useState<Order[]>([])
  const [farm,setFarm]=useState<Farm|null>(null)
  const [source,setSource]=useState('')
  const [query,setQuery]=useState('')
  const [tab,setTab]=useState<'market'|'farm'>('market')
  const [selected,setSelected]=useState<Offer|null>(null)
  const [qty,setQty]=useState('1')
  const [phone,setPhone]=useState('')
  const [area,setArea]=useState('')
  const [destination,setDestination]=useState('Lagos')
  const [deliveryMode,setDeliveryMode]=useState('delivery')
  const [shareBuyerContact,setShareBuyerContact]=useState(false)
  const [paymentRefs,setPaymentRefs]=useState<Record<string,string>>({})
  const [disputes,setDisputes]=useState<Record<string,string>>({})
  const [payoutBank,setPayoutBank]=useState('')
  const [payoutAccount,setPayoutAccount]=useState('')
  const [payoutName,setPayoutName]=useState('')
  const [farmName,setFarmName]=useState('')
  const [farmPhone,setFarmPhone]=useState('')
  const [farmCommunity,setFarmCommunity]=useState('')
  const [farmState,setFarmState]=useState('Kano')
  const [shareFarmerContact,setShareFarmerContact]=useState(false)
  const [produce,setProduce]=useState('')
  const [unit,setUnit]=useState('kg')
  const [stock,setStock]=useState('')
  const [minimum,setMinimum]=useState('')
  const [unitPrice,setUnitPrice]=useState('')
  const [produceDetails,setProduceDetails]=useState('')
  const [basketTemplate,setBasketTemplate]=useState<string>('family-starter')
  const [basketItems,setBasketItems]=useState<Record<string,string>>({})
  const [basketPrice,setBasketPrice]=useState('')
  const [basketCount,setBasketCount]=useState('')
  const [basketLabel,setBasketLabel]=useState('')
  const [basketIndependent,setBasketIndependent]=useState(false)
  const [fees,setFees]=useState<Record<string,string>>({})
  const [terms,setTerms]=useState<Record<string,string>>({})
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const headers=useCallback(():Record<string,string>=>({
    'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{}),
  }),[token])
  const read=useCallback(async(path:string)=>{
    const response=await fetch(path,{headers:headers(),cache:'no-store'})
    const body=await response.json()
    if(!response.ok)throw new Error(body.error||'Unable to load Lifestyle food activity')
    return body
  },[headers])
  const refresh=useCallback(async()=>{
    if(!token||!['agent','bridger'].includes(role||''))return
    try{
      const params=new URLSearchParams()
      if(source)params.set('origin',source)
      if(query.trim())params.set('search',query.trim())
      const [market,buying,farming]=await Promise.all([
        read('/api/flame/food?'+params.toString()),
        read('/api/flame/food/orders'),
        role==='agent'?read('/api/flame/food/farmer'):Promise.resolve(null),
      ])
      setOffers(market.offers||[])
      setOrders(buying.orders||[])
      setFarm(farming)
      setError('')
    }catch(e){setError(e instanceof Error?e.message:'Unable to load food exchange')}
  },[read,role,token,source,query])
  useEffect(()=>{void refresh()},[refresh])
  async function write(path:string,method:'POST'|'PATCH',body:Record<string,unknown>){
    const response=await fetch(path,{method,headers:headers(),body:JSON.stringify(body)})
    const data=await response.json()
    if(!response.ok)throw new Error(data.error||'Food activity failed')
    return data
  }
  async function action(operation:()=>Promise<unknown>,success:string){
    setBusy(true);setMessage('')
    try{await operation();setSelected(null);setMessage(success);await refresh()}
    catch(e){setMessage(e instanceof Error?e.message:'The operation did not complete')}
    finally{setBusy(false)}
  }
  function register(e:FormEvent){
    e.preventDefault()
    void action(()=>write('/api/flame/food','POST',{
      action:'register',farmName,contact:farmPhone,state:farmState,community:farmCommunity,shareFarmerContact,
    }),'Your farm is linked to your Agent identity. Administration verification is required to publish its offers.')
  }
  function publish(e:FormEvent){
    e.preventDefault()
    void action(()=>write('/api/flame/food','POST',{
      action:'offer',produce,unit,quantity:Number(stock),minimumQuantity:Number(minimum),
      priceNgn:Number(unitPrice),details:produceDetails,
    }),'Your farm surplus listing is now visible to eligible Agents and Bridgers. Keep availability accurate.')
  }
  function publishBasket(e:FormEvent){
    e.preventDefault()
    if(!farm?.farmer||farm.farmer.status!=='approved')return
    const components=Object.entries(basketItems).filter(([,v])=>Number(v)>0)
      .map(([offerId,quantity])=>({offerId,quantity:Number(quantity)}))
    try{
      quoteHouseholdBasket(components,
        farm.offers.filter(o=>o.status==='active'&&o.unit!=='pack'),Number(basketPrice))
    }catch(cause){setError(cause instanceof Error?cause.message:'Basket price or ingredients are invalid');return}
    if(!basketIndependent){setError('Confirm the listed packs are physically prepared and counted separately from loose stock.');return}
    setError('')
    void action(()=>write('/api/flame/food','POST',{
      action:'household_bundle',templateId:basketTemplate,packLabel:basketLabel,
      packCount:Number(basketCount),priceNgn:Number(basketPrice),
      stockAttestedSeparate:basketIndependent,components,
    }),'WEAVE Family Basket published with verified supplier-backed savings at the time of listing.')
  }
  function request(e:FormEvent){
    e.preventDefault()
    if(!selected)return
    void action(()=>write('/api/flame/food/orders','POST',{
      offerId:selected.id,quantity:Number(qty),buyerPhone:phone,destinationState:destination,destinationArea:area,
      deliveryMode,shareBuyerContact,
    }),'Food quantity reserved. The farmer must confirm and quote the delivery. You have not been charged.')
  }
  const buyerAction=(id:string,kind:string)=>void action(
    ()=>write('/api/flame/food/orders','PATCH',{orderId:id,action:kind,
      transactionReference:paymentRefs[id]||'',disputeNote:disputes[id]||''}),
    kind==='accept_quote'?'Quote accepted. Pay the exact amount to WEAVE using the FARM reference below. The farmer cannot dispatch until Administration verifies funds.':
    kind==='confirm_delivery'?'Receipt confirmed. WEAVE will release the full held payment to the farmer after bank settlement.':
    kind==='submit_payment_proof'?'Payment proof sent for WEAVE bank reconciliation; no dispatch yet.':
    kind==='dispute'?'Delivery dispute recorded; seller payout is blocked.':'Quantity released to the farmer.'
  )
  const sellerAction=(id:string,kind:string)=>void action(
    ()=>write('/api/flame/food/farmer','PATCH',{
      orderId:id,action:kind,deliveryFeeNgn:Number(fees[id]||0),quoteNote:terms[id]||'',
    }),'Farmer order updated. The household can track the next step.'
  )

  if(!isInitialized)return <main className="p-8 text-white">Opening Lifestyle Food Exchange…</main>
  if(!user||!['agent','bridger'].includes(role||''))return <main className="min-h-screen p-8 text-white">
    <h1 className="text-2xl font-black">WEAVE Lifestyle · Farm to Family</h1>
    <p className="mt-4 text-sm text-stone-400">Register or sign in as an Agent or Bridger to use the food exchange.</p>
    <div className="mt-4 flex gap-4"><Link href="/register" className="text-emerald-200">Register for WEAVE</Link><Link href="/login" className="text-sky-200">Sign in</Link></div>
  </main>

  return <main className="min-h-screen bg-[#08110d] text-white" data-lifestyle-food="farmer-household">
    <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-8"><FarmToFamilySettlementInfo audience="seller"/></div>
    <header className="border-b border-emerald-300/15 bg-[radial-gradient(circle_at_72%_0%,rgba(34,197,94,.15),transparent_48%)] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/weave/lifestyles" className="inline-flex items-center gap-2 text-xs text-emerald-200"><ArrowLeft className="h-4 w-4"/> Lifestyle</Link>
        <p className="mt-7 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-amber-200"><Flame className="h-4 w-4"/> Flame Event · Real food movement</p>
        <h1 className="mt-2 text-3xl font-black sm:text-5xl">FARM TO FAMILY · WEAVE FOOD STORE</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-300">When a farmer has excess produce in the North, an Agent or Bridger with a household in Lagos can order directly from that farmer. See who has stock, where it comes from and what the total will cost before agreeing.</p>
        <p className="mt-3 text-xs text-emerald-200">Your current position: {role==='agent'?'Agent · Buying and farming':'Bridger · Buying and arranging food'} · No additional Lifestyle charge.</p>
      </div>
    </header>
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
      <div className="flex flex-wrap justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex gap-2">
          <button type="button" onClick={()=>setTab('market')} className={`border px-4 py-2 text-xs font-black ${tab==='market'?'border-emerald-300 bg-emerald-300/10 text-white':'border-white/10 text-stone-400'}`}>Buy from farmers</button>
          {isFarmerEligible&&<button type="button" onClick={()=>setTab('farm')} className={`border px-4 py-2 text-xs font-black ${tab==='farm'?'border-amber-300 bg-amber-300/10 text-white':'border-white/10 text-stone-400'}`}>My farm & orders</button>}
        </div>
        <button type="button" onClick={()=>void refresh()} className="flex items-center gap-2 text-xs text-sky-200"><RefreshCcw className="h-4 w-4"/> Refresh live trades</button>
      </div>
      {error&&<p role="alert" className="mt-4 border border-rose-300/20 p-3 text-xs text-rose-200">{error}</p>}
      {message&&<p role="status" className="mt-4 border border-emerald-300/20 p-3 text-xs text-emerald-200">{message}</p>}
      {tab==='market'&&<div className="mt-7 space-y-8">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs text-stone-300">Source state
            <select value={source} onChange={e=>setSource(e.target.value)} className="mt-2 block w-full border border-white/15 bg-[#18281d] p-3 text-white"><option value="">All Nigeria</option>{FOOD_BRIDGE_STATES.map(s=><option value={s} key={s}>{s}</option>)}</select>
          </label>
          <label className="text-xs text-stone-300">Food / crop
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rice, yam, beans, tomatoes…" className="mt-2 block w-full border border-white/15 bg-[#18281d] p-3 text-white"/>
          </label>
        </div>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-food-live-offers>
          {offers.map(offer=><article key={offer.id} className="flex flex-col border border-emerald-200/15 bg-white/[.025] p-5">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-emerald-200"><MapPin className="h-4 w-4"/>{offer.community}, {offer.state}</p>
            <h2 className="mt-3 text-xl font-black">{offer.produce}</h2>
            {offer.basket_listed_saving_ngn&&<p className="mt-2 text-xs text-emerald-200">Supplier bundle saving at listing: {money(offer.basket_listed_saving_ngn)} against their individual offer prices</p>}
            <p className="mt-1 text-xs text-stone-400">From {offer.farm_name}</p>
            <p className="mt-4 text-2xl font-black">{money(offer.unit_price_ngn)}<span className="text-xs font-normal text-stone-400"> / {offer.unit} farm price</span></p>
            <p className="mt-3 text-xs text-stone-400">{offer.available_quantity} {offer.unit} left · minimum {offer.minimum_quantity} {offer.unit}</p>
            {offer.details&&<p className="mt-2 text-xs leading-5 text-stone-500">{offer.details}</p>}
            <button type="button" onClick={()=>{setSelected(offer);setQty(offer.minimum_quantity)}} className="mt-auto flex items-center justify-between bg-emerald-300 px-4 py-3 pt-3 text-xs font-black text-black">Order this food <ArrowRight className="h-4 w-4"/></button>
          </article>)}
          {!offers.length&&<p className="border border-dashed border-white/10 p-8 text-sm text-stone-400 sm:col-span-2">No produce is currently listed by approved Agent farmers. Offers appear when a farmer reports available stock.</p>}
        </section>
        {selected&&<form onSubmit={request} className="space-y-4 border border-emerald-300/30 p-5" data-food-direct-order>
          <h2 className="text-xl font-black">Order {selected.produce} from {selected.farm_name}</h2>
          <p className="text-xs text-stone-400">From {selected.community}, {selected.state} · Unit price {money(selected.unit_price_ngn)}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs">Quantity in {selected.unit}
              <input type="number" step={selected.unit==='pack'?'1':'.01'} min={selected.minimum_quantity} max={selected.available_quantity} value={qty} onChange={e=>setQty(e.target.value)} required className="mt-2 block w-full border border-white/15 bg-[#18281d] p-3"/>
            </label>
            <label className="text-xs">Destination state
              <select value={destination} onChange={e=>setDestination(e.target.value)} className="mt-2 block w-full border border-white/15 bg-[#18281d] p-3">{FOOD_BRIDGE_STATES.map(s=><option key={s} value={s}>{s}</option>)}</select>
            </label>
            <label className="text-xs">Delivery area
              <input required minLength={3} value={area} onChange={e=>setArea(e.target.value)} placeholder="Ikeja, Lagos" className="mt-2 block w-full border border-white/15 bg-[#18281d] p-3"/>
            </label>
            <label className="text-xs">Your phone / WhatsApp
              <input type="tel" required value={phone} onChange={e=>setPhone(e.target.value)} className="mt-2 block w-full border border-white/15 bg-[#18281d] p-3"/>
            </label>
            <label className="text-xs">How will you receive food?
              <select value={deliveryMode} onChange={e=>setDeliveryMode(e.target.value)} className="mt-2 block w-full border border-white/15 bg-[#18281d] p-3"><option value="delivery">Quoted delivery</option><option value="pickup">Arrange pickup</option></select>
            </label>
          </div>
          <p className="text-sm font-bold">Farm goods subtotal: {money(Number(qty||0)*Number(selected.unit_price_ngn))}</p>
          <p className="text-xs leading-5 text-amber-200">Transport is not included. The farmer must confirm this stock and send a real logistics quote. You accept the complete price before dispatch. This is not a paid order.</p>
          <label className="flex items-start gap-2 text-xs text-stone-300"><input type="checkbox" className="mt-1" checked={shareBuyerContact} onChange={e=>setShareBuyerContact(e.target.checked)}/>Allow the farmer to view my contact after confirming this request.</label>
          <div className="flex flex-wrap gap-3"><button type="submit" disabled={busy} className="bg-emerald-300 px-5 py-3 text-xs font-black text-black disabled:opacity-40">Reserve available quantity</button><button type="button" onClick={()=>setSelected(null)} className="border border-white/15 px-5 py-3 text-xs">Close</button></div>
        </form>}
        <section data-food-my-orders>
          <h2 className="text-xl font-black">Your food trades</h2>
          {!orders.length?<p className="mt-3 text-xs text-stone-400">No food orders placed from your position yet.</p>:<div className="mt-4 grid gap-4 md:grid-cols-2">
            {orders.map(o=><article key={o.id} className="border border-white/10 p-5">
              <p className="text-[10px] font-bold uppercase text-emerald-200">{o.status.replaceAll('_',' ')}</p>
              <h3 className="mt-2 text-lg font-black">{o.produce} · {o.quantity} {o.unit}</h3>
              <p className="mt-2 text-xs text-stone-400">{o.farm_name} in {o.origin_state} → {o.destination_area}, {o.destination_state}</p>
              <p className="mt-4 text-xs">Food: {money(o.food_subtotal_ngn)} · Delivery: {o.delivery_quote_ngn===null?'Awaiting quote':money(o.delivery_quote_ngn)}</p>
              {o.delivery_quote_ngn!==null&&<p className="mt-2 text-sm font-black">Total quoted: {money(Number(o.food_subtotal_ngn)+Number(o.delivery_quote_ngn))}</p>}
              {o.quote_note&&<p className="mt-2 text-xs text-stone-400">{o.quote_note}</p>}
              {o.farmer_contact&&<p className="mt-2 text-xs text-emerald-200">Supplier shared contact: {o.farmer_contact}</p>}
              {o.status==='quoted'&&<button disabled={busy} type="button" onClick={()=>buyerAction(o.id,'accept_quote')} className="mt-3 bg-emerald-300 px-4 py-2 text-xs font-black text-black">Accept complete quote</button>}
              {o.status==='accepted'&&<div className="mt-4 border border-emerald-300/20 p-4" data-food-farm-escrow-payment>
                <p className="text-xs font-black text-emerald-200">Pay WEAVE · conditional payment protection · ₦1,000 seller fee</p>
                <p className="mt-2 text-sm">Send {money(o.buyer_total_ngn)} to WEAVE OPay account <strong>{o.paymentAccountNumber||'See verified payment instructions'}</strong> using reference <strong>{o.escrow_reference}</strong>.</p>
                <p className="mt-2 text-xs text-stone-400">Seller is notified only after Administration confirms actual receipt. Never pay farmer directly for this escrow order.</p>
                {o.escrow_status==='awaiting_payment'&&<div className="mt-3 flex flex-wrap gap-2">
                  <input aria-label="Actual transfer reference" value={paymentRefs[o.id]||''} onChange={e=>setPaymentRefs(p=>({...p,[o.id]:e.target.value}))} placeholder="OPay/bank transfer reference" className="min-w-48 flex-1 border border-white/15 bg-[#18281d] p-3 text-sm"/>
                  <button disabled={busy||(paymentRefs[o.id]||'').trim().length<8} onClick={()=>buyerAction(o.id,'submit_payment_proof')} className="bg-emerald-300 px-4 py-2 text-xs font-black text-black">Submit paid transfer reference</button>
                </div>}
                {o.escrow_status==='proof_submitted'&&<p className="mt-3 text-xs text-amber-200">Bank verification pending. Do not request dispatch yet.</p>}
              </div>}
              {o.status==='funds_held'&&<p className="mt-3 text-xs font-black text-emerald-200">WEAVE confirmed funds held; farmer is authorized to dispatch.</p>}
              {o.status==='dispatched'&&<div className="mt-4"><label className="text-xs">Delivery problem? <textarea value={disputes[o.id]||''} onChange={e=>setDisputes(p=>({...p,[o.id]:e.target.value}))} placeholder="Explain a missing or incomplete delivery" className="mt-2 block w-full border border-white/15 bg-[#18281d] p-2 text-sm"/></label><button disabled={busy||(disputes[o.id]||'').trim().length<15} onClick={()=>buyerAction(o.id,'dispute')} className="mt-2 border border-rose-300/25 px-4 py-2 text-xs text-rose-200">Hold payout · report problem</button></div>}
              {o.status==='dispatched'&&<button disabled={busy} type="button" onClick={()=>buyerAction(o.id,'confirm_delivery')} className="mt-3 bg-emerald-300 px-4 py-2 text-xs font-black text-black">Confirm food received</button>}
              {['requested','farmer_confirmed','quoted','accepted'].includes(o.status)&&<button disabled={busy} type="button" onClick={()=>buyerAction(o.id,'cancel')} className="ml-2 mt-3 border border-rose-300/20 px-4 py-2 text-xs text-rose-200">Cancel order</button>}
            </article>)}
          </div>}
        </section>
      </div>}
      {tab==='farm'&&isFarmerEligible&&<section className="mt-7 grid gap-8 lg:grid-cols-2" data-food-agent-farm>
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black"><Tractor className="h-5 w-5 text-amber-200"/> Your farm · Agent position</h2>
          <p className="mt-3 text-xs leading-6 text-stone-400">Your WEAVE Agent identity owns the farm account. A separate farmer login or extra subscription is not required. Administration verifies the farm before publishing available stock.</p>
          {!farm?.farmer?<form onSubmit={register} className="mt-5 space-y-4 border border-white/10 p-5">
            <label className="block text-xs">Name of farm / producer<input required minLength={3} value={farmName} onChange={e=>setFarmName(e.target.value)} className="mt-2 w-full border border-white/15 bg-[#18281d] p-3"/></label>
            <label className="block text-xs">Farm contact<input required type="tel" value={farmPhone} onChange={e=>setFarmPhone(e.target.value)} className="mt-2 w-full border border-white/15 bg-[#18281d] p-3"/></label>
            <label className="block text-xs">State<select value={farmState} onChange={e=>setFarmState(e.target.value)} className="mt-2 w-full border border-white/15 bg-[#18281d] p-3">{FOOD_BRIDGE_STATES.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
            <label className="block text-xs">Village or community<input required minLength={3} value={farmCommunity} onChange={e=>setFarmCommunity(e.target.value)} className="mt-2 w-full border border-white/15 bg-[#18281d] p-3"/></label>
            <label className="flex items-start gap-2 text-xs text-stone-400"><input type="checkbox" className="mt-1" checked={shareFarmerContact} onChange={e=>setShareFarmerContact(e.target.checked)}/>Let confirmed buyers see my farm contact to coordinate delivery.</label>
            <button type="submit" disabled={busy} className="bg-amber-300 px-5 py-3 text-xs font-black text-black">Register farm under my Agent account</button>
          </form>:<div className="mt-4 border border-white/10 p-4">
            <p className="text-xs font-black text-amber-200">{farm.farmer.farm_name} · {farm.farmer.status.toUpperCase()}</p>
            <p className="mt-2 text-xs text-stone-400">{farm.farmer.community}, {farm.farmer.state}</p>
          </div>}
          {farm?.farmer?.status==='approved'&&<div className="mt-5 border border-emerald-300/25 p-5" data-farmer-escrow-bank><h3 className="text-sm font-black">Your private bank account for farm payouts</h3><p className="mt-2 text-xs text-stone-400">WEAVE takes one flat ₦1,000 service fee from the proceeds of each completed trade, regardless of quantity. Administration pays the remaining buyer total to this bank account after receipt confirmation. Details are not published to buyers.</p><div className="mt-3 grid gap-2 sm:grid-cols-3"><input aria-label="Bank name" placeholder="Bank name" value={payoutBank} onChange={e=>setPayoutBank(e.target.value)} className="border border-white/10 bg-[#18281d] p-3 text-sm"/><input aria-label="Account number" placeholder="10-digit account number" value={payoutAccount} onChange={e=>setPayoutAccount(e.target.value)} className="border border-white/10 bg-[#18281d] p-3 text-sm"/><input aria-label="Account holder name" placeholder="Account holder name" value={payoutName} onChange={e=>setPayoutName(e.target.value)} className="border border-white/10 bg-[#18281d] p-3 text-sm"/></div><button disabled={busy} onClick={()=>void action(()=>write('/api/flame/food','POST',{action:'set_payout_account',bankName:payoutBank,accountNumber:payoutAccount,accountName:payoutName}),'Private farm payout details recorded.')} className="mt-3 border border-emerald-300/30 px-4 py-2 text-xs text-emerald-200">Save receiving account</button></div>}
          {farm?.farmer?.status==='approved'&&<form onSubmit={publish} className="mt-6 space-y-3 border border-amber-300/20 p-5" data-food-agent-surplus>
            <h3 className="text-lg font-black">Offer actual surplus stock</h3>
            <label className="block text-xs">Produce<input required value={produce} onChange={e=>setProduce(e.target.value)} className="mt-2 w-full border border-white/15 bg-[#18281d] p-3"/></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs">Selling unit<select value={unit} onChange={e=>setUnit(e.target.value)} className="mt-2 w-full border border-white/15 bg-[#18281d] p-3">{FOOD_BRIDGE_UNITS.map(u=><option value={u} key={u}>{u}</option>)}</select></label>
              <label className="text-xs">Price ₦ per unit<input type="number" step=".01" min=".01" required value={unitPrice} onChange={e=>setUnitPrice(e.target.value)} className="mt-2 w-full border border-white/15 bg-[#18281d] p-3"/></label>
              <label className="text-xs">Surplus quantity<input type="number" step=".01" min=".01" required value={stock} onChange={e=>setStock(e.target.value)} className="mt-2 w-full border border-white/15 bg-[#18281d] p-3"/></label>
              <label className="text-xs">Minimum buy quantity<input type="number" step=".01" min=".01" required value={minimum} onChange={e=>setMinimum(e.target.value)} className="mt-2 w-full border border-white/15 bg-[#18281d] p-3"/></label>
            </div>
            <label className="block text-xs">Harvest, condition and packing<textarea maxLength={500} rows={3} value={produceDetails} onChange={e=>setProduceDetails(e.target.value)} className="mt-2 w-full border border-white/15 bg-[#18281d] p-3"/></label>
            <button type="submit" disabled={busy} className="bg-amber-300 px-5 py-3 text-xs font-black text-black">Publish farm stock</button>
          </form>}
          {farm?.farmer?.status==='approved'&&<form onSubmit={publishBasket} className="mt-6 space-y-4 border border-emerald-300/30 p-5" data-publish-weave-family-basket>
            <h3 className="text-xl font-black text-emerald-100">Create a cheaper branded WEAVE Family Basket</h3>
            <p className="text-xs leading-6 text-stone-300">Choose actual items you already offer separately, package them as a distinct ready-to-ship basket, then set a lower combined price. The comparison uses YOUR current individual item prices, not invented national market figures. Sell only physically separate prepared basket stock.</p>
            <label className="block text-xs">Family Basket brand
              <select value={basketTemplate} onChange={e=>setBasketTemplate(e.target.value)} className="mt-2 w-full border border-white/15 bg-[#18281d] p-3">
                {WEAVE_HOUSEHOLD_BASKET_TEMPLATES.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <p className="text-xs text-stone-400">{WEAVE_HOUSEHOLD_BASKET_TEMPLATES.find(t=>t.id===basketTemplate)?.description}</p>
            <div className="max-h-72 space-y-2 overflow-y-auto border border-white/10 p-3">
              {farm.offers.filter(o=>o.status==='active'&&o.unit!=='pack'&&Number(o.available_quantity)>0).map(offer=><label key={offer.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 py-2 text-xs">
                <span>{offer.produce} · {money(offer.unit_price_ngn)}/{offer.unit} · {offer.available_quantity} available</span>
                <input aria-label={`Quantity of ${offer.produce} in basket`} type="number" min="0" step=".01" max={offer.available_quantity} value={basketItems[offer.id]||''}
                  placeholder="Qty" onChange={e=>setBasketItems(x=>({...x,[offer.id]:e.target.value}))}
                  className="w-24 border border-white/20 bg-[#18281d] p-2 text-white"/>
              </label>)}
            </div>
            {farm.offers.filter(o=>o.status==='active'&&o.unit!=='pack').length<3&&<p className="text-xs text-amber-200">Publish at least three different genuine item offers first (for example rice, beans and palm oil).</p>}
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs">Prepared baskets physically available<input type="number" min="1" max="100" step="1" required value={basketCount} onChange={e=>setBasketCount(e.target.value)} className="mt-2 w-full border border-white/15 bg-[#18281d] p-3"/></label>
              <label className="text-xs">Discounted price ₦ per basket<input type="number" min="1000.01" step=".01" required value={basketPrice} onChange={e=>setBasketPrice(e.target.value)} className="mt-2 w-full border border-white/15 bg-[#18281d] p-3"/></label>
            </div>
            <label className="block text-xs">Optional batch name<input value={basketLabel} onChange={e=>setBasketLabel(e.target.value)} maxLength={50} placeholder="Family value pack" className="mt-2 w-full border border-white/15 bg-[#18281d] p-3"/></label>
            <p className="text-xs text-emerald-200">Separate prices at your listed rates: {money(Object.entries(basketItems).reduce((total,[id,q])=>{const offer=farm.offers.find(x=>x.id===id);return total+(offer?Number(offer.unit_price_ngn)*Number(q||0):0)},0))}. Saving appears only if the final basket price is lower.</p>
            <label className="flex items-start gap-2 text-xs text-stone-300"><input type="checkbox" checked={basketIndependent} onChange={e=>setBasketIndependent(e.target.checked)} className="mt-0.5"/>I have physically prepared this many full baskets and set aside their ingredients separately from my loose-item inventory. I will not sell the same food twice.</label>
            <button type="submit" disabled={busy||!basketIndependent} className="border border-emerald-300/50 bg-emerald-300 px-5 py-3 text-xs font-black text-[#062010] disabled:opacity-40">Publish a cheaper WEAVE Family Basket</button>
          </form>}
          {farm&&farm.offers.length>0&&<div className="mt-5 border-t border-white/10 pt-4">
            <h3 className="text-sm font-black">Your inventory</h3>
            {farm.offers.map(i=><div key={i.id} className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-300">
              <span>{i.produce} · {i.available_quantity} {i.unit} remaining · {i.status}</span>
              <button disabled={busy} onClick={()=>void action(()=>write('/api/flame/food/farmer','PATCH',{action:i.status==='paused'?'resume_offer':'pause_offer',offerId:i.id}),'Farm offer visibility changed.')} className="border border-white/15 px-3 py-2">{i.status==='paused'?'Resume':'Pause'}</button>
            </div>)}
          </div>}
        </div>
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black"><Truck className="h-5 w-5 text-amber-200"/> Offers moving to households</h2>
          <p className="mt-3 text-xs leading-5 text-stone-400">A confirmed request can receive a real transport quote. After the buyer accepts the quote and pays WEAVE, only Administration-confirmed held funds authorize dispatch. WEAVE deducts exactly ₦1,000 from the seller for each completed order, then pays the remainder after confirmed delivery. No fee is charged for an uncompleted or refunded order.</p>
          {(!farm?.orders.length)?<p className="mt-5 border border-dashed border-white/15 p-6 text-xs text-stone-400">No family orders received yet.</p>:<div className="mt-4 space-y-4">
            {farm.orders.map(o=><article key={o.id} className="border border-white/10 p-5">
              <p className="text-[10px] font-black uppercase text-amber-200">{o.status.replaceAll('_',' ')}</p>
              <h3 className="mt-2 text-lg font-black">{o.produce} · {o.quantity} {o.unit}</h3>
              <p className="mt-2 text-xs text-stone-400">Deliver to {o.destination_area}, {o.destination_state} · {money(o.food_subtotal_ngn)} food subtotal</p>
              {o.buyer_total_ngn!==null&&o.buyer_total_ngn!==undefined&&<div className="mt-3 border border-emerald-300/20 p-3 text-xs text-stone-300" data-farmer-order-settlement><p>Buyer total: {money(o.buyer_total_ngn)}</p><p>WEAVE flat seller fee (one per order): {money(o.weave_commission_ngn||1000)}</p><p className="font-black text-emerald-200">Farmer payout after confirmed delivery: {money(o.seller_payout_ngn)}</p></div>}
              {o.buyer_contact&&<p className="mt-2 text-xs text-emerald-200">Buyer consented contact: {o.buyer_contact}</p>}
              {o.status==='requested'&&<div className="mt-3 flex flex-wrap gap-3">
                <button disabled={busy} onClick={()=>sellerAction(o.id,'confirm')} className="bg-emerald-300 px-4 py-2 text-xs font-black text-black">Confirm stock</button>
                <button disabled={busy} onClick={()=>sellerAction(o.id,'reject')} className="border border-rose-300/30 px-4 py-2 text-xs text-rose-200">Decline</button>
              </div>}
              {o.status==='farmer_confirmed'&&<div className="mt-4 space-y-3">
                <label className="block text-xs">Real transport quote (₦)<input type="number" min="0" step=".01" value={fees[o.id]||''} onChange={e=>setFees(prev=>({...prev,[o.id]:e.target.value}))} className="mt-2 w-full border border-white/15 bg-[#18281d] p-3"/></label>
                <label className="block text-xs">Carrier, transport and delivery terms<textarea minLength={10} required value={terms[o.id]||''} onChange={e=>setTerms(prev=>({...prev,[o.id]:e.target.value}))} className="mt-2 w-full border border-white/15 bg-[#18281d] p-3"/></label>
                <button disabled={busy} onClick={()=>sellerAction(o.id,'quote')} type="button" className="bg-amber-300 px-4 py-2 text-xs font-black text-black">Send total for approval</button>
              </div>}
              {o.status==='funds_held'&&<button disabled={busy} type="button" onClick={()=>sellerAction(o.id,'dispatch')} className="mt-4 border border-emerald-300/30 px-4 py-2 text-xs">Mark as dispatched</button>}
              {o.status==='accepted'&&<p className="mt-3 text-xs text-amber-200">Awaiting WEAVE verification of buyer payment. Do not dispatch.</p>}
              {o.status==='delivered'&&<p className="mt-3 flex items-center gap-2 text-xs text-emerald-200"><CheckCircle2 className="h-4 w-4"/> Household confirmed receipt · WEAVE payout pending</p>}
              {o.status==='released'&&<p className="mt-3 text-xs text-emerald-200">WEAVE recorded the net farmer payout after deducting one flat ₦1,000 fee.</p>}
            </article>)}
          </div>}
        </div>
      </section>}
    </div>
  </main>
}
