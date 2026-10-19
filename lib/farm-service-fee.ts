/**
 * Farm-to-Family takes exactly one service fee from the seller's proceeds on
 * successful completion, never a per-item fee or buyer surcharge.
 * A refund/cancelled trade must not be recognized as earned WEAVE revenue.
 */
export const FARM_TO_FAMILY_SELLER_FEE_NGN = 1000 as const

export function calculateFarmSettlement(buyerTotalNgn:number) {
  if (!Number.isFinite(buyerTotalNgn) || buyerTotalNgn <= FARM_TO_FAMILY_SELLER_FEE_NGN) {
    throw new Error('Farm order must exceed the flat ₦1,000 seller fee')
  }
  const buyerTotal = Math.round(buyerTotalNgn * 100) / 100
  const sellerPayout = Math.round((buyerTotal - FARM_TO_FAMILY_SELLER_FEE_NGN) * 100) / 100
  return {
    buyerTotalNgn: buyerTotal,
    sellerFeeNgn: FARM_TO_FAMILY_SELLER_FEE_NGN,
    sellerPayoutNgn: sellerPayout,
  }
}
