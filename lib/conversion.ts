/**
 * Compatibility conversion helpers for NGN -> Weave Flame Coin.
 * Flame Coin is pegged 1:1 to TRX, so its NGN value follows TRX/NGN.
 */
import { ngnToFlameCoin } from './flame-coin'
import { WORLD_RULES } from './world/constants'

export function convertNgnToFlameCoin(
  ngnAmount: number,
  rateNgnPerTrx = WORLD_RULES.TRX_PAYMENT_NGN_FALLBACK_RATE
): number {
  return ngnToFlameCoin(ngnAmount, rateNgnPerTrx)
}

export function getExchangeRateInfo() {
  const rate = WORLD_RULES.TRX_PAYMENT_NGN_FALLBACK_RATE
  return {
    rate,
    inverse: 1 / rate,
    source: 'Configured TRX/NGN Reference Rate',
    currency: 'NGN',
    target: 'Flame Coin',
    peg: '1 Flame Coin = 1 TRX',
  }
}
