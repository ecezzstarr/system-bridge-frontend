import { sql } from '@/lib/db'

export const AGILITY_PRICE_CEILING_NGN = 3000

export type AgilityVariant = {
  id: string
  name: string
  priceNgn: number
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
    priceNgn: 2950,
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
    priceNgn: 2900,
    accent: 'Creamy + filling',
    foods: ['Bread', 'Pear / avocado', 'Butter', 'Fried egg', 'Akara'],
    protein: 'Sardines',
    fruit: 'Apple',
    drink: 'Milk',
    water: 'Water',
    note: 'Pear and butter join the morning package.',
  },
  {
    id: 'meat',
    name: 'Agility Meat',
    priceNgn: 2990,
    accent: 'Protein morning',
    foods: ['Fried egg', 'Bread', 'Butter', 'Akara', 'Pap'],
    protein: 'Prepared meat',
    fruit: 'Apple',
    drink: 'Milk',
    water: 'Water',
    note: 'A meat-based Agility while remaining below the price ceiling.',
  },
  {
    id: 'fish',
    name: 'Agility Fish',
    priceNgn: 2850,
    accent: 'Fish morning',
    foods: ['Fried egg', 'Bread', 'Butter', 'Akara', 'Pap'],
    protein: 'Prepared fish',
    fruit: 'Seasonal fruit',
    drink: 'Milk',
    water: 'Water',
    note: 'A fish variation using the same complete-package rule.',
  },
]

export const AGILITY_PROCESS = [
  {
    stage: 'Heat',
    detail: 'Hot food components are microwaved or reheated before packing. Fruit, water and milk remain separate from the hot components.',
  },
  {
    stage: 'Pack',
    detail: 'The morning food set, protein, fruit, water and drink are placed into the Agility package.',
  },
  {
    stage: 'Box',
    detail: 'The sealed package is placed inside the Agility box for movement through Weave.',
  },
  {
    stage: 'Deliver',
    detail: 'Boxes are delivered to users with Agent accounts to sell to consumers.',
  },
] as const

export async function ensureAgilitySchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS agility_stock_requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id uuid NOT NULL,
      variant_id varchar(80) NOT NULL,
      quantity integer NOT NULL,
      unit_price_ngn numeric(14,2) NOT NULL,
      total_ngn numeric(14,2) NOT NULL,
      status varchar(40) NOT NULL DEFAULT 'requested',
      agent_note text,
      admin_note text,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_agility_stock_agent ON agility_stock_requests(agent_id, created_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_agility_stock_status ON agility_stock_requests(status, created_at DESC)`
}

export function getAgilityVariant(id: string) {
  return AGILITY_VARIANTS.find((variant) => variant.id === id) || null
}

export function isAgilityStatus(value: string) {
  return ['requested', 'approved', 'preparing', 'dispatched', 'delivered', 'cancelled'].includes(value)
}
