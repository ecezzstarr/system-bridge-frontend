import {
  AGILITY_AGENT_UNIT_COST_NGN,
  AGILITY_PACKAGES_PER_BOX,
  AGILITY_RETAIL_UNIT_PRICE_NGN,
  AGILITY_VARIANTS,
} from '@/lib/agility-catalog'

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

export function getWeaveFoodVariantEconomics(variantId: string): WeaveFoodVariantEconomics | null {
  const variant = AGILITY_VARIANTS.find(item => item.id === variantId)
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
    customerPriceLocked: Boolean(variant.customerPriceLocked),
  }
}

export function getWeaveFoodStockTotals(variantId: string, boxCount: number) {
  const economics = getWeaveFoodVariantEconomics(variantId)
  if (!economics) return null

  const packageCount = boxCount * economics.packagesPerBox
  const agentPayableNgn = boxCount * economics.agentBoxPriceNgn
  const retailValueNgn = boxCount * economics.retailBoxValueNgn
  const agentExpectedGrossProfitNgn = boxCount * economics.agentGrossProfitPerBoxNgn

  return {
    ...economics,
    boxCount,
    packageCount,
    agentPayableNgn,
    retailValueNgn,
    agentExpectedGrossProfitNgn,
  }
}
