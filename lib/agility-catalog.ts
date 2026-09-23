import { WEAVE_OPAY_ACCOUNT_NUMBER } from '@/lib/opay-config'

export const AGILITY_RETAIL_UNIT_PRICE_NGN = 3000
export const AGILITY_PACKAGES_PER_BOX = 10
export const AGILITY_RETAIL_BOX_VALUE_NGN = AGILITY_RETAIL_UNIT_PRICE_NGN * AGILITY_PACKAGES_PER_BOX

// Agent wholesale economics.
// The Agent pays ₦24,000 for 10 packages, giving a ₦600 gross spread per package
// when every package is sold to consumers at the fixed ₦3,000 retail price.
export const AGILITY_AGENT_BOX_PRICE_NGN = 24000
export const AGILITY_AGENT_UNIT_COST_NGN = AGILITY_AGENT_BOX_PRICE_NGN / AGILITY_PACKAGES_PER_BOX
export const AGILITY_AGENT_GROSS_PROFIT_PER_PACKAGE_NGN =
  AGILITY_RETAIL_UNIT_PRICE_NGN - AGILITY_AGENT_UNIT_COST_NGN
export const AGILITY_AGENT_GROSS_PROFIT_PER_BOX_NGN =
  AGILITY_RETAIL_BOX_VALUE_NGN - AGILITY_AGENT_BOX_PRICE_NGN

// Company production discipline.
// Before preparation starts, Administration must record a planned all-in cost
// (food + preparation + packaging + delivery) at or below this ceiling.
// At the ceiling the company retains ₦3,000 gross contribution per box.
export const AGILITY_COMPANY_COST_CEILING_PER_BOX_NGN = 21000
export const AGILITY_COMPANY_TARGET_GROSS_PROFIT_PER_BOX_NGN =
  AGILITY_AGENT_BOX_PRICE_NGN - AGILITY_COMPANY_COST_CEILING_PER_BOX_NGN

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
    detail: `Before heating begins, the all-in planned company cost must be at or below ₦${AGILITY_COMPANY_COST_CEILING_PER_BOX_NGN.toLocaleString()} per box so the company retains a positive gross contribution.`,
  },
  {
    stage: 'Pack',
    detail: `${AGILITY_PACKAGES_PER_BOX} complete morning packages are sealed and placed into one Agility company box, then dispatched to the Agent Store.`,
  },
  {
    stage: 'Sell',
    detail: `After the Agent confirms receipt, each Agility package is sold to consumers at ₦${AGILITY_RETAIL_UNIT_PRICE_NGN.toLocaleString()}.`,
  },
] as const
