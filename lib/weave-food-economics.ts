import {
  AGILITY_AGENT_UNIT_COST_NGN,
  AGILITY_PACKAGES_PER_BOX,
  AGILITY_RETAIL_UNIT_PRICE_NGN,
} from '@/lib/agility-catalog'
import { getWeaveFoodVariant } from '@/lib/weave-food-catalog'
import { FOOD_ADMIN_PER_PACKAGE_NGN,FOOD_FAMILY_SUPPORT_PER_PACKAGE_NGN,FOOD_AGENT_MARGIN_PER_PACKAGE_NGN } from '@/lib/food-forensic-settlement'

export type WeaveFoodVariantEconomics = {
  variantId: string
  packagesPerBox: number
  agentBuyUnitPriceNgn: number
  agentSellingUnitPriceNgn: number
  agentBoxPriceNgn: number
  retailBoxValueNgn: number
  agentGrossProfitPerPackageNgn: number
  agentGrossProfitPerBoxNgn: number
  customerPriceLocked: boolean
}

export const WEAVE_FOOD_MIN_CARTON_ORDER = 0.5
export const WEAVE_FOOD_MAX_CARTON_ORDER = 50
export const WEAVE_FOOD_CARTON_STEP = 0.5

export function isValidWeaveFoodCartonQuantity(cartonCount: number) {
  return (
    Number.isFinite(cartonCount) &&
    cartonCount >= WEAVE_FOOD_MIN_CARTON_ORDER &&
    cartonCount <= WEAVE_FOOD_MAX_CARTON_ORDER &&
    Number.isInteger(cartonCount / WEAVE_FOOD_CARTON_STEP)
  )
}

export function formatWeaveFoodCartonQuantity(cartonCount: number) {
  return cartonCount === 0.5 ? 'half carton' : `${cartonCount} carton${cartonCount === 1 ? '' : 's'}`
}

export function getWeaveFoodVariantEconomics(variantId: string): WeaveFoodVariantEconomics | null {
  const variant = getWeaveFoodVariant(variantId)
  if (!variant) return null

  const packagesPerBox = Number(variant.packagesPerBox || AGILITY_PACKAGES_PER_BOX)
  const agentBuyUnitPriceNgn = Number(variant.agentBuyUnitPriceNgn ?? AGILITY_AGENT_UNIT_COST_NGN)
  const agentSellingUnitPriceNgn = Number(variant.agentSellingUnitPriceNgn ?? AGILITY_RETAIL_UNIT_PRICE_NGN)
  const agentBoxPriceNgn = packagesPerBox * agentBuyUnitPriceNgn
  const retailBoxValueNgn = packagesPerBox * agentSellingUnitPriceNgn

  return {
    variantId: variant.id,
    packagesPerBox,
    agentBuyUnitPriceNgn,
    agentSellingUnitPriceNgn,
    agentBoxPriceNgn,
    retailBoxValueNgn,
    agentGrossProfitPerPackageNgn: agentSellingUnitPriceNgn - agentBuyUnitPriceNgn,
    agentGrossProfitPerBoxNgn: retailBoxValueNgn - agentBoxPriceNgn,
    customerPriceLocked: true, // Every food variant uses its own published customer price.
  }
}

export function getWeaveFoodStockTotals(variantId: string, boxCount: number) {
  const economics = getWeaveFoodVariantEconomics(variantId)
  if (!economics || !isValidWeaveFoodCartonQuantity(boxCount)) return null

  const packageCount = boxCount * economics.packagesPerBox
  if (!Number.isInteger(packageCount)) return null

  const agentPayableNgn = boxCount * economics.agentBoxPriceNgn
  const retailValueNgn = boxCount * economics.retailBoxValueNgn
  const agentExpectedGrossProfitNgn = boxCount * economics.agentGrossProfitPerBoxNgn
  // Agent buys stock at WEAVE OPay cost, then earns ₦1,000 gross margin per
  // later customer package from the stock at their permanent Carrier Door.
  if(agentExpectedGrossProfitNgn!==FOOD_AGENT_MARGIN_PER_PACKAGE_NGN*packageCount)return null
  const administrationNgn=FOOD_ADMIN_PER_PACKAGE_NGN*packageCount
  const familySupportNgn=FOOD_FAMILY_SUPPORT_PER_PACKAGE_NGN*packageCount
  const leadPreparationNgn=agentPayableNgn-administrationNgn-familySupportNgn
  if(leadPreparationNgn<=0)return null

  return {
    ...economics,
    boxCount,
    packageCount,
    agentPayableNgn,
    retailValueNgn,
    agentExpectedGrossProfitNgn,
    administrationNgn,familySupportNgn,leadPreparationNgn,
    paymentDistributionStatus:'pending_opay_verification_and_forensics',
  }
}
