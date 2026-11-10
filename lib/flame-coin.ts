/**
 * WEAVE System Switch
 *
 * System Switch is Weave's internal wrapper for TRX value.
 * 1 System Switch always represents 1 TRX unit of value inside Weave.
 *
 * Users never need System Switch on-chain:
 * - Clients fund with real TRX and receive the same number of System Switchs.
 * - Administration, Agents and Bridgers fund with NGN through OPay; NGN is
 *   converted at the current TRX/NGN price and the matching System Switch amount
 *   is credited after verification.
 */
export const FLAME_COIN_NAME = 'System Switch'
export const FLAME_COIN_CODE = 'FLAME_COIN'

export function trxToFlameCoin(trxAmount: number): number {
  if (!Number.isFinite(trxAmount) || trxAmount < 0) return 0
  return Math.round(trxAmount * 1_000_000) / 1_000_000
}

export function flameCoinToTrx(flameCoinAmount: number): number {
  if (!Number.isFinite(flameCoinAmount) || flameCoinAmount < 0) return 0
  return Math.round(flameCoinAmount * 1_000_000) / 1_000_000
}

export function ngnToFlameCoin(amountNgn: number, rateNgnPerTrx: number): number {
  if (!Number.isFinite(amountNgn) || amountNgn < 0) return 0
  if (!Number.isFinite(rateNgnPerTrx) || rateNgnPerTrx <= 0) return 0
  return Math.round((amountNgn / rateNgnPerTrx) * 1_000_000) / 1_000_000
}

export function flameCoinToNgn(flameCoinAmount: number, rateNgnPerTrx: number): number {
  if (!Number.isFinite(flameCoinAmount) || flameCoinAmount < 0) return 0
  if (!Number.isFinite(rateNgnPerTrx) || rateNgnPerTrx <= 0) return 0
  return Math.round(flameCoinAmount * rateNgnPerTrx * 100) / 100
}

export function formatFlameCoin(amount: number): string {
  return `${Number(amount || 0).toLocaleString()} ${FLAME_COIN_NAME}`
}
