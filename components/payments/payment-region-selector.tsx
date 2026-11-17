'use client'
import {useCallback,useEffect,useState} from 'react'
import {WEAVE_PAYMENT_COUNTRIES,suggestCountryFromLocale,
  type WeaveCountryCode,type WeaveCheckoutPurpose,type WeavePaymentRail} from '@/lib/weave-payment-region'

type Quote={amountSwitch:number;payCurrency:string;payAmount:number;rateSource:string;excludesProviderFees:boolean}
type Result={
 country:WeaveCountryCode|null;localCurrency:string|null;defaultRail:WeavePaymentRail|null;
 paymentReady:boolean;selectionSource:string;quote:Quote|null;notice:string;success:boolean
}
export type RegionResolution={country:WeaveCountryCode|null;rail:WeavePaymentRail|null;ready:boolean}
export function PaymentRegionSelector({purpose,amountSwitch,onResolved,disabled=false}:{
 purpose:WeaveCheckoutPurpose;amountSwitch?:number;
 onResolved:(next:RegionResolution)=>void;disabled?:boolean
}){
 const [country,setCountry]=useState<WeaveCountryCode|null>(null)
 const [confirmed,setConfirmed]=useState(false)
 const [source,setSource]=useState('')
 const [quote,setQuote]=useState<Quote|null>(null)
 const [ready,setReady]=useState(false)
 const [warning,setWarning]=useState('')
 const [busy,setBusy]=useState(false)
 const [loaded,setLoaded]=useState(false)
 const token=typeof window!=='undefined'?localStorage.getItem('ssb_auth_token'):null
 const notify=(next:RegionResolution)=>onResolved(next)
 const load=useCallback(async()=>{
  const url='/api/payments/region?purpose='+encodeURIComponent(purpose)
  const resp=await fetch(url,{cache:'no-store',headers:token?{Authorization:'Bearer '+token}:{}})
  const result=await resp.json()
  if(!resp.ok)throw new Error(result.error||'Country routing unavailable')
  const stored=result.country as WeaveCountryCode|null
  if(stored && result.selectionSource==='account'){
    setCountry(stored);setConfirmed(true);setSource('account')
  }else{
    let publicValue:WeaveCountryCode|null=null
    try{
      const explicit=localStorage.getItem('weave:checkout:confirmed-country')
      if(explicit)publicValue=WEAVE_PAYMENT_COUNTRIES.find(x=>x.code===explicit)?.code||null
    }catch{}
    const locale=typeof navigator!=='undefined'?(navigator.languages?.[0]||navigator.language):''
    const suggestion=(token?null:publicValue)||suggestCountryFromLocale(locale)
    setCountry(suggestion)
    setConfirmed(Boolean(publicValue&&!token))
    setSource(publicValue&&!token?'public_choice':'suggested')
  }
  setLoaded(true)
 },[purpose,token])
 useEffect(()=>{
  void load().catch(err=>{setLoaded(true);setWarning(err instanceof Error?err.message:'Country routing unavailable')})
 },[load])
 const refreshQuote=useCallback(async()=>{
  if(!country||!confirmed){setQuote(null);setReady(false);notify({country:null,rail:null,ready:false});return}
  const search=new URLSearchParams({purpose,country})
  if(Number.isFinite(amountSwitch)&&Number(amountSwitch)>0)search.set('amountSwitch',String(amountSwitch))
  const resp=await fetch('/api/payments/region?'+search.toString(),{cache:'no-store',
    headers:token?{Authorization:'Bearer '+token}:{}})
  const result:Result=await resp.json()
  if(!resp.ok)throw new Error((result as {error?:string}).error||'Payment method unavailable')
  const activeResult=result.country===country?result:null
  if(!activeResult||!activeResult.defaultRail){
    setQuote(null);setReady(false);notify({country:null,rail:null,ready:false})
    return
  }
  // For wallet deposits no amount is supplied; readiness is based on route
  // availability, not an amount quote. Actual checkout is still server-quoted.
  const isReady=purpose==='wallet_deposit'
     ?activeResult.defaultRail==='paystack_ngn'
     :activeResult.paymentReady
  setQuote(activeResult.quote)
  setReady(isReady)
  setWarning(activeResult.notice||'')
  notify({country,rail:activeResult.defaultRail,ready:isReady})
 },[country,confirmed,purpose,amountSwitch,token,onResolved])
 useEffect(()=>{
  if(!loaded)return
  void refreshQuote().catch(err=>{
    setQuote(null);setReady(false)
    notify({country:null,rail:null,ready:false})
    setWarning(err instanceof Error?err.message:'Unable to obtain a payment route')
  })
 // onResolved is a callback passed by the parent; parent should memoize it.
 },[loaded,refreshQuote])
 const save=async()=>{
  if(!country||busy)return
  setBusy(true);setWarning('')
  try{
    if(token){
      const resp=await fetch('/api/payments/region',{method:'POST',
        headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify({country,purpose,confirmedByUser:true})})
      const result=await resp.json()
      if(!resp.ok)throw new Error(result.error||'Could not save country')
      setSource('account')
    }else {
      localStorage.setItem('weave:checkout:confirmed-country',country)
      setSource('public_choice')
    }
    setConfirmed(true)
  }catch(err){setWarning(err instanceof Error?err.message:'Unable to select country')}
  finally{setBusy(false)}
 }
 return <section data-weave-country-checkout className="rounded-xl border border-cyan-300/20 bg-[#091a26] p-4 text-slate-100">
   <h3 className="text-sm font-bold">Payment country & currency</h3>
   <p className="mt-1 text-xs leading-5 text-slate-400">Weave uses your saved payment country for future checkout. Confirm it once; you can change it here. Browser language is a suggestion, not identity or residence verification.</p>
   <div className="mt-3 flex flex-wrap items-end gap-2">
     <label className="min-w-[180px] flex-1 text-xs">Country or region
       <select value={country||''} disabled={busy||disabled}
         onChange={e=>{
          const chosen=WEAVE_PAYMENT_COUNTRIES.find(x=>x.code===e.target.value)?.code||null
          setCountry(chosen);setConfirmed(false);setQuote(null);setReady(false)
          notify({country:null,rail:null,ready:false})
         }}
         className="mt-1 block min-h-11 w-full rounded-lg border border-white/20 bg-slate-950 px-3 text-sm text-white">
         <option value="">Choose country</option>
         {WEAVE_PAYMENT_COUNTRIES.map(c=><option key={c.code} value={c.code}>{c.label}</option>)}
       </select>
     </label>
     {!confirmed&&<button type="button" onClick={()=>void save()} disabled={!country||busy||disabled}
       className="min-h-11 rounded-lg bg-cyan-200 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40">
       {busy?'Saving…':'Confirm payment country'}
     </button>}
   </div>
   {confirmed&&country&&<p className="mt-3 text-sm font-semibold text-cyan-100">
     {country==='NG'?'NGN · Nigerian bank and card via Paystack':
       (WEAVE_PAYMENT_COUNTRIES.find(x=>x.code===country)?.currency||'Local fiat')+
       ' · local gateway not yet enabled; TRX on TRON for eligible purchases'}
   </p>}
   {confirmed&&country&&<p className="mt-2 text-xs leading-5 text-slate-300">
     1 TRX paid and independently verified = 1 System Switch internal unit.
     {country==='NG'?' OPay and other Nigerian banks may be accessible as provider payment channels; these are not separate unverified direct-bank integrations.':''}
     {' '}Bybit may be used to send TRX to a verified destination address; it is not a direct Bybit Pay integration.
     Flutterwave and additional crypto-provider payment integrations are not yet enabled.
   </p>}
   {confirmed&&quote&&<p data-weave-converted-checkout-quote className="mt-3 text-sm text-amber-100">
     {quote.amountSwitch.toLocaleString()} System Switch reference · {quote.payAmount.toLocaleString(undefined,{maximumFractionDigits:2})} {quote.payCurrency}
     {' '}({quote.rateSource==='live'?'live exchange quotation':'1 TRX = 1 System Switch'})
     · fees and network charges shown separately at final payment.
   </p>}
   {confirmed&&!ready&&<p className="mt-3 text-xs text-amber-200">
     {purpose==='wallet_deposit'?'This country has no enabled local wallet funding route; manual TRX funding remains retired.':'Checkout unavailable for this country/route until the selected method is verified and configured.'}
   </p>}
   {source==='suggested'&&!confirmed&&<p className="mt-2 text-xs text-amber-200">Suggested from device settings. Confirm the correct country before checkout.</p>}
   {warning&&<p role="status" className="mt-2 text-xs text-slate-300">{warning}</p>}
 </section>
}
