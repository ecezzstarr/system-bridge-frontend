import { WEAVE_OPAY_ACCOUNT_NUMBER } from '@/lib/opay-config'
import type { WeaveFoodVariant } from '@/lib/weave-food-types'

export const ELECTROLYTE_PACKAGES_PER_CARTON = 10
export const ELECTROLYTE_OPAY_ACCOUNT_NUMBER = WEAVE_OPAY_ACCOUNT_NUMBER

export const ELECTROLYTE_VARIANTS: WeaveFoodVariant[] = [
  {
    id: 'electrolyte',
    name: 'Electrolyte · Small Bowl',
    accent: 'Small fresh sliced bowl',
    family: 'electrolyte',
    foods: ['Cucumber', 'Fresh coconut pieces', 'Carrot strips', 'Sweet corn', 'Fresh greens'],
    protein: 'Seasoned beef + fried fish + boiled egg',
    fruit: 'Avocado',
    drink: 'Fresh coconut water',
    water: 'Water',
    packagesPerBox: ELECTROLYTE_PACKAGES_PER_CARTON,
    agentBuyUnitPriceNgn: 3000,
    agentSellingUnitPriceNgn: 4000,
    customerPriceLocked: true,
    note: 'Small Electrolyte bowl. Agent buys from WEAVE at ₦3,000 per bowl and sells to the customer at ₦4,000.',
  },
  {
    id: 'electrolyte-medium',
    name: 'Electrolyte · Medium Bowl',
    accent: 'Medium fresh sliced bowl',
    family: 'electrolyte',
    foods: ['Cucumber', 'Fresh coconut pieces', 'Carrot strips', 'Sweet corn', 'Fresh greens'],
    protein: 'Seasoned beef + fried fish + boiled egg',
    fruit: 'Avocado',
    drink: 'Fresh coconut water',
    water: 'Water',
    packagesPerBox: ELECTROLYTE_PACKAGES_PER_CARTON,
    agentBuyUnitPriceNgn: 5000,
    agentSellingUnitPriceNgn: 6000,
    customerPriceLocked: true,
    note: 'Medium Electrolyte bowl. Agent buys from WEAVE at ₦5,000 per bowl and sells to the customer at ₦6,000.',
  },
]

export const ELECTROLYTE_FULFILLMENT_STAGES = [
  'paid',
  'preparing',
  'packed',
  'dispatched',
  'delivered',
  'received',
] as const

export function getElectrolyteVariant(id: string) {
  return ELECTROLYTE_VARIANTS.find((variant) => variant.id === id) || null
}

export function isElectrolyteVariant(id: string) {
  return Boolean(getElectrolyteVariant(id))
}

export function nextElectrolyteAdminStage(current: string) {
  const sequence = ['paid', 'preparing', 'packed', 'dispatched', 'delivered']
  const index = sequence.indexOf(current)
  return index >= 0 && index < sequence.length - 1 ? sequence[index + 1] : null
}

export const ELECTROLYTE_PROCESS = [
  { stage: 'Choose', detail: 'Choose Small Bowl or Medium Bowl and the carton quantity you want to add to your route.' },
  { stage: 'Order', detail: 'Create a new Electrolyte order even when you still have Electrolyte in inventory. Every paid order is an independent restock movement.' },
  { stage: 'Pay WEAVE', detail: `Send the exact order amount to WEAVE OPay ${ELECTROLYTE_OPAY_ACCOUNT_NUMBER} and submit the transaction reference or receipt.` },
  { stage: 'Administration', detail: 'Administration verifies the Agent payment before fresh preparation begins.' },
  { stage: 'Prepare fresh', detail: 'WEAVE prepares the ordered Small or Medium bowls, seals the order and readies it for dispatch.' },
  { stage: 'Receive', detail: 'Administration dispatches and marks delivery. The Agent confirms physical receipt before the new bowls become distributable inventory.' },
] as const
