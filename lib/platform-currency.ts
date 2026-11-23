/**
 * WEAVE's target reporting and future settlement currency is United States dollars.
 * Historical System Switch balances are TRX-referenced internal units, NOT USD.
 * Never relabel their stored numbers or imply an available USD cash balance.
 */
export const PLATFORM_CURRENCY_CODE = 'USD' as const

export type LegacyUsdRate = {
  usdPerSystemSwitch: number
  checkedAt: string
  source: 'coingecko_trx_usd'
}

/** Presentation-only conversion. No wallet, ledger or receipt is mutated. */
export function legacyUnitsToUsd(units: number, usdPerSystemSwitch: number): number | null {
  if (!Number.isFinite(units) || !Number.isFinite(usdPerSystemSwitch) ||
      usdPerSystemSwitch <= 0 || usdPerSystemSwitch > 1_000_000 ||
      Math.abs(units) > 1_000_000_000_000) return null
  const converted = units * usdPerSystemSwitch
  if (!Number.isSafeInteger(Math.round(converted * 100))) return null
  return Math.round(converted * 100) / 100
}

/**
 * Only a currently obtainable quote can value a legacy wallet in USD.
 * Do not use a static peg, an NGN fallback or a failed price lookup as a quote.
 * TRX is an external reference, NOT the same asset as USD.
 */
export async function getLegacyUsdRate(): Promise<LegacyUsdRate | null> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd',
      { next: { revalidate: 60 }, signal: AbortSignal.timeout(3500) },
    )
    if (!response.ok) return null
    const data = await response.json()
    const rate = Number(data?.tron?.usd)
    if (!Number.isFinite(rate) || rate <= 0 || rate > 1_000_000) return null
    return {
      usdPerSystemSwitch: rate,
      checkedAt: new Date().toISOString(),
      source: 'coingecko_trx_usd',
    }
  } catch {
    return null
  }
}
