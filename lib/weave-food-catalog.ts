import { AGILITY_PRODUCT_VARIANTS } from '@/lib/agility-catalog'
import { ELECTROLYTE_VARIANTS, isElectrolyteVariant } from '@/lib/electrolyte-catalog'
import { EMBER_VARIANTS,isEmberVariant } from '@/lib/ember-catalog'
import type { WeaveFoodVariant } from '@/lib/weave-food-types'

export const WEAVE_FOOD_VARIANTS: WeaveFoodVariant[] = [
  ...AGILITY_PRODUCT_VARIANTS,
  ...ELECTROLYTE_VARIANTS,
  ...EMBER_VARIANTS,
]

export function getWeaveFoodVariant(id: string) {
  return WEAVE_FOOD_VARIANTS.find((variant) => variant.id === id) || null
}

export function getWeaveFoodHomePath(id: string) {
  return isEmberVariant(id)?'/ember':isElectrolyteVariant(id)?'/electrolyte':'/agility'
}

export function getWeaveFoodAdministrationPath(id: string) {
  return isEmberVariant(id)?'/admin/ember':isElectrolyteVariant(id)?'/admin/electrolyte':'/admin/agility'
}

export { isElectrolyteVariant,isEmberVariant }
