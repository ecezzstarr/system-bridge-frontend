import { WEAVE_OPAY_ACCOUNT_NUMBER } from '@/lib/opay-config'

export const AGILITY_RETAIL_UNIT_PRICE_NGN = 3000
export const AGILITY_PACKAGES_PER_BOX = 10
export const AGILITY_RETAIL_BOX_VALUE_NGN = AGILITY_RETAIL_UNIT_PRICE_NGN * AGILITY_PACKAGES_PER_BOX
export const AGILITY_WHOLESALE_BOX_SELL_PRICE_NGN = AGILITY_RETAIL_BOX_VALUE_NGN

// Agent economics.
// WEAVE sells one 10-package box to an Agent for ₦28,000.
// A wholesaler resells the full box for ₦30,000.
// A retailer sells the 10 individual packages at ₦3,000 each.
// Either route produces a ₦2,000 gross spread per completed box before the Agent's own expenses.
export const AGILITY_AGENT_BOX_PRICE_NGN = 28000
export const AGILITY_AGENT_UNIT_COST_NGN = AGILITY_AGENT_BOX_PRICE_NGN / AGILITY_PACKAGES_PER_BOX
export const AGILITY_AGENT_GROSS_PROFIT_PER_PACKAGE_NGN =
  AGILITY_RETAIL_UNIT_PRICE_NGN - AGILITY_AGENT_UNIT_COST_NGN
export const AGILITY_AGENT_GROSS_PROFIT_PER_BOX_NGN =
  AGILITY_RETAIL_BOX_VALUE_NGN - AGILITY_AGENT_BOX_PRICE_NGN

// Company economics.
// Standard preparation cost is ₦21,000 per box.
// WEAVE sells that box to the Agent for ₦28,000, giving the company a ₦7,000
// gross profit per box before broader company overhead.
export const AGILITY_COMPANY_STANDARD_PREPARATION_COST_PER_BOX_NGN = 21000
export const AGILITY_COMPANY_COST_CEILING_PER_BOX_NGN =
  AGILITY_COMPANY_STANDARD_PREPARATION_COST_PER_BOX_NGN
export const AGILITY_COMPANY_TARGET_GROSS_PROFIT_PER_BOX_NGN =
  AGILITY_AGENT_BOX_PRICE_NGN - AGILITY_COMPANY_STANDARD_PREPARATION_COST_PER_BOX_NGN

export const AGILITY_OPAY_ACCOUNT_NUMBER = WEAVE_OPAY_ACCOUNT_NUMBER

export type AgilityVariant = {
  id: string
  name: string
  accent: string
  foods: string[]
  protein: string
  fruit: string
  drink: string
  water: string
  note: string
}

export const AGILITY_VARIANTS: AgilityVariant[] = [
  {
    id: 'classic',
    name: 'Agility Classic',
    accent: 'Morning standard',
    foods: ['Fried egg', 'Bread', 'Butter', 'Akara', 'Pap'],
    protein: 'Sardines',
    fruit: 'Apple',
    drink: 'Milk',
    water: 'Water',
    note: 'The original Agility morning combination.',
  },
  {
    id: 'pear',
    name: 'Agility Pear',
    accent: 'Pear + butter',
    foods: ['Fried egg', 'Bread', 'Butter', 'Akara', 'Pap'],
    protein: 'Sardines',
    fruit: 'Pear / avocado',
    drink: 'Milk',
    water: 'Water',
    note: 'Pear or avocado is added while the package remains under the same company retail standard.',
  },
  {
    id: 'meat',
    name: 'Agility Meat',
    accent: 'Meat morning',
    foods: ['Fried egg', 'Bread', 'Butter', 'Akara', 'Pap'],
    protein: 'Prepared meat',
    fruit: 'Apple',
    drink: 'Milk',
    water: 'Water',
    note: 'A meat-based Agility using the same retail and Agent-box economics.',
  },
  {
    id: 'fish',
    name: 'Agility Fish',
    accent: 'Fish morning',
    foods: ['Fried egg', 'Bread', 'Butter', 'Akara', 'Pap'],
    protein: 'Prepared fish',
    fruit: 'Seasonal fruit',
    drink: 'Milk',
    water: 'Water',
    note: 'A fish variation under the same Agility company standard.',
  },
]

export const AGILITY_FULFILLMENT_STAGES = [
  'paid',
  'heating',
  'packed',
  'boxed',
  'dispatched',
  'delivered',
  'received',
] as const

export type AgilityFulfillmentStage = (typeof AGILITY_FULFILLMENT_STAGES)[number]

export const AGILITY_PROCESS = [
  {
    stage: 'Order',
    detail: `The Agent orders company boxes at ₦${AGILITY_AGENT_BOX_PRICE_NGN.toLocaleString()} each. Every box contains ${AGILITY_PACKAGES_PER_BOX} complete Agility packages.`,
  },
  {
    stage: 'OPay',
    detail: `The Agent sends the exact NGN amount to the existing Weave OPay account ${AGILITY_OPAY_ACCOUNT_NUMBER} and submits the transaction reference or receipt.`,
  },
  {
    stage: 'Verify',
    detail: 'Administration verifies the OPay proof. The order does not enter food preparation until payment is approved.',
  },
  {
    stage: 'Prepare',
    detail: `The company standard preparation cost is ₦${AGILITY_COMPANY_STANDARD_PREPARATION_COST_PER_BOX_NGN.toLocaleString()} per box. At the ₦${AGILITY_AGENT_BOX_PRICE_NGN.toLocaleString()} Agent price, WEAVE targets ₦${AGILITY_COMPANY_TARGET_GROSS_PROFIT_PER_BOX_NGN.toLocaleString()} gross profit per box.`,
  },
  {
    stage: 'Pack',
    detail: `${AGILITY_PACKAGES_PER_BOX} complete morning packages are sealed and placed into one Agility company box, then dispatched to the Agent Store.`,
  },
  {
    stage: 'Sell',
    detail: `A wholesaler can move the full box at ₦${AGILITY_WHOLESALE_BOX_SELL_PRICE_NGN.toLocaleString()}, while a retailer sells the individual packages at ₦${AGILITY_RETAIL_UNIT_PRICE_NGN.toLocaleString()} each and builds direct consumer patronage.`,
  },
] as const
