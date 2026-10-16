import { WEAVE_OPAY_ACCOUNT_NUMBER } from '@/lib/opay-config'

export const AGILITY_RETAIL_UNIT_PRICE_NGN = 3000
export const AGILITY_PACKAGES_PER_BOX = 10
export const AGILITY_RETAIL_BOX_VALUE_NGN = AGILITY_RETAIL_UNIT_PRICE_NGN * AGILITY_PACKAGES_PER_BOX
export const AGILITY_WHOLESALE_BOX_SELL_PRICE_NGN = AGILITY_RETAIL_BOX_VALUE_NGN

// Agility Agent economics remain unchanged.
export const AGILITY_AGENT_BOX_PRICE_NGN = 28000
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
  packagesPerBox?: number
  agentBuyUnitPriceNgn?: number
  agentSellingUnitPriceNgn?: number
  customerPriceLocked?: boolean
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
    note: 'Pear or avocado is added while the package remains under the same Agility company standard.',
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
    note: 'A meat-based Agility under the same Agility carton economics.',
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
  {
    id: 'electrolyte',
    name: 'Electrolyte · Small Bowl',
    accent: 'Small fresh sliced bowl',
    foods: ['Cucumber', 'Fresh coconut pieces', 'Carrot strips', 'Sweet corn', 'Fresh greens'],
    protein: 'Seasoned beef + fried fish + boiled egg',
    fruit: 'Avocado',
    drink: 'Fresh coconut water',
    water: 'Water',
    packagesPerBox: 10,
    agentBuyUnitPriceNgn: 3000,
    agentSellingUnitPriceNgn: 4000,
    customerPriceLocked: true,
    note: 'Small Electrolyte bowl. Agent buys from WEAVE at ₦3,000 per bowl and sells to the customer at ₦4,000.',
  },
  {
    id: 'electrolyte-medium',
    name: 'Electrolyte · Medium Bowl',
    accent: 'Medium fresh sliced bowl',
    foods: ['Cucumber', 'Fresh coconut pieces', 'Carrot strips', 'Sweet corn', 'Fresh greens'],
    protein: 'Seasoned beef + fried fish + boiled egg',
    fruit: 'Avocado',
    drink: 'Fresh coconut water',
    water: 'Water',
    packagesPerBox: 10,
    agentBuyUnitPriceNgn: 5000,
    agentSellingUnitPriceNgn: 6000,
    customerPriceLocked: true,
    note: 'Medium Electrolyte bowl. Agent buys from WEAVE at ₦5,000 per bowl and sells to the customer at ₦6,000.',
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
    detail: `The Agent orders approved WEAVE food cartons. Agility keeps its ₦${AGILITY_AGENT_BOX_PRICE_NGN.toLocaleString()} carton standard; other WEAVE foods can carry their own carton economics.`,
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
    detail: 'Complete food packages are sealed, boxed, dispatched and received by the Agent before they can be distributed.',
  },
  {
    stage: 'Sell',
    detail: 'The Agent moves paid WEAVE stock through local outlets and Carrier. Product selling economics are captured on each stock order.',
  },
] as const
