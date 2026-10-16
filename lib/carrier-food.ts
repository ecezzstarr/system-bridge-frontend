import { getPool } from '@/lib/db'
import { getWeavePublicOrigin } from '@/lib/weave-origin'
import { ensureAgilitySchema } from '@/lib/agility'
import { ensureAgentDistributionSchema } from '@/lib/agent-distribution'
import { ensureUserReferralCode } from '@/lib/user-referral'
import { getWeaveFoodVariantEconomics } from '@/lib/weave-food-economics'

export const CARRIER_FOOD_ORDER_STATUSES = [
  'awaiting_customer_payment',
  'awaiting_payment_verification',
  'requested',
  'fulfilled',
  'cancelled',
] as const
export type CarrierFoodOrderStatus = (typeof CARRIER_FOOD_ORDER_STATUSES)[number]

export const CARRIER_FOOD_PAYMENT_STATUSES = ['awaiting_payment','proof_submitted','paid','rejected'] as const
export type CarrierFoodPaymentStatus = (typeof CARRIER_FOOD_PAYMENT_STATUSES)[number]
export const CARRIER_FOOD_PAYMENT_WINDOW_MINUTES = 30

let schemaPromise: Promise<void> | null = null

async function initializeCarrierFoodSchema() {
  await ensureAgilitySchema()
  await ensureAgentDistributionSchema()
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS carrier_food_agent_payment_accounts (
        agent_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        bank_name varchar(120) NOT NULL,
        account_number varchar(40) NOT NULL,
        account_name varchar(180) NOT NULL,
        payment_note varchar(300),
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      )
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS carrier_food_agent_prices (
        agent_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        variant_id varchar(80) NOT NULL,
        selling_unit_price_ngn numeric(14,2) NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        PRIMARY KEY (agent_id, variant_id),
        CHECK (selling_unit_price_ngn > 0)
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS carrier_food_orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        referral_code varchar(40) NOT NULL,
        stock_order_id uuid NOT NULL REFERENCES agility_stock_orders(id),
        variant_id varchar(80) NOT NULL,
        quantity_packages integer NOT NULL,
        unit_price_ngn numeric(14,2) NOT NULL,
        food_subtotal_ngn numeric(14,2) NOT NULL,
        waybill_fee_ngn numeric(14,2) NOT NULL DEFAULT 0,
        total_ngn numeric(14,2) NOT NULL,
        weave_unit_price_ngn numeric(14,2),
        agent_unit_cost_ngn numeric(14,2),
        agent_margin_ngn numeric(14,2),
        customer_name varchar(180) NOT NULL,
        customer_phone varchar(60) NOT NULL,
        delivery_mode varchar(30) NOT NULL DEFAULT 'local',
        delivery_location text NOT NULL,
        customer_note text,
        status varchar(40) NOT NULL DEFAULT 'awaiting_customer_payment',
        payment_method varchar(40) NOT NULL DEFAULT 'bank_transfer',
        payment_bank_name varchar(120),
        payment_account_number varchar(40) NOT NULL,
        payment_account_name varchar(180),
        payment_reference varchar(255),
        opay_transaction_reference varchar(255),
        payment_status varchar(40) NOT NULL DEFAULT 'awaiting_payment',
        payment_expires_at timestamptz,
        payment_proof_submitted_at timestamptz,
        payment_verified_by uuid REFERENCES users(id),
        payment_verified_at timestamptz,
        payment_rejected_at timestamptz,
        payment_admin_note text,
        fulfilled_at timestamptz,
        cancelled_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CHECK (quantity_packages > 0),
        CHECK (unit_price_ngn > 0),
        CHECK (food_subtotal_ngn > 0),
        CHECK (waybill_fee_ngn >= 0),
        CHECK (total_ngn > 0),
        CHECK (delivery_mode IN ('local','waybill')),
        CHECK (status IN ('awaiting_customer_payment','awaiting_payment_verification','requested','fulfilled','cancelled')),
        CHECK (payment_status IN ('awaiting_payment','proof_submitted','paid','rejected'))
      )
    `)

    await client.query('ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS food_subtotal_ngn numeric(14,2)')
    await client.query('ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS waybill_fee_ngn numeric(14,2) NOT NULL DEFAULT 0')
    await client.query("ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS delivery_mode varchar(30) NOT NULL DEFAULT 'local'")
    await client.query('ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS weave_unit_price_ngn numeric(14,2)')
    await client.query('ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS agent_unit_cost_ngn numeric(14,2)')
    await client.query('ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS agent_margin_ngn numeric(14,2)')
    await client.query("ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_method varchar(40) NOT NULL DEFAULT 'bank_transfer'")
    await client.query('ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_bank_name varchar(120)')
    await client.query("ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_account_number varchar(40) NOT NULL DEFAULT ''")
    await client.query('ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_account_name varchar(180)')
    await client.query('ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_reference varchar(255)')
    await client.query('ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS opay_transaction_reference varchar(255)')
    await client.query("ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_status varchar(40) NOT NULL DEFAULT 'awaiting_payment'")
    await client.query('ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_expires_at timestamptz')
    await client.query('ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_proof_submitted_at timestamptz')
    await client.query('ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_verified_by uuid REFERENCES users(id)')
    await client.query('ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz')
    await client.query('ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_rejected_at timestamptz')
    await client.query('ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_admin_note text')
    await client.query("UPDATE carrier_food_orders SET food_subtotal_ngn=GREATEST(1,total_ngn-COALESCE(waybill_fee_ngn,0)) WHERE food_subtotal_ngn IS NULL")
    await client.query("UPDATE carrier_food_orders SET delivery_mode='local' WHERE delivery_mode IS NULL OR delivery_mode NOT IN ('local','waybill')")
    await client.query("ALTER TABLE carrier_food_orders ALTER COLUMN payment_status SET DEFAULT 'awaiting_payment'")
    await client.query("ALTER TABLE carrier_food_orders ALTER COLUMN payment_method SET DEFAULT 'bank_transfer'")

    await client.query('ALTER TABLE carrier_food_orders DROP CONSTRAINT IF EXISTS carrier_food_orders_status_check')
    await client.query("ALTER TABLE carrier_food_orders ADD CONSTRAINT carrier_food_orders_status_check CHECK (status IN ('awaiting_customer_payment','awaiting_payment_verification','requested','fulfilled','cancelled'))")
    await client.query('ALTER TABLE carrier_food_orders DROP CONSTRAINT IF EXISTS carrier_food_orders_payment_status_check')
    await client.query("ALTER TABLE carrier_food_orders ADD CONSTRAINT carrier_food_orders_payment_status_check CHECK (payment_status IN ('awaiting_payment','proof_submitted','paid','rejected'))")
    await client.query('ALTER TABLE carrier_food_orders DROP CONSTRAINT IF EXISTS carrier_food_orders_delivery_mode_check')
    await client.query("ALTER TABLE carrier_food_orders ADD CONSTRAINT carrier_food_orders_delivery_mode_check CHECK (delivery_mode IN ('local','waybill'))")

    // Retire unpaid customer→WEAVE checkout intents from the earlier payment rail.
    await client.query(`
      UPDATE carrier_food_orders
      SET status='cancelled',cancelled_at=COALESCE(cancelled_at,NOW()),updated_at=NOW(),
          payment_admin_note=COALESCE(payment_admin_note,'Cancelled: customer payments now go to the Agent receiving account.')
      WHERE status='awaiting_customer_payment'
        AND payment_status='awaiting_payment'
        AND payment_account_number='8136003459'
    `)

    await client.query('CREATE INDEX IF NOT EXISTS carrier_food_orders_agent_idx ON carrier_food_orders(agent_id, created_at DESC)')
    await client.query('CREATE INDEX IF NOT EXISTS carrier_food_orders_stock_idx ON carrier_food_orders(stock_order_id, status)')
    await client.query('CREATE INDEX IF NOT EXISTS carrier_food_orders_ref_idx ON carrier_food_orders(referral_code, created_at DESC)')
    await client.query('CREATE INDEX IF NOT EXISTS carrier_food_orders_payment_status_idx ON carrier_food_orders(payment_status, created_at DESC)')
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS carrier_food_orders_payment_ref_uidx ON carrier_food_orders(payment_reference) WHERE payment_reference IS NOT NULL')

    await client.query(`
      CREATE TABLE IF NOT EXISTS carrier_food_visitors (
        agent_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        visitor_key varchar(120) NOT NULL,
        first_seen_at timestamptz NOT NULL DEFAULT NOW(),
        last_seen_at timestamptz NOT NULL DEFAULT NOW(),
        PRIMARY KEY (agent_id, visitor_key)
      )
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS carrier_food_shares (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        channel varchar(40) NOT NULL DEFAULT 'share',
        created_at timestamptz NOT NULL DEFAULT NOW()
      )
    `)
    await client.query('CREATE INDEX IF NOT EXISTS carrier_food_shares_agent_idx ON carrier_food_shares(agent_id, created_at DESC)')
  } finally {
    client.release()
  }
}

export function ensureCarrierFoodSchema() {
  if (!schemaPromise) {
    schemaPromise = initializeCarrierFoodSchema().catch(error => {
      schemaPromise = null
      throw error
    })
  }
  return schemaPromise
}

export async function expireCarrierFoodPaymentIntents(agentId?: string | null) {
  await ensureCarrierFoodSchema()
  const values: unknown[] = []
  const agentClause = agentId ? 'AND agent_id=$1::uuid' : ''
  if (agentId) values.push(agentId)
  await getPool().query(
    `UPDATE carrier_food_orders
     SET status='cancelled',cancelled_at=COALESCE(cancelled_at,NOW()),updated_at=NOW()
     WHERE status='awaiting_customer_payment'
       AND payment_status='awaiting_payment'
       AND payment_expires_at IS NOT NULL
       AND payment_expires_at<NOW()
       ${agentClause}`,
    values
  )
}

export async function getCarrierFoodAgentPaymentAccount(agentId: string) {
  await ensureCarrierFoodSchema()
  const result = await getPool().query(
    `SELECT bank_name,account_number,account_name,payment_note,updated_at
     FROM carrier_food_agent_payment_accounts
     WHERE agent_id=$1::uuid
     LIMIT 1`,
    [agentId]
  )
  return result.rows[0] || null
}

export async function getAgentCarrierFoodIdentity(agentId: string) {
  await ensureCarrierFoodSchema()
  const referralCode = await ensureUserReferralCode(agentId)
  if (!referralCode) return null
  const result = await getPool().query(
    `SELECT id,name,username,email,whatsapp_number,referral_code
     FROM users
     WHERE id=$1::uuid AND role='agent' AND is_active=true
     LIMIT 1`,
    [agentId]
  )
  const row = result.rows[0]
  if (!row) return null
  return { ...row, referral_code: referralCode }
}

export async function getAgentByCarrierFoodCode(code: string) {
  await ensureCarrierFoodSchema()
  const normalized = String(code || '').trim().toUpperCase()
  if (!normalized) return null
  const result = await getPool().query(
    `SELECT id,name,username,whatsapp_number,referral_code
     FROM users
     WHERE UPPER(referral_code)=$1 AND role='agent' AND is_active=true
     LIMIT 1`,
    [normalized]
  )
  return result.rows[0] || null
}

export function getCarrierFoodPath(referralCode: string) {
  return `/carrier/food/${encodeURIComponent(referralCode)}`
}

export function getCarrierFoodUrl(referralCode: string) {
  return `${getWeavePublicOrigin()}${getCarrierFoodPath(referralCode)}`
}

export function getCarrierFoodShareImageUrl(referralCode: string) {
  return `${getWeavePublicOrigin()}${getCarrierFoodPath(referralCode)}/opengraph-image`
}

export function getCarrierFoodBridgerInfoUrl(referralCode: string) {
  return `${getWeavePublicOrigin()}${getCarrierFoodPath(referralCode)}/bridger`
}

export function getCarrierFoodBridgerJoinUrl(referralCode: string) {
  return `${getWeavePublicOrigin()}/register?role=bridger&ref=${encodeURIComponent(referralCode)}&source=carrier-food`
}

export function buildCarrierFoodShareText(input: { agentName: string; url: string }) {
  return `WEAVE Food through ${input.agentName}\n\nAgility + Electrolyte are available through my Carrier Door. Customers pay my Agent receiving account before the order moves. Far-location orders include waybill. Open the link to order, or understand the Bridger position before entering WEAVE as my Bridger.\n\n${input.url}`
}

export async function getCarrierFoodAvailableStock(agentId: string) {
  await ensureCarrierFoodSchema()
  await expireCarrierFoodPaymentIntents(agentId)
  const result = await getPool().query(
    `SELECT
       s.id AS stock_order_id,
       s.variant_id,
       s.package_count,
       s.packages_per_box,
       s.retail_unit_price_ngn,
       s.agent_unit_cost_ngn,
       COALESCE((SELECT SUM(a.quantity_packages) FROM agility_agent_sales a WHERE a.order_id=s.id),0)::int AS sold_packages,
       COALESCE((SELECT SUM(p.package_count) FROM agility_outlet_placements p WHERE p.order_id=s.id),0)::int AS outlet_packages,
       COALESCE((
         SELECT SUM(c.quantity_packages)
         FROM carrier_food_orders c
         WHERE c.stock_order_id=s.id
           AND (
             c.status IN ('awaiting_payment_verification','requested')
             OR (c.status='awaiting_customer_payment' AND c.payment_expires_at>NOW())
           )
       ),0)::int AS reserved_packages,
       GREATEST(
         0,
         s.package_count
         - COALESCE((SELECT SUM(a.quantity_packages) FROM agility_agent_sales a WHERE a.order_id=s.id),0)
         - COALESCE((SELECT SUM(p.package_count) FROM agility_outlet_placements p WHERE p.order_id=s.id),0)
         - COALESCE((
             SELECT SUM(c.quantity_packages)
             FROM carrier_food_orders c
             WHERE c.stock_order_id=s.id
               AND (
                 c.status IN ('awaiting_payment_verification','requested')
                 OR (c.status='awaiting_customer_payment' AND c.payment_expires_at>NOW())
               )
           ),0)
       )::int AS available_packages
     FROM agility_stock_orders s
     WHERE s.agent_id=$1::uuid
       AND s.payment_status='paid'
       AND s.fulfillment_status='received'
     ORDER BY s.received_at ASC NULLS FIRST, s.created_at ASC`,
    [agentId]
  )
  return result.rows
}

export async function getCarrierFoodProductAvailability(agentId: string) {
  const stock = await getCarrierFoodAvailableStock(agentId)
  const priceResult = await getPool().query(
    `SELECT variant_id,selling_unit_price_ngn
     FROM carrier_food_agent_prices
     WHERE agent_id=$1::uuid`,
    [agentId]
  )
  const priceMap = new Map(priceResult.rows.map(row => [String(row.variant_id), Number(row.selling_unit_price_ngn)]))
  const byProduct = new Map<string, {
    variantId: string
    availablePackages: number
    weaveAgentUnitPriceNgn: number
    agentUnitCostNgn: number
    agentSellingUnitPriceNgn: number
    retailUnitPriceNgn: number
    weaveRetailUnitPriceNgn: number
    agentMarginPerPackageNgn: number
    customerPriceLocked: boolean
  }>()

  for (const row of stock) {
    const variantId = String(row.variant_id)
    const canonical = getWeaveFoodVariantEconomics(variantId)
    if (!canonical) continue
    const actualAgentCost = Number(row.agent_unit_cost_ngn || canonical.agentBuyUnitPriceNgn)
    const configured = Number(priceMap.get(variantId) || canonical.agentSellingUnitPriceNgn)
    const selling = canonical.customerPriceLocked
      ? canonical.agentSellingUnitPriceNgn
      : Math.max(canonical.agentSellingUnitPriceNgn, configured)
    const current = byProduct.get(variantId) || {
      variantId,
      availablePackages: 0,
      weaveAgentUnitPriceNgn: canonical.agentBuyUnitPriceNgn,
      agentUnitCostNgn: actualAgentCost,
      agentSellingUnitPriceNgn: selling,
      retailUnitPriceNgn: selling,
      weaveRetailUnitPriceNgn: canonical.agentSellingUnitPriceNgn,
      agentMarginPerPackageNgn: Math.max(0, selling - actualAgentCost),
      customerPriceLocked: canonical.customerPriceLocked,
    }
    current.availablePackages += Number(row.available_packages || 0)
    byProduct.set(variantId, current)
  }
  return Array.from(byProduct.values())
}

export async function recordCarrierFoodView(agentId: string, visitorKey?: string | null) {
  if (!visitorKey) return
  await ensureCarrierFoodSchema()
  const safe = String(visitorKey).trim().slice(0, 120)
  if (!safe) return
  await getPool().query(
    `INSERT INTO carrier_food_visitors (agent_id,visitor_key,first_seen_at,last_seen_at)
     VALUES ($1::uuid,$2,NOW(),NOW())
     ON CONFLICT (agent_id,visitor_key)
     DO UPDATE SET last_seen_at=NOW()`,
    [agentId, safe]
  )
}

export async function recordCarrierFoodShare(agentId: string, channel?: string | null) {
  await ensureCarrierFoodSchema()
  const safe = String(channel || 'share').trim().slice(0, 40) || 'share'
  await getPool().query(
    `INSERT INTO carrier_food_shares (agent_id,channel) VALUES ($1::uuid,$2)`,
    [agentId, safe]
  )
}
