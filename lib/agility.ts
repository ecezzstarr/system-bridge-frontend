import { sql } from '@/lib/db'
import {
  AGILITY_BOX_PRICE_NGN,
  AGILITY_FULFILLMENT_STAGES,
  AGILITY_PACKAGES_PER_BOX,
  AGILITY_UNIT_PRICE_NGN,
  AGILITY_VARIANTS,
} from '@/lib/agility-catalog'

export {
  AGILITY_BOX_PRICE_NGN,
  AGILITY_FULFILLMENT_STAGES,
  AGILITY_PACKAGES_PER_BOX,
  AGILITY_UNIT_PRICE_NGN,
  AGILITY_VARIANTS,
} from '@/lib/agility-catalog'

export async function ensureAgilitySchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS agility_stock_orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id uuid NOT NULL,
      variant_id varchar(80) NOT NULL,
      box_count integer NOT NULL,
      packages_per_box integer NOT NULL,
      package_count integer NOT NULL,
      unit_price_ngn numeric(14,2) NOT NULL,
      box_price_ngn numeric(14,2) NOT NULL,
      total_ngn numeric(14,2) NOT NULL,
      payment_reference varchar(255) UNIQUE NOT NULL,
      payment_link text,
      flutterwave_transaction_id varchar(120),
      payment_status varchar(40) NOT NULL DEFAULT 'pending',
      fulfillment_status varchar(40) NOT NULL DEFAULT 'awaiting_payment',
      agent_note text,
      admin_note text,
      paid_at timestamptz,
      heated_at timestamptz,
      packed_at timestamptz,
      boxed_at timestamptz,
      dispatched_at timestamptz,
      delivered_at timestamptz,
      received_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_agility_orders_agent ON agility_stock_orders(agent_id, created_at DESC)`
  await sql`ALTER TABLE agility_stock_orders ADD COLUMN IF NOT EXISTS payment_link text`
  await sql`CREATE INDEX IF NOT EXISTS idx_agility_orders_payment ON agility_stock_orders(payment_status, created_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_agility_orders_fulfillment ON agility_stock_orders(fulfillment_status, created_at DESC)`
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_agility_orders_flw_tx ON agility_stock_orders(flutterwave_transaction_id) WHERE flutterwave_transaction_id IS NOT NULL`

  await sql`
    CREATE TABLE IF NOT EXISTS agility_agent_sales (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id uuid NOT NULL,
      agent_id uuid NOT NULL,
      quantity_packages integer NOT NULL,
      unit_price_ngn numeric(14,2) NOT NULL,
      total_ngn numeric(14,2) NOT NULL,
      sold_at timestamptz NOT NULL DEFAULT NOW(),
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_agility_sales_order ON agility_agent_sales(order_id, sold_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_agility_sales_agent ON agility_agent_sales(agent_id, sold_at DESC)`
}

export function getAgilityVariant(id: string) {
  return AGILITY_VARIANTS.find((variant) => variant.id === id) || null
}

export function getAgilityTotals(boxCount: number) {
  const packageCount = boxCount * AGILITY_PACKAGES_PER_BOX
  return {
    boxCount,
    packageCount,
    packagesPerBox: AGILITY_PACKAGES_PER_BOX,
    unitPriceNgn: AGILITY_UNIT_PRICE_NGN,
    boxPriceNgn: AGILITY_BOX_PRICE_NGN,
    totalNgn: boxCount * AGILITY_BOX_PRICE_NGN,
  }
}

export function isAgilityFulfillmentStatus(value: string) {
  return (AGILITY_FULFILLMENT_STAGES as readonly string[]).includes(value)
}

export function nextAgilityAdminStage(current: string) {
  const sequence = ['paid', 'heating', 'packed', 'boxed', 'dispatched', 'delivered']
  const index = sequence.indexOf(current)
  return index >= 0 && index < sequence.length - 1 ? sequence[index + 1] : null
}

export function stageTimestampColumn(status: string) {
  if (status === 'heating') return 'heated_at'
  if (status === 'packed') return 'packed_at'
  if (status === 'boxed') return 'boxed_at'
  if (status === 'dispatched') return 'dispatched_at'
  if (status === 'delivered') return 'delivered_at'
  if (status === 'received') return 'received_at'
  return null
}
