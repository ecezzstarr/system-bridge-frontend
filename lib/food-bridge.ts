import crypto from 'node:crypto'
import { getPool } from '@/lib/db'
import { FOOD_BRIDGE_STATES, FOOD_BRIDGE_UNITS } from '@/lib/food-bridge-states'
export { FOOD_BRIDGE_STATES, FOOD_BRIDGE_UNITS, validFoodState, validFoodUnit } from '@/lib/food-bridge-states'
import { validFoodState, validFoodUnit } from '@/lib/food-bridge-states'

export function secretKey() { return crypto.randomBytes(32).toString('hex') }
export function keyHash(input: string) { return crypto.createHash('sha256').update(input).digest('hex') }
export function validKey(input: unknown) { return typeof input === 'string' && /^[a-f0-9]{64}$/.test(input) }
export function safeText(input: unknown, limit: number) {
  return typeof input === 'string' ? input.trim().slice(0, limit) : ''
}
export function validPhone(input: string) { return /^[+0-9()\s-]{7,30}$/.test(input) }
export function validQuantity(value: unknown, max = 100000) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 && number <= max && Math.abs(Math.round(number * 100)-number*100) < 1e-7
}
export function toNaira(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 && number <= 100000000
    && Math.abs(Math.round(number * 100)-number*100) < 1e-7
}
let schemaPromise: Promise<void> | undefined
async function establishSchema() {
  const pool = getPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS weave_food_farmers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      key_digest char(64) UNIQUE NOT NULL,
      farm_name varchar(120) NOT NULL,
      contact_private varchar(60) NOT NULL,
      state varchar(40) NOT NULL,
      community varchar(120) NOT NULL,
      consent_contact_sharing boolean NOT NULL DEFAULT false,
      status varchar(16) NOT NULL DEFAULT 'pending',
      reviewed_by uuid,
      review_note text,
      reviewed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      CHECK (status IN ('pending','approved','rejected'))
    );
    CREATE TABLE IF NOT EXISTS weave_food_surplus (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      farmer_id uuid NOT NULL REFERENCES weave_food_farmers(id),
      produce varchar(120) NOT NULL,
      unit varchar(16) NOT NULL,
      original_quantity numeric(14,2) NOT NULL CHECK (original_quantity > 0),
      available_quantity numeric(14,2) NOT NULL CHECK (available_quantity >= 0),
      minimum_quantity numeric(14,2) NOT NULL CHECK (minimum_quantity > 0),
      unit_price_ngn numeric(18,2) NOT NULL CHECK (unit_price_ngn > 0),
      details varchar(500) NOT NULL DEFAULT '',
      status varchar(16) NOT NULL DEFAULT 'active',
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      CHECK (status IN ('active','paused','closed'))
    );
    CREATE TABLE IF NOT EXISTS weave_food_direct_orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      buyer_key_digest char(64) UNIQUE NOT NULL,
      listing_id uuid NOT NULL REFERENCES weave_food_surplus(id),
      farmer_id uuid NOT NULL REFERENCES weave_food_farmers(id),
      buyer_name varchar(120) NOT NULL,
      buyer_phone_private varchar(60) NOT NULL,
      share_buyer_contact boolean NOT NULL DEFAULT false,
      destination_state varchar(40) NOT NULL,
      destination_area varchar(160) NOT NULL,
      delivery_mode varchar(12) NOT NULL DEFAULT 'delivery',
      quantity numeric(14,2) NOT NULL CHECK (quantity > 0),
      unit_price_ngn numeric(18,2) NOT NULL,
      food_subtotal_ngn numeric(18,2) NOT NULL,
      delivery_quote_ngn numeric(18,2),
      quote_note varchar(500),
      status varchar(28) NOT NULL DEFAULT 'requested',
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      CHECK (delivery_mode IN ('delivery','pickup')),
      CHECK (status IN ('requested','farmer_confirmed','quoted','accepted','dispatched','delivered','cancelled','rejected','expired'))
    );
    CREATE INDEX IF NOT EXISTS idx_weave_food_farmers_status ON weave_food_farmers(status,created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_weave_food_surplus_farmer ON weave_food_surplus(farmer_id,status);
    CREATE INDEX IF NOT EXISTS idx_weave_food_orders_farmer ON weave_food_direct_orders(farmer_id,status,created_at DESC);
  `)
}
export async function ensureFoodBridgeSchema() {
  if (!schemaPromise) schemaPromise = establishSchema().catch(error => { schemaPromise = undefined; throw error })
  await schemaPromise
}

// Release stock from requests that never reached the farmer. Neither an accepted
// nor an already dispatched order is ever expired by this task.
export async function expireFoodRequests() {
  await ensureFoodBridgeSchema()
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(`
      UPDATE weave_food_direct_orders
      SET status = 'expired', updated_at = NOW()
      WHERE status = 'requested' AND created_at < NOW() - INTERVAL '24 hours'
      RETURNING listing_id, quantity
    `)
    for (const row of rows) {
      await client.query(
        'UPDATE weave_food_surplus SET available_quantity = LEAST(original_quantity, available_quantity + $1::numeric), updated_at=NOW() WHERE id=$2::uuid',
        [row.quantity, row.listing_id],
      )
    }
    await client.query('COMMIT')
  } catch(error) {
    await client.query('ROLLBACK')
    throw error
  } finally { client.release() }
}
