'use client'

import { useEffect,useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import {
  DEFAULT_USER_DISPLAY_CURRENCY,USER_DISPLAY_CURRENCIES,
  isUserDisplayCurrency,formatUserDisplayCurrency,usdToDisplayCurrency,
  type UserDisplayCurrency,
} from '@/lib/user-display-currency'

type FxRate={currency:UserDisplayCurrency,rate:number,updatedAt:string,source:string}

/**
 * Reusable account-owned financial card. USD is WEAVE's base; changing the
 * preferred visible currency never changes balance, ledger, fees or checkout.
 */
export function UserCurrencyCard({
  amountUsd, quotedAt, legacyRate, kind='legacy-estimate', className='',
}:{
  amountUsd:number|null
  quotedAt?:string|null
  legacyRate?:number|null
  kind?:'usd-wallet'|'legacy-estimate'
  className?:string
}){
  const {user,token,isInitialized}=useAuth()
  const [currency,setCurrency]=useState<UserDisplayCurrency>(DEFAULT_USER_DISPLAY_CURRENCY)
  const [loadingPreference,setLoadingPreference]=useState(true)
  const [saving,setSaving]=useState(false)
  const [preferenceError,setPreferenceError]=useState('')
  const [fx,setFx]=useState<FxRate|null>(null)
  const [fxError,setFxError]=useState('')
  const [fetchingFx,setFetchingFx]=useState(false)

  useEffect(()=>{
    if(!isInitialized)return
    if(!user?.id){setLoadingPreference(false);return}
    const controller=new AbortController()
    setLoadingPreference(true)
    setPreferenceError('')
    fetch('/api/user/currency',{
      headers:token?{Authorization:'Bearer '+token}:{},
      cache:'no-store',signal:controller.signal,
    })
      .then(async response=>{
        const data=await response.json().catch(()=>null)
        if(!response.ok||!isUserDisplayCurrency(data?.currency)) throw Error(
          data?.error||'Saved display currency unavailable')
        setCurrency(data.currency)
      })
      .catch(error=>{
        if(controller.signal.aborted)return
        setPreferenceError(error instanceof Error?error.message:'Currency preference unavailable')
      })
      .finally(()=>{if(!controller.signal.aborted)setLoadingPreference(false)})
    return ()=>controller.abort()
  },[isInitialized,user?.id,token])

  useEffect(()=>{
    if(currency==='USD'){
      setFx({currency:'USD',rate:1,updatedAt:new Date().toISOString(),source:'weave_usd_base'})
      setFxError('')
      setFetchingFx(false)
      return
    }
    const controller=new AbortController()
    setFx(null)
    setFetchingFx(true)
    setFxError('')
    fetch('/api/currency/display-rate?currency='+encodeURIComponent(currency),{
      cache:'no-store',signal:controller.signal,
    })
      .then(async response=>{
        const data=await response.json().catch(()=>null)
        if(!response.ok||data?.currency!==currency||data?.base!=='USD'||
          !Number.isFinite(data?.rate)||data.rate<=0||typeof data?.updatedAt!=='string') {
          throw Error(data?.error||'Currency reference rate unavailable')
        }
        setFx({currency,rate:data.rate,updatedAt:data.updatedAt,source:data.source||''})
      })
      .catch(error=>{
        if(controller.signal.aborted)return
        setFxError(error instanceof Error?error.message:'Currency reference unavailable')
      })
      .finally(()=>{if(!controller.signal.aborted)setFetchingFx(false)})
    return ()=>controller.abort()
  },[currency])

  const updateCurrency=async(value:string)=>{
    if(!isUserDisplayCurrency(value)||!user?.id||saving||loadingPreference)return
    const previous=currency
    setCurrency(value)
    setSaving(true)
    setPreferenceError('')
    try{
      const response=await fetch('/api/user/currency',{
        method:'PUT',
        headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},
        body:JSON.stringify({currency:value}),
      })
      const data=await response.json().catch(()=>null)
      if(!response.ok||data?.currency!==value)throw Error(data?.error||'Could not save currency')
    }catch(error){
      setCurrency(previous)
      setPreferenceError(error instanceof Error?error.message:'Could not save currency')
    }finally{setSaving(false)}
  }

  const converted=amountUsd==null||!fx||fx.currency!==currency
    ?null:usdToDisplayCurrency(amountUsd,fx.rate)
  const base=amountUsd!=null&&Number.isFinite(amountUsd)
    ?formatUserDisplayCurrency(amountUsd,'USD'):'Unavailable'

  return <section className={`rounded-xl border border-sky-300/20 bg-sky-400/5 p-4 ${className}`}
    data-user-currency-card="true" data-display-currency={currency}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p className="text-xs font-semibold text-sky-200">{kind==='usd-wallet'?'USD account balance':'Estimated value of legacy balance'}</p>
        <p className="mt-1 text-[10px] text-slate-400">Base currency: USD</p>
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-200">
        <span>Show in</span>
        <select value={currency}
          aria-label="Choose account card display currency"
          disabled={!user||saving||loadingPreference}
          onChange={event=>void updateCurrency(event.target.value)}
          className="max-w-[200px] rounded-lg border border-sky-300/30 bg-slate-950 px-2.5 py-2 text-sm font-semibold text-white"
          data-currency-picker="true">
          {USER_DISPLAY_CURRENCIES.map(option=>
            <option key={option.code} value={option.code}>{option.label}</option>
          )}
        </select>
      </label>
    </div>
    <p className="mt-3 break-words text-2xl font-bold text-white" aria-live="polite">
      {fetchingFx?'Checking rate…':converted===null?'Unavailable':formatUserDisplayCurrency(converted,currency)}
    </p>
    <p className="mt-1 text-xs text-slate-300">USD reference: {base}</p>
    <p className="mt-2 text-[11px] leading-5 text-slate-400">
      {converted!==null&&fx&&currency!=='USD'
        ? `1 USD ≈ ${fx.rate.toLocaleString('en-US',{maximumFractionDigits:6})} ${currency} · reference ${new Date(fx.updatedAt).toLocaleDateString()}. `
        : ''}
      {quotedAt?'TRX/USD reference checked '+new Date(quotedAt).toLocaleString()+'. ':''}
      {legacyRate!=null?'Original wallet units remain TRX-referenced. ':''}
      {kind==='usd-wallet'
        ? 'This card changes only the display currency. The actual account balance remains in USD. Payouts and spending require enabled USD rails.'
        : 'Indicative value only; not a withdrawable USD balance or a checkout exchange rate.'}
    </p>
    {currency!=='USD'&&<a href="https://www.exchangerate-api.com"
      target="_blank" rel="noopener noreferrer"
      className="mt-2 inline-block text-[10px] text-sky-300 underline underline-offset-2">
      Rates By Exchange Rate API
    </a>}
    {fxError&&<p role="status" className="mt-2 text-xs text-amber-200">{fxError}</p>}
    {preferenceError&&<p role="alert" className="mt-2 text-xs text-amber-200">{preferenceError}</p>}
  </section>
}
