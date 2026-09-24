import { WORLD_RULES } from './world/constants'

export const PLATFORM_FEE_PERCENT = WORLD_RULES.PLATFORM_FEE_PERCENT

const FALLBACK_TRX_NGN_RATE = WORLD_RULES.TRX_PAYMENT_NGN_FALLBACK_RATE

export async function getTrxNgnRate(): Promise<{ rate: number; source: 'live' | 'fallback' }> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=ngn',
      { next: { revalidate: 60 } }
    )
    if (!res.ok) throw new Error('CoinGecko responded ' + res.status)
    const data = await res.json()
    const rate = data?.tron?.ngn
    if (!rate || typeof rate !== 'number' || rate <= 0) throw new Error('Invalid rate in response')
    return { rate, source: 'live' }
  } catch (err) {
    console.error('Failed to fetch live TRX/NGN rate, using fallback:', err)
    return { rate: FALLBACK_TRX_NGN_RATE, source: 'fallback' }
  }
}

export function ngnToTrx(amountNgn: number, rate: number): number {
  const grossTrx = amountNgn / rate
  return Math.round(grossTrx * 1000000) / 1000000
}

export function trxToNgn(amountTrx: number, rate: number): number {
  const grossNgn = amountTrx * rate
  const netNgn = grossNgn * (1 - PLATFORM_FEE_PERCENT / 100)
  return Math.round(netNgn * 100) / 100
}
