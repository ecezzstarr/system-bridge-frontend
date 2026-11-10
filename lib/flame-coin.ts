/**
 * System Switch is WEAVE's public name for its existing internal balance unit.
 * This is not a blockchain token or a registered cryptocurrency.
 * The internal accounting identifier and 1-TRX unit reference remain unchanged.
 * Keep legacy database names until a separately reviewed migration.
 */
export const SYSTEM_SWITCH_NAME = 'System Switch'
/** @deprecated Historical identifier; display System Switch instead. */
export const FLAME_COIN_NAME = SYSTEM_SWITCH_NAME
export const FLAME_COIN_CODE = 'FLAME_COIN'
/** Persisted wallet/ledger code is unchanged for backwards compatibility. */
export const SYSTEM_SWITCH_ACCOUNTING_CODE = FLAME_COIN_CODE

/** Map old receipt and ledger labels only at presentation time. */
export function displayCurrencyName(value: string | null | undefined): string {
  const code = String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_')
  return ['FLAME_COIN', 'FLAMECOIN', 'SYSTEM_SWITCH'].includes(code) ? SYSTEM_SWITCH_NAME : String(value || '')
}

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

export function formatSystemSwitch(amount: number): string {
  return Number(amount || 0).toLocaleString() + ' ' + SYSTEM_SWITCH_NAME
}
/** @deprecated Existing callers continue to work. */
export const formatFlameCoin = formatSystemSwitch
