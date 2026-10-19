import crypto from 'node:crypto'
import { getPool } from '@/lib/db'
export { FOOD_BRIDGE_STATES, FOOD_BRIDGE_UNITS, validFoodState, validFoodUnit } from '@/lib/food-bridge-states'

export const FOOD_BRIDGE_SECTORS = ['grains','roots','vegetables','fruits','protein','other'] as const

export function safeText(input: unknown, limit: number) {
  return typeof input === 'string' ? input.trim().slice(0, limit) : ''
}
export function validPhone(input: string) { return /^[+0-9()\s-]{7,30}$/.test(input) }
export function validQuantity(value: unknown, max = 100000) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 && n <= max && Math.abs(Math.round(n*100)-n*100) < 1e-7
}
export function validNaira(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 && n <= 100000000 && Math.abs(Math.round(n*100)-n*100) < 1e-7
}
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const guestOrderKey = () => crypto.randomBytes(32).toString('hex')
export const digestGuestOrderKey = (key:string) => crypto.createHash('sha256').update(key).digest('hex')
export const isGuestOrderKey = (key:unknown):key is string => typeof key==='string' && /^[a-f0-9]{64}$/.test(key)

let schema:Promise<void>|undefined
async function establishSchema() {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS weave_food_farmers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id uuid NOT NULL UNIQUE REFERENCES users(id),
      farm_name varchar(120) NOT NULL,
      contact_private varchar(60) NOT NULL,
      payout_bank_name varchar(120),
      payout_account_number varchar(30),
      payout_account_name varchar(150),
      state varchar(40) NOT NULL,
      community varchar(120) NOT NULL,
      consent_contact_sharing boolean NOT NULL DEFAULT false,
      status varchar(16) NOT NULL DEFAULT 'pending',
      reviewed_by uuid,
      review_note text,
      reviewed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      CHECK (status IN ('pending','approved','rejected'))
    );
    ALTER TABLE weave_food_farmers ADD COLUMN IF NOT EXISTS payout_bank_name varchar(120);
    ALTER TABLE weave_food_farmers ADD COLUMN IF NOT EXISTS payout_account_number varchar(30);
    ALTER TABLE weave_food_farmers ADD COLUMN IF NOT EXISTS payout_account_name varchar(150);
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
      buyer_user_id uuid NOT NULL REFERENCES users(id),
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
      CHECK (status IN ('requested','farmer_confirmed','quoted','accepted','dispatched','delivered','cancelled','rejected','expired','disputed','released','refunded'))
    );
    ALTER TABLE weave_food_direct_orders DROP CONSTRAINT IF EXISTS weave_food_direct_orders_status_check;
    ALTER TABLE weave_food_direct_orders ADD CONSTRAINT weave_food_direct_orders_status_check
      CHECK (status IN ('requested','farmer_confirmed','quoted','accepted','funds_held',
        'dispatched','delivered','released','disputed','refunded','cancelled','rejected','expired'));
    CREATE TABLE IF NOT EXISTS weave_food_escrow (
      order_id uuid PRIMARY KEY REFERENCES weave_food_direct_orders(id) ON DELETE RESTRICT,
      reference varchar(90) NOT NULL UNIQUE,
      food_amount_ngn numeric(18,2) NOT NULL,
      delivery_amount_ngn numeric(18,2) NOT NULL,
      buyer_total_ngn numeric(18,2) NOT NULL,
      weave_commission_ngn numeric(18,2) NOT NULL DEFAULT 1000 CHECK (weave_commission_ngn=1000),
      seller_payout_ngn numeric(18,2) NOT NULL,
      status varchar(24) NOT NULL DEFAULT 'awaiting_payment',
      proof_reference varchar(255),
      proof_submitted_at timestamptz,
      verified_by uuid REFERENCES users(id),
      verified_bank_reference varchar(255),
      verified_amount_ngn numeric(18,2),
      verified_at timestamptz,
      rejected_by uuid REFERENCES users(id),
      rejected_at timestamptz,
      payout_reference varchar(255),
      payout_recorded_by uuid REFERENCES users(id),
      payout_recorded_at timestamptz,
      refund_reference varchar(255),
      refund_recorded_by uuid REFERENCES users(id),
      refund_recorded_at timestamptz,
      dispute_note text,
      administration_note text,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      CHECK (buyer_total_ngn=food_amount_ngn+delivery_amount_ngn),
      CHECK (seller_payout_ngn=buyer_total_ngn-weave_commission_ngn AND seller_payout_ngn>0),
      CHECK (status IN ('awaiting_payment','proof_submitted','held','release_due','released','disputed','refund_due','refunded'))
    );
    -- The seller pays a fixed ₦1,000 per completed order, once, not per unit.
    -- The quote total remains the buyer's charge; the fee is deducted only from
    -- seller proceeds on successful completion. Full refunds restore buyer total.
    ALTER TABLE weave_food_escrow ALTER COLUMN weave_commission_ngn SET DEFAULT 1000;
    ALTER TABLE weave_food_escrow DROP CONSTRAINT IF EXISTS weave_food_escrow_weave_commission_ngn_check;
    ALTER TABLE weave_food_escrow ADD CONSTRAINT weave_food_escrow_weave_commission_ngn_check
      CHECK (weave_commission_ngn=1000);
    ALTER TABLE weave_food_escrow DROP CONSTRAINT IF EXISTS weave_food_escrow_check;
    ALTER TABLE weave_food_escrow DROP CONSTRAINT IF EXISTS weave_food_escrow_seller_payout_ngn_check;
    ALTER TABLE weave_food_escrow ADD CONSTRAINT weave_food_escrow_seller_payout_policy_check
      CHECK (seller_payout_ngn=buyer_total_ngn-weave_commission_ngn AND seller_payout_ngn>0);
    CREATE UNIQUE INDEX IF NOT EXISTS weave_food_escrow_bank_verification_uidx
      ON weave_food_escrow(verified_bank_reference) WHERE verified_bank_reference IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS weave_food_escrow_proof_uidx
      ON weave_food_escrow(proof_reference) WHERE proof_reference IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS weave_food_escrow_payout_uidx
      ON weave_food_escrow(payout_reference) WHERE payout_reference IS NOT NULL;
    CREATE INDEX IF NOT EXISTS weave_food_escrow_review_idx
      ON weave_food_escrow(status,updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_weave_food_farmers_status ON weave_food_farmers(status,created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_weave_food_surplus_farmer ON weave_food_surplus(farmer_id,status);
    ALTER TABLE weave_food_direct_orders ALTER COLUMN buyer_user_id DROP NOT NULL;
    ALTER TABLE weave_food_direct_orders ADD COLUMN IF NOT EXISTS guest_order_digest char(64);
    ALTER TABLE weave_food_direct_orders ADD COLUMN IF NOT EXISTS carrier_referral_code varchar(40);
    CREATE UNIQUE INDEX IF NOT EXISTS weave_food_guest_order_digest_unique
      ON weave_food_direct_orders(guest_order_digest) WHERE guest_order_digest IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_weave_food_orders_buyer ON weave_food_direct_orders(buyer_user_id,created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_weave_food_orders_farmer ON weave_food_direct_orders(farmer_id,status,created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_weave_food_orders_carrier ON weave_food_direct_orders(carrier_referral_code,status,created_at DESC);
    DO $
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conrelid='weave_food_direct_orders'::regclass
          AND conname='weave_food_orders_identity_check'
      ) THEN
        ALTER TABLE weave_food_direct_orders
          ADD CONSTRAINT weave_food_orders_identity_check
          CHECK (buyer_user_id IS NOT NULL OR guest_order_digest IS NOT NULL);
      END IF;
    END $;
  `)
}
export async function ensureFoodBridgeSchema() {
  if (!schema) schema = establishSchema().catch(error=>{schema=undefined;throw error})
  await schema
}

// Release unaccepted household reservations if the farmer does not respond
// within 24h, or a confirmation/quote stalls for 48h. Accepted/dispatched
// orders are never expired automatically.
export async function expireFoodRequests() {
  await ensureFoodBridgeSchema()
  const client=await getPool().connect()
  try {
    await client.query('BEGIN')
    const {rows}=await client.query(`
      UPDATE weave_food_direct_orders SET status='expired',updated_at=NOW()
      WHERE (status='requested' AND created_at < NOW()-INTERVAL '24 hours')
        OR (status IN ('farmer_confirmed','quoted') AND updated_at < NOW()-INTERVAL '48 hours')
        OR (status='accepted' AND updated_at < NOW()-INTERVAL '24 hours' AND NOT EXISTS (
          SELECT 1 FROM weave_food_escrow e WHERE e.order_id=weave_food_direct_orders.id
            AND e.status<>'awaiting_payment'))
      RETURNING listing_id,quantity
    `)
    for(const row of rows)await client.query(`
      UPDATE weave_food_surplus
      SET available_quantity=LEAST(original_quantity,available_quantity+$1::numeric),updated_at=NOW()
      WHERE id=$2::uuid
    `,[row.quantity,row.listing_id])
    await client.query('COMMIT')
  } catch(e) { await client.query('ROLLBACK');throw e } finally { client.release() }
}
