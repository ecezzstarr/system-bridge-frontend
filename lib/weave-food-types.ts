export type WeaveFoodVariant = {
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
  family: 'agility' | 'electrolyte' | 'ember'
}
