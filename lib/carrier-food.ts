import { getPool } from '@/lib/db'
import { getWeavePublicOrigin } from '@/lib/weave-origin'
import { ensureAgilitySchema } from '@/lib/agility'
import { ensureAgentDistributionSchema } from '@/lib/agent-distribution'
import { ensureUserReferralCode } from '@/lib/user-referral'
import { WEAVE_OPAY_ACCOUNT_NUMBER } from '@/lib/opay-config'

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
      CREATE TABLE IF NOT EXISTS carrier_food_orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        referral_code varchar(40) NOT NULL,
        stock_order_id uuid NOT NULL REFERENCES agility_stock_orders(id),
        variant_id varchar(80) NOT NULL,
        quantity_packages integer NOT NULL,
        unit_price_ngn numeric(14,2) NOT NULL,
        total_ngn numeric(14,2) NOT NULL,
        customer_name varchar(180) NOT NULL,
        customer_phone varchar(60) NOT NULL,
        delivery_location text NOT NULL,
        customer_note text,
        status varchar(40) NOT NULL DEFAULT 'awaiting_customer_payment',
        payment_method varchar(40) NOT NULL DEFAULT 'OPay',
        payment_account_number varchar(40) NOT NULL DEFAULT '${WEAVE_OPAY_ACCOUNT_NUMBER}',
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
        CHECK (total_ngn > 0),
        CHECK (status IN ('awaiting_customer_payment','awaiting_payment_verification','requested','fulfilled','cancelled')),
        CHECK (payment_status IN ('awaiting_payment','proof_submitted','paid','rejected'))
      )
    `)

    await client.query(`ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_method varchar(40) NOT NULL DEFAULT 'OPay'`)
    await client.query(`ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_account_number varchar(40) NOT NULL DEFAULT '${WEAVE_OPAY_ACCOUNT_NUMBER}'`)
    await client.query('ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_reference varchar(255)')
    await client.query('ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS opay_transaction_reference varchar(255)')
    await client.query("ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_status varchar(40) NOT NULL DEFAULT 'paid'")
    await client.query('ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_expires_at timestamptz')
    await client.query('ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_proof_submitted_at timestamptz')
    await client.query('ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_verified_by uuid REFERENCES users(id)')
    await client.query('ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz')
    await client.query('ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_rejected_at timestamptz')
    await client.query('ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_admin_note text')

    await client.query('ALTER TABLE carrier_food_orders DROP CONSTRAINT IF EXISTS carrier_food_orders_status_check')
    await client.query("ALTER TABLE carrier_food_orders ADD CONSTRAINT carrier_food_orders_status_check CHECK (status IN ('awaiting_customer_payment','awaiting_payment_verification','requested','fulfilled','cancelled'))")
    await client.query('ALTER TABLE carrier_food_orders DROP CONSTRAINT IF EXISTS carrier_food_orders_payment_status_check')
    await client.query("ALTER TABLE carrier_food_orders ADD CONSTRAINT carrier_food_orders_payment_status_check CHECK (payment_status IN ('awaiting_payment','proof_submitted','paid','rejected'))")

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
  const pool = getPool()
  if (agentId) {
    await pool.query(
      `UPDATE carrier_food_orders
       SET status='cancelled',cancelled_at=COALESCE(cancelled_at,NOW()),updated_at=NOW()
       WHERE agent_id=$1::uuid
         AND status='awaiting_customer_payment'
         AND payment_status='awaiting_payment'
         AND payment_expires_at IS NOT NULL
         AND payment_expires_at<NOW()`,
      [agentId]
    )
    return
  }
  await pool.query(`
    UPDATE carrier_food_orders
    SET status='cancelled',cancelled_at=COALESCE(cancelled_at,NOW()),updated_at=NOW()
    WHERE status='awaiting_customer_payment'
      AND payment_status='awaiting_payment'
      AND payment_expires_at IS NOT NULL
      AND payment_expires_at<NOW()
  `)
}

export async function getAgentCarrierFoodIdentity(agentId: string) {
  await ensureCarrierFoodSchema()
  const referralCode = await ensureUserReferralCode(agentId)
  if (!referralCode) return null
  const pool = getPool()
  const result = await pool.query(
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
  const pool = getPool()
  const result = await pool.query(
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
  return `WEAVE Food through ${input.agentName}\n\nAgility + Electrolyte are available through my Carrier Door. Open the link to order, or understand the Bridger position before entering WEAVE as a Bridger attached to my Agent position.\n\n${input.url}`
}

export async function getCarrierFoodAvailableStock(agentId: string) {
  await ensureCarrierFoodSchema()
  await expireCarrierFoodPaymentIntents(agentId)
  const pool = getPool()
  const result = await pool.query(
    `SELECT
       s.id AS stock_order_id,
       s.variant_id,
       s.package_count,
       s.packages_per_box,
       s.retail_unit_price_ngn,
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
  const byProduct = new Map<string, { variantId: string; availablePackages: number; retailUnitPriceNgn: number }>()
  for (const row of stock) {
    const variantId = String(row.variant_id)
    const current = byProduct.get(variantId) || { variantId, availablePackages: 0, retailUnitPriceNgn: Number(row.retail_unit_price_ngn || 0) }
    current.availablePackages += Number(row.available_packages || 0)
    if (!current.retailUnitPriceNgn) current.retailUnitPriceNgn = Number(row.retail_unit_price_ngn || 0)
    byProduct.set(variantId, current)
  }
  return Array.from(byProduct.values())
}

export async function recordCarrierFoodView(agentId: string, visitorKey?: string | null) {
  if (!visitorKey) return
  await ensureCarrierFoodSchema()
  const safe = String(visitorKey).trim().slice(0, 120)
  if (!safe) return
  const pool = getPool()
  await pool.query(
    `INSERT INTO carrier_food_visitors (agent_id,visitor_key,first_seen_at,last_seen_at)
     VALUES ($1::uuid,$2,NOW(),NOW())
     ON CONFLICT (agent_id,visitor_key)
     DO UPDATE SET last_seen_at=NOW()`,
    [agentId, safe]
  )
}

export async function recordCarrierFoodShare(agentId: string, channel?: string | null) {
  await ensureCarrierFoodSchema()
  const pool = getPool()
  await pool.query(
    `INSERT INTO carrier_food_shares (agent_id,channel) VALUES ($1::uuid,$2)`,
    [agentId, String(channel || 'share').trim().slice(0, 40) || 'share']
  )
}
