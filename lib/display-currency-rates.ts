import { type UserDisplayCurrency } from '@/lib/user-display-currency'

export type DisplayCurrencyRate = {
  base:'USD'
  currency:UserDisplayCurrency
  rate:number
  updatedAt:string
  source:'exchange_rate_api_open'
}

/**
 * Reference FX conversion for displaying existing USD estimates.
 * Not a checkout quote; do not use these daily midpoint rates to fund wallets.
 */
export async function getDisplayCurrencyRate(
  currency:UserDisplayCurrency,
):Promise<DisplayCurrencyRate|null>{
  if(currency==='USD') return {
    base:'USD',currency,rate:1,updatedAt:new Date().toISOString(),
    source:'exchange_rate_api_open',
  }
  try {
    const response=await fetch('https://open.er-api.com/v6/latest/USD',{
      next:{revalidate:3600*12},signal:AbortSignal.timeout(4500),
    })
    if(!response.ok) return null
    const data=await response.json()
    if(data?.result!=='success' || data?.base_code!=='USD') return null
    const rate=Number(data?.rates?.[currency])
    const updated=Number(data?.time_last_update_unix)
    const age=Date.now()-updated*1000
    if(!Number.isFinite(rate)||rate<=0||rate>10_000_000||
       !Number.isFinite(updated)||updated<=0||age< -3600_000||age>72*3600_000) return null
    return {
      base:'USD',currency,rate,updatedAt:new Date(updated*1000).toISOString(),
      source:'exchange_rate_api_open',
    }
  }catch{return null}
}
