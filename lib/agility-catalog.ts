export const AGILITY_UNIT_PRICE_NGN = 3000
export const AGILITY_PACKAGES_PER_BOX = 10
export const AGILITY_BOX_PRICE_NGN = AGILITY_UNIT_PRICE_NGN * AGILITY_PACKAGES_PER_BOX

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
    note: 'Pear or avocado is added while the package remains the same company price.',
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
    note: 'A meat-based Agility at the same company package price.',
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
    note: 'A fish variation under the same Agility package standard.',
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
    stage: 'Pay',
    detail: 'The Agent chooses Agility boxes and completes the company payment. No fulfillment request opens before payment is verified.',
  },
  {
    stage: 'Heat',
    detail: 'The hot food components are microwaved or reheated. Milk, water and fruit remain separate from hot food.',
  },
  {
    stage: 'Pack',
    detail: 'Each complete Agility meal is sealed as one package: five foods, protein, fruit, water and milk.',
  },
  {
    stage: 'Box',
    detail: `${AGILITY_PACKAGES_PER_BOX} Agility packages are arranged into one company delivery box.`,
  },
  {
    stage: 'Deliver',
    detail: 'Paid boxes are dispatched to the Agent Store. The Agent confirms receipt before the stock becomes sellable.',
  },
  {
    stage: 'Sell',
    detail: `The Agent records consumer sales at ₦${AGILITY_UNIT_PRICE_NGN.toLocaleString()} per Agility package.`,
  },
] as const
