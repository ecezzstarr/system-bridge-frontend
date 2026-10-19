import crypto from 'node:crypto'
import { getPool } from '@/lib/db'
import { ensureCarrierFoodSchema } from '@/lib/carrier-food'

export const CARRIER_CAKE_STATUSES=['quote_requested','quoted','awaiting_payment_verification','paid','preparing','ready','dispatched','completed','cancelled'] as const
export type CarrierCakeStatus=(typeof CARRIER_CAKE_STATUSES)[number]
export const CARRIER_CAKE_PAYMENT_STATUSES=['not_ready','awaiting_payment','proof_submitted','paid','rejected'] as const
export type CarrierCakePaymentStatus=(typeof CARRIER_CAKE_PAYMENT_STATUSES)[number]

let cakeSchemaPromise:Promise<void>|null=null

async function initializeCarrierCakeSchema(){
  await ensureCarrierFoodSchema()
  const pool=getPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS carrier_cake_orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      referral_code varchar(40) NOT NULL,
      public_token varchar(80) NOT NULL UNIQUE,
      cake_type varchar(80) NOT NULL,
      occasion varchar(180) NOT NULL,
      size_option varchar(80) NOT NULL,
      flavor varchar(120) NOT NULL,
      inscription varchar(300),
      design_note text,
      event_date date NOT NULL,
      customer_name varchar(180) NOT NULL,
      customer_phone varchar(60) NOT NULL,
      delivery_mode varchar(30) NOT NULL DEFAULT 'local',
      delivery_location text NOT NULL,
      quoted_price_ngn numeric(14,2),
      agent_commission_ngn numeric(14,2),
      weave_share_ngn numeric(14,2),
      waybill_fee_ngn numeric(14,2) NOT NULL DEFAULT 0,
      total_ngn numeric(14,2),
      payment_method varchar(40) NOT NULL DEFAULT 'bank_transfer',
      payment_bank_name varchar(120),
      payment_account_number varchar(40),
      payment_account_name varchar(180),
      payment_reference varchar(255),
      payment_status varchar(40) NOT NULL DEFAULT 'not_ready',
      payment_verified_at timestamptz,
      payment_rejected_at timestamptz,
      preparation_released_at timestamptz,
      preparation_released_by uuid REFERENCES users(id),
      status varchar(50) NOT NULL DEFAULT 'quote_requested',
      admin_note text,
      quoted_at timestamptz,
      preparing_at timestamptz,
      ready_at timestamptz,
      dispatched_at timestamptz,
      completed_at timestamptz,
      cancelled_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      CHECK (delivery_mode IN ('local','waybill')),
      CHECK (waybill_fee_ngn >= 0),
      CHECK (quoted_price_ngn IS NULL OR quoted_price_ngn > 0),
      CHECK (total_ngn IS NULL OR total_ngn > 0),
      CHECK (status IN ('quote_requested','quoted','awaiting_payment_verification','paid','preparing','ready','dispatched','completed','cancelled')),
      CHECK (payment_status IN ('not_ready','awaiting_payment','proof_submitted','paid','rejected'))
    )
  `)
  await pool.query('ALTER TABLE carrier_cake_orders ADD COLUMN IF NOT EXISTS preparation_released_at timestamptz')
  await pool.query('ALTER TABLE carrier_cake_orders ADD COLUMN IF NOT EXISTS preparation_released_by uuid REFERENCES users(id)')
  await pool.query('ALTER TABLE carrier_cake_orders ADD COLUMN IF NOT EXISTS agent_commission_ngn numeric(14,2)')
  await pool.query('ALTER TABLE carrier_cake_orders ADD COLUMN IF NOT EXISTS weave_share_ngn numeric(14,2)')
  await pool.query('CREATE INDEX IF NOT EXISTS carrier_cake_orders_agent_idx ON carrier_cake_orders(agent_id,created_at DESC)')
  await pool.query('CREATE INDEX IF NOT EXISTS carrier_cake_orders_status_idx ON carrier_cake_orders(status,created_at DESC)')
  await pool.query('CREATE INDEX IF NOT EXISTS carrier_cake_orders_ref_idx ON carrier_cake_orders(referral_code,created_at DESC)')
}

export function ensureCarrierCakeSchema(){
  if(!cakeSchemaPromise){cakeSchemaPromise=initializeCarrierCakeSchema().catch(error=>{cakeSchemaPromise=null;throw error})}
  return cakeSchemaPromise
}

export function createCakePublicToken(){return `CK-${crypto.randomBytes(18).toString('hex')}`}

export async function getCarrierCakeOrder(agentId:string,publicToken:string){
  await ensureCarrierCakeSchema()
  const result=await getPool().query(
    `SELECT id,public_token,cake_type,occasion,size_option,flavor,inscription,design_note,event_date,
            customer_name,customer_phone,delivery_mode,delivery_location,quoted_price_ngn,waybill_fee_ngn,total_ngn,
            payment_method,payment_bank_name,payment_account_number,payment_account_name,payment_status,status,
            admin_note,quoted_at,created_at,updated_at
     FROM carrier_cake_orders
     WHERE agent_id=$1::uuid AND public_token=$2
     LIMIT 1`,
    [agentId,publicToken]
  )
  return result.rows[0]||null
}

export function nextCakeAdministrationStatus(status:string){
  if(status==='paid')return 'preparing'
  if(status==='preparing')return 'ready'
  if(status==='ready')return 'dispatched'
  if(status==='dispatched')return 'completed'
  return null
}
