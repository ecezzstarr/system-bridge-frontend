import { WORLD_RULES } from './world/constants'
import { trxToFlameCoin, flameCoinToTrx } from './flame-coin'

export type TrxPaymentRate = {
  rateNgnPerTrx: number
  source: 'live' | 'fallback'
}

export type TrxGbpRate = {
  rateGbpPerTrx: number | null
  source: 'live' | 'unavailable'
}

export async function getTrxPaymentNgnRate(): Promise<TrxPaymentRate> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=ngn',
      { next: { revalidate: 60 } }
    )
    if (!response.ok) throw new Error(`TRX rate provider responded ${response.status}`)
    const data = await response.json()
    const rate = Number(data?.tron?.ngn)
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('Invalid TRX/NGN rate')
    return { rateNgnPerTrx: rate, source: 'live' }
  } catch (error) {
    console.error('[trx-payment] live rate unavailable, using configured fallback', error)
    return {
      rateNgnPerTrx: WORLD_RULES.TRX_PAYMENT_NGN_FALLBACK_RATE,
      source: 'fallback',
    }
  }
}

export async function getTrxGbpRate(): Promise<TrxGbpRate> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=gbp',
      { next: { revalidate: 60 } }
    )
    if (!response.ok) throw new Error(`TRX/GBP rate provider responded ${response.status}`)
    const data = await response.json()
    const rate = Number(data?.tron?.gbp)
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('Invalid TRX/GBP rate')
    return { rateGbpPerTrx: rate, source: 'live' }
  } catch (error) {
    console.error('[trx-payment] live TRX/GBP rate unavailable', error)
    return { rateGbpPerTrx: null, source: 'unavailable' }
  }
}

export function gbpToFlameCoin(gbpAmount: number, rateGbpPerTrx: number): number {
  if (!Number.isFinite(gbpAmount) || gbpAmount < 0) return 0
  if (!Number.isFinite(rateGbpPerTrx) || rateGbpPerTrx <= 0) return 0
  return Math.round((gbpAmount / rateGbpPerTrx) * 100) / 100
}

export function trxPaymentToFlameCoin(trxAmount: number): number {
  return trxToFlameCoin(trxAmount)
}

export function flameCoinToRequiredTrx(flameCoinAmount: number): number {
  return flameCoinToTrx(flameCoinAmount)
}
