import { WORLD_RULES } from './world/constants'
import { trxToFlameCoin, flameCoinToTrx } from './flame-coin'

export type TrxPaymentRate = {
  rateNgnPerTrx: number
  source: 'live' | 'fallback'
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

export function trxPaymentToFlameCoin(trxAmount: number): number {
  return trxToFlameCoin(trxAmount)
}

export function flameCoinToRequiredTrx(flameCoinAmount: number): number {
  return flameCoinToTrx(flameCoinAmount)
}
