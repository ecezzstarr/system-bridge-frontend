import { sql } from '@/lib/db'
import { AGILITY_PRICE_CEILING_NGN, AGILITY_VARIANTS } from '@/lib/agility-catalog'

export { AGILITY_PRICE_CEILING_NGN, AGILITY_VARIANTS } from '@/lib/agility-catalog'

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
