import { sql } from '@/lib/db'
import {
  AGILITY_AGENT_BOX_PRICE_NGN,
  AGILITY_AGENT_GROSS_PROFIT_PER_BOX_NGN,
  AGILITY_AGENT_GROSS_PROFIT_PER_PACKAGE_NGN,
  AGILITY_AGENT_UNIT_COST_NGN,
  AGILITY_COMPANY_COST_CEILING_PER_BOX_NGN,
  AGILITY_COMPANY_TARGET_GROSS_PROFIT_PER_BOX_NGN,
  AGILITY_FULFILLMENT_STAGES,
  AGILITY_OPAY_ACCOUNT_NUMBER,
  AGILITY_PACKAGES_PER_BOX,
  AGILITY_RETAIL_BOX_VALUE_NGN,
  AGILITY_RETAIL_UNIT_PRICE_NGN,
  AGILITY_VARIANTS,
} from '@/lib/agility-catalog'

export {
  AGILITY_AGENT_BOX_PRICE_NGN,
  AGILITY_AGENT_GROSS_PROFIT_PER_BOX_NGN,
  AGILITY_AGENT_GROSS_PROFIT_PER_PACKAGE_NGN,
  AGILITY_AGENT_UNIT_COST_NGN,
  AGILITY_COMPANY_COST_CEILING_PER_BOX_NGN,
  AGILITY_COMPANY_TARGET_GROSS_PROFIT_PER_BOX_NGN,
  AGILITY_FULFILLMENT_STAGES,
  AGILITY_OPAY_ACCOUNT_NUMBER,
  AGILITY_PACKAGES_PER_BOX,
  AGILITY_RETAIL_BOX_VALUE_NGN,
  AGILITY_RETAIL_UNIT_PRICE_NGN,
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
      unit_price_ngn numeric(14,2),
      box_price_ngn numeric(14,2),
      retail_unit_price_ngn numeric(14,2) NOT NULL,
      retail_box_value_ngn numeric(14,2) NOT NULL,
      agent_box_price_ngn numeric(14,2) NOT NULL,
      agent_unit_cost_ngn numeric(14,2) NOT NULL,
      total_ngn numeric(14,2) NOT NULL,
      agent_expected_gross_profit_ngn numeric(14,2) NOT NULL,
      planned_company_cost_per_box_ngn numeric(14,2),
      planned_company_total_cost_ngn numeric(14,2),
      planned_company_gross_profit_ngn numeric(14,2),
      payment_reference varchar(255) UNIQUE NOT NULL,
      payment_method varchar(40) NOT NULL DEFAULT 'OPay',
      opay_account_number varchar(40) NOT NULL,
      opay_receipt_data text,
      payment_status varchar(40) NOT NULL DEFAULT 'pending',
      payment_verified_by uuid,
      proof_submitted_at timestamptz,
      payment_verified_at timestamptz,
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

  await sql`ALTER TABLE agility_stock_orders ADD COLUMN IF NOT EXISTS unit_price_ngn numeric(14,2)`
  await sql`ALTER TABLE agility_stock_orders ADD COLUMN IF NOT EXISTS box_price_ngn numeric(14,2)`
  await sql`ALTER TABLE agility_stock_orders ADD COLUMN IF NOT EXISTS retail_unit_price_ngn numeric(14,2)`
  await sql`ALTER TABLE agility_stock_orders ADD COLUMN IF NOT EXISTS retail_box_value_ngn numeric(14,2)`
  await sql`ALTER TABLE agility_stock_orders ADD COLUMN IF NOT EXISTS agent_box_price_ngn numeric(14,2)`
  await sql`ALTER TABLE agility_stock_orders ADD COLUMN IF NOT EXISTS agent_unit_cost_ngn numeric(14,2)`
  await sql`ALTER TABLE agility_stock_orders ADD COLUMN IF NOT EXISTS agent_expected_gross_profit_ngn numeric(14,2)`
  await sql`ALTER TABLE agility_stock_orders ADD COLUMN IF NOT EXISTS planned_company_cost_per_box_ngn numeric(14,2)`
  await sql`ALTER TABLE agility_stock_orders ADD COLUMN IF NOT EXISTS planned_company_total_cost_ngn numeric(14,2)`
  await sql`ALTER TABLE agility_stock_orders ADD COLUMN IF NOT EXISTS planned_company_gross_profit_ngn numeric(14,2)`
  await sql`ALTER TABLE agility_stock_orders ADD COLUMN IF NOT EXISTS payment_method varchar(40) DEFAULT 'OPay'`
  await sql`ALTER TABLE agility_stock_orders ADD COLUMN IF NOT EXISTS opay_account_number varchar(40)`
  await sql`ALTER TABLE agility_stock_orders ADD COLUMN IF NOT EXISTS opay_receipt_data text`
  await sql`ALTER TABLE agility_stock_orders ADD COLUMN IF NOT EXISTS payment_verified_by uuid`
  await sql`ALTER TABLE agility_stock_orders ADD COLUMN IF NOT EXISTS proof_submitted_at timestamptz`
  await sql`ALTER TABLE agility_stock_orders ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz`

  await sql`CREATE INDEX IF NOT EXISTS idx_agility_orders_agent ON agility_stock_orders(agent_id, created_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_agility_orders_payment ON agility_stock_orders(payment_status, created_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_agility_orders_fulfillment ON agility_stock_orders(fulfillment_status, created_at DESC)`

  await sql`
    CREATE TABLE IF NOT EXISTS agility_agent_sales (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id uuid NOT NULL,
      agent_id uuid NOT NULL,
      quantity_packages integer NOT NULL,
      unit_price_ngn numeric(14,2),
      total_ngn numeric(14,2),
      retail_unit_price_ngn numeric(14,2) NOT NULL,
      agent_unit_cost_ngn numeric(14,2) NOT NULL,
      total_revenue_ngn numeric(14,2) NOT NULL,
      agent_gross_profit_ngn numeric(14,2) NOT NULL,
      sold_at timestamptz NOT NULL DEFAULT NOW(),
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`ALTER TABLE agility_agent_sales ADD COLUMN IF NOT EXISTS unit_price_ngn numeric(14,2)`
  await sql`ALTER TABLE agility_agent_sales ADD COLUMN IF NOT EXISTS total_ngn numeric(14,2)`
  await sql`ALTER TABLE agility_agent_sales ADD COLUMN IF NOT EXISTS retail_unit_price_ngn numeric(14,2)`
  await sql`ALTER TABLE agility_agent_sales ADD COLUMN IF NOT EXISTS agent_unit_cost_ngn numeric(14,2)`
  await sql`ALTER TABLE agility_agent_sales ADD COLUMN IF NOT EXISTS total_revenue_ngn numeric(14,2)`
  await sql`ALTER TABLE agility_agent_sales ADD COLUMN IF NOT EXISTS agent_gross_profit_ngn numeric(14,2)`
  await sql`CREATE INDEX IF NOT EXISTS idx_agility_sales_order ON agility_agent_sales(order_id, sold_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_agility_sales_agent ON agility_agent_sales(agent_id, sold_at DESC)`
}

export function getAgilityVariant(id: string) {
  return AGILITY_VARIANTS.find((variant) => variant.id === id) || null
}

export function getAgilityTotals(boxCount: number) {
  const packageCount = boxCount * AGILITY_PACKAGES_PER_BOX
  const retailValue = boxCount * AGILITY_RETAIL_BOX_VALUE_NGN
  const agentPayable = boxCount * AGILITY_AGENT_BOX_PRICE_NGN
  const agentExpectedGrossProfit = boxCount * AGILITY_AGENT_GROSS_PROFIT_PER_BOX_NGN

  return {
    boxCount,
    packageCount,
    packagesPerBox: AGILITY_PACKAGES_PER_BOX,
    retailUnitPriceNgn: AGILITY_RETAIL_UNIT_PRICE_NGN,
    retailBoxValueNgn: AGILITY_RETAIL_BOX_VALUE_NGN,
    agentBoxPriceNgn: AGILITY_AGENT_BOX_PRICE_NGN,
    agentUnitCostNgn: AGILITY_AGENT_UNIT_COST_NGN,
    agentPayableNgn: agentPayable,
    retailValueNgn: retailValue,
    agentExpectedGrossProfitNgn: agentExpectedGrossProfit,
  }
}

export function getAgilityCompanyEconomics(boxCount: number, plannedCostPerBoxNgn: number) {
  const wholesaleRevenue = boxCount * AGILITY_AGENT_BOX_PRICE_NGN
  const totalPlannedCost = boxCount * plannedCostPerBoxNgn
  const grossProfit = wholesaleRevenue - totalPlannedCost

  return {
    wholesaleRevenueNgn: wholesaleRevenue,
    totalPlannedCostNgn: totalPlannedCost,
    grossProfitNgn: grossProfit,
    grossProfitPerBoxNgn: AGILITY_AGENT_BOX_PRICE_NGN - plannedCostPerBoxNgn,
  }
}

export function isValidAgilityCompanyCost(plannedCostPerBoxNgn: number) {
  return (
    Number.isFinite(plannedCostPerBoxNgn) &&
    plannedCostPerBoxNgn > 0 &&
    plannedCostPerBoxNgn <= AGILITY_COMPANY_COST_CEILING_PER_BOX_NGN &&
    plannedCostPerBoxNgn < AGILITY_AGENT_BOX_PRICE_NGN
  )
}

export function nextAgilityAdminStage(current: string) {
  const sequence = ['paid', 'heating', 'packed', 'boxed', 'dispatched', 'delivered']
  const index = sequence.indexOf(current)
  return index >= 0 && index < sequence.length - 1 ? sequence[index + 1] : null
}
