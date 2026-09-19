/**
 * Conversion utility for NGN (Naira) to TRX (TRON)
 * Used for OPay deposits by Administration, Agents, and Bridgers.
 */

// Default exchange rate: 1600 NGN = 10 TRX (Approximate)
// This should ideally be fetched from an external API or env variable
const DEFAULT_NGN_TO_TRX_RATE = parseFloat(process.env.NGN_TO_TRX_RATE || '0.00625')

/**
 * Converts NGN amount to TRX
 */
export function convertNgnToTrx(ngnAmount: number): number {
  return ngnAmount * DEFAULT_NGN_TO_TRX_RATE
}

/**
 * Gets current exchange rate info
 */
export function getExchangeRateInfo() {
  return {
    rate: DEFAULT_NGN_TO_TRX_RATE,
    inverse: 1 / DEFAULT_NGN_TO_TRX_RATE,
    source: 'Platform Configured Rate',
    currency: 'NGN',
    target: 'TRX'
  }
}
