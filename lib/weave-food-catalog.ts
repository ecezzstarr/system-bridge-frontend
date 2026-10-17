import { AGILITY_VARIANTS } from '@/lib/agility-catalog'
import { ELECTROLYTE_VARIANTS, isElectrolyteVariant } from '@/lib/electrolyte-catalog'
import type { WeaveFoodVariant } from '@/lib/weave-food-types'

export const WEAVE_FOOD_VARIANTS: WeaveFoodVariant[] = [
  ...AGILITY_VARIANTS,
  ...ELECTROLYTE_VARIANTS,
]

export function getWeaveFoodVariant(id: string) {
  return WEAVE_FOOD_VARIANTS.find((variant) => variant.id === id) || null
}

export function getWeaveFoodHomePath(id: string) {
  return isElectrolyteVariant(id) ? '/electrolyte' : '/agility'
}

export function getWeaveFoodAdministrationPath(id: string) {
  return isElectrolyteVariant(id) ? '/admin/electrolyte' : '/admin/agility'
}

export { isElectrolyteVariant }
