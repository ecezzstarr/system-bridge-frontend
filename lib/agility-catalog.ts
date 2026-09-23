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
