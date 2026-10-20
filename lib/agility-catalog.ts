import { WEAVE_OPAY_ACCOUNT_NUMBER } from '@/lib/opay-config'
import type { WeaveFoodVariant } from '@/lib/weave-food-types'
import { EMBER_VARIANTS } from '@/lib/ember-catalog'
import { ELECTROLYTE_VARIANTS } from '@/lib/electrolyte-catalog'

export const AGILITY_RETAIL_UNIT_PRICE_NGN = 4000
export const AGILITY_PACKAGES_PER_BOX = 10
export const AGILITY_RETAIL_BOX_VALUE_NGN = AGILITY_RETAIL_UNIT_PRICE_NGN * AGILITY_PACKAGES_PER_BOX
export const AGILITY_WHOLESALE_BOX_SELL_PRICE_NGN = AGILITY_RETAIL_BOX_VALUE_NGN

// ₦4,000 customer sale: ₦3,000 WEAVE production share and ₦1,000 Agent earnings.
// Ten units in a carton: ₦10,000 Agent margin; five units: ₦5,000 margin.
export const AGILITY_AGENT_BOX_PRICE_NGN = 30000
export const AGILITY_AGENT_UNIT_COST_NGN = AGILITY_AGENT_BOX_PRICE_NGN / AGILITY_PACKAGES_PER_BOX
export const AGILITY_AGENT_GROSS_PROFIT_PER_PACKAGE_NGN =
  AGILITY_RETAIL_UNIT_PRICE_NGN - AGILITY_AGENT_UNIT_COST_NGN
export const AGILITY_AGENT_GROSS_PROFIT_PER_BOX_NGN =
  AGILITY_RETAIL_BOX_VALUE_NGN - AGILITY_AGENT_BOX_PRICE_NGN

// Company preparation standard currently used by the Agility fulfillment desk.
export const AGILITY_COMPANY_STANDARD_PREPARATION_COST_PER_BOX_NGN = 21000
export const AGILITY_COMPANY_COST_CEILING_PER_BOX_NGN =
  AGILITY_COMPANY_STANDARD_PREPARATION_COST_PER_BOX_NGN
export const AGILITY_COMPANY_TARGET_GROSS_PROFIT_PER_BOX_NGN =
  AGILITY_AGENT_BOX_PRICE_NGN - AGILITY_COMPANY_STANDARD_PREPARATION_COST_PER_BOX_NGN

export const AGILITY_OPAY_ACCOUNT_NUMBER = WEAVE_OPAY_ACCOUNT_NUMBER

// Compatibility alias for existing Agility-only UI imports.
export type AgilityVariant = WeaveFoodVariant

export const AGILITY_PRODUCT_VARIANTS: AgilityVariant[] = [
  {
    id: 'classic',
    name: 'Agility Classic',
    accent: 'Morning standard',
    family: 'agility',
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
    family: 'agility',
    foods: ['Fried egg', 'Bread', 'Butter', 'Akara', 'Pap'],
    protein: 'Sardines',
    fruit: 'Pear / avocado',
    drink: 'Milk',
    water: 'Water',
    note: 'Pear or avocado is added while the package remains under the same Agility company standard.',
  },
  {
    id: 'meat',
    name: 'Agility Meat',
    accent: 'Meat morning',
    family: 'agility',
    foods: ['Fried egg', 'Bread', 'Butter', 'Akara', 'Pap'],
    protein: 'Prepared meat',
    fruit: 'Apple',
    drink: 'Milk',
    water: 'Water',
    note: 'A meat-based Agility under the same Agility company standard.',
  },
  {
    id: 'fish',
    name: 'Agility Fish',
    accent: 'Fish morning',
    family: 'agility',
    foods: ['Fried egg', 'Bread', 'Butter', 'Akara', 'Pap'],
    protein: 'Prepared fish',
    fruit: 'Seasonal fruit',
    drink: 'Milk',
    water: 'Water',
    note: 'A fish variation under the same Agility company standard.',
  },
]

/**
 * Legacy all-WEAVE-food alias. Electrolyte is defined and operated in its own
 * catalog/home/API; this export remains only so older shared Carrier and
 * Distribution surfaces keep seeing all stock until those callers migrate.
 */
export const AGILITY_VARIANTS: AgilityVariant[] = [
  ...AGILITY_PRODUCT_VARIANTS,
  ...ELECTROLYTE_VARIANTS,
  ...EMBER_VARIANTS,
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
    detail: `The Agent orders Agility cartons from WEAVE at the ₦${AGILITY_AGENT_BOX_PRICE_NGN.toLocaleString()} carton standard.`,
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
    detail: `The Agility company preparation standard remains ₦${AGILITY_COMPANY_STANDARD_PREPARATION_COST_PER_BOX_NGN.toLocaleString()} per box.`,
  },
  {
    stage: 'Pack',
    detail: 'Complete Agility packages are sealed, boxed, dispatched and received by the Agent before they can be distributed.',
  },
  {
    stage: 'Sell',
    detail: 'The Agent moves paid Agility stock through local outlets and Carrier.',
  },
] as const
