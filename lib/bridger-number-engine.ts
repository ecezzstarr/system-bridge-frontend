import { getSql } from '@/lib/db'

export const BRIDGER_NUMBER_ORDER_DELIVERY_MINUTES = 30

export async function ensureBridgerNumberEngineSchema(sql = getSql()) {
  await sql`
    CREATE TABLE IF NOT EXISTS bridger_whatsapp_numbers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      phone_e164 varchar(32) NOT NULL UNIQUE,
      country varchar(100) NOT NULL,
      provider varchar(160) NOT NULL DEFAULT 'Aphone',
      provider_reference varchar(220),
      acquisition_cost numeric(30,8) CHECK (acquisition_cost >= 0),
      price_flame_coin numeric(30,8) NOT NULL CHECK (price_flame_coin >= 0),
      status varchar(32) NOT NULL DEFAULT 'available',
      assigned_to uuid REFERENCES users(id),
      assigned_at timestamptz,
      notes text,
      created_by uuid REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_bridger_whatsapp_numbers_status ON bridger_whatsapp_numbers(status,created_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_bridger_whatsapp_numbers_owner ON bridger_whatsapp_numbers(assigned_to,assigned_at DESC)`

  await sql`
    CREATE TABLE IF NOT EXISTS bridger_number_country_offers (
      country varchar(100) PRIMARY KEY,
      price_flame_coin numeric(30,8) NOT NULL CHECK (price_flame_coin > 0),
      enabled boolean NOT NULL DEFAULT true,
      delivery_minutes integer NOT NULL DEFAULT 30 CHECK (delivery_minutes BETWEEN 5 AND 30),
      updated_by uuid REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    INSERT INTO bridger_number_country_offers(country,price_flame_coin,enabled,delivery_minutes)
    SELECT country,MAX(price_flame_coin),true,30
    FROM bridger_whatsapp_numbers
    WHERE country IS NOT NULL AND country<>'' AND price_flame_coin>0
    GROUP BY country
    ON CONFLICT (country) DO NOTHING
  `

  await sql`
    CREATE TABLE IF NOT EXISTS bridger_number_orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      bridger_id uuid NOT NULL REFERENCES users(id),
      country varchar(100) NOT NULL,
      price_flame_coin numeric(30,8) NOT NULL CHECK (price_flame_coin > 0),
      status varchar(24) NOT NULL DEFAULT 'requested',
      deadline_at timestamptz NOT NULL DEFAULT (NOW() + interval '30 minutes'),
      number_id uuid REFERENCES bridger_whatsapp_numbers(id),
      admin_message text,
      delivered_at timestamptz,
      cancelled_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_bridger_number_orders_owner ON bridger_number_orders(bridger_id,created_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_bridger_number_orders_admin ON bridger_number_orders(status,deadline_at ASC)`

  await sql`
    CREATE TABLE IF NOT EXISTS bridger_number_verification_requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      number_id uuid NOT NULL REFERENCES bridger_whatsapp_numbers(id) ON DELETE CASCADE,
      bridger_id uuid NOT NULL REFERENCES users(id),
      method varchar(10) NOT NULL CHECK (method IN ('sms','call')),
      status varchar(24) NOT NULL DEFAULT 'requested',
      admin_message text,
      verification_code varchar(120),
      requested_at timestamptz NOT NULL DEFAULT NOW(),
      deadline_at timestamptz NOT NULL DEFAULT (NOW() + interval '10 minutes'),
      responded_at timestamptz,
      verified_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_bridger_number_verification_owner ON bridger_number_verification_requests(bridger_id,requested_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_bridger_number_verification_admin ON bridger_number_verification_requests(status,deadline_at ASC)`
}

export async function ensureBridgerNumberPosition(client: { query: (query:string,values?:unknown[])=>Promise<{rows:any[]}> }, userId:string) {
  const user=(await client.query(
    `SELECT id,role,COALESCE(is_active,true) AS is_active FROM users WHERE id=$1::uuid FOR UPDATE`,
    [userId],
  )).rows[0]
  if(!user || user.role!=='bridger' || !user.is_active) return {ok:false as const,error:'An active Bridger position is required'}

  let profile=(await client.query(
    `SELECT status FROM bridger_profiles WHERE user_id=$1::uuid ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
    [userId],
  )).rows[0]

  if(!profile){
    await client.query(
      `INSERT INTO bridger_profiles (user_id,commission_rate,status)
       VALUES ($1::uuid,0.50,'active')`,
      [userId],
    )
    profile=(await client.query(
      `SELECT status FROM bridger_profiles WHERE user_id=$1::uuid ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
      [userId],
    )).rows[0]
  }

  if(profile?.status!=='active') return {ok:false as const,error:'Your Bridger position is not active'}
  return {ok:true as const}
}

export async function ensurePrimaryWallet(client: { query: (query:string,values?:unknown[])=>Promise<{rows:any[]}> }, userId:string) {
  let wallet=(await client.query(
    `SELECT id,balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true ORDER BY created_at ASC LIMIT 1 FOR UPDATE`,
    [userId],
  )).rows[0]
  if(wallet) return wallet

  wallet=(await client.query(
    `INSERT INTO wallets (id,user_id,balance_trx,balance_usdt,is_primary,is_eight_engine_controlled,created_at,updated_at)
     VALUES (gen_random_uuid(),$1::uuid,0,0,true,true,NOW(),NOW())
     RETURNING id,balance_trx`,
    [userId],
  )).rows[0]
  return wallet
}

export function normalizeCountry(value:unknown){
  return String(value||'').trim().replace(/\s+/g,' ').slice(0,100)
}

export function normalizeE164(value: unknown) {
  const raw=String(value || '').trim().replace(/[\s()-]/g,'')
  return /^\+[1-9]\d{7,14}$/.test(raw) ? raw : null
}
