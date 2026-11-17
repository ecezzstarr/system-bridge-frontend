import {getPool} from '@/lib/db'

/**
 * Sunshine is a voluntary, self-reported personal savings continuity record.
 * WEAVE does not open, control, debit, hold or verify external bank accounts.
 * Only the account owner can record/correct withdrawals and declare capital.
 * Regional Managers see support needs and withdrawal counts only with consent.
 */
export const SUNSHINE_MIN_START_NGN=1_000_000
export const SUNSHINE_WITHDRAWAL_TARGET=2
export const SUNSHINE_PRODUCTS=['ecobank_super_savers','other_savings'] as const
export const SUNSHINE_OBSTACLES=['work_tools','food_stock','customer_orders','transport','earnings_gap','other'] as const

export function validSunshineCapital(value:unknown):number|null{
  const n=Number(value)
  return Number.isFinite(n)&&n>=SUNSHINE_MIN_START_NGN&&n<=999_999_999_999&&
    Math.round(n*100)===n*100?n:null
}
export function sunshineMonthKey():string{
  // The authoritative month comes from PostgreSQL Africa/Lagos, not this clock.
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit'}).format(new Date()).slice(0,7)
}

export async function ensureSunshineSchema(){
  const db=getPool()
  await db.query(`CREATE TABLE IF NOT EXISTS weave_sunshine_savings_plans(
    user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    declared_capital_ngn numeric(18,2) NOT NULL CHECK(declared_capital_ngn>=1000000),
    bank_product varchar(40) NOT NULL CHECK(bank_product IN ('ecobank_super_savers','other_savings')),
    manager_visibility boolean NOT NULL DEFAULT false,
    needs_help boolean NOT NULL DEFAULT false,
    obstacle_kind varchar(30) CHECK(obstacle_kind IN ('work_tools','food_stock','customer_orders','transport','earnings_gap','other')),
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
  )`)
  await db.query(`CREATE TABLE IF NOT EXISTS weave_sunshine_monthly_withdrawals(
    user_id uuid NOT NULL REFERENCES weave_sunshine_savings_plans(user_id) ON DELETE CASCADE,
    month_key char(7) NOT NULL CHECK(month_key ~ '^[0-9]{4}-[0-9]{2}$'),
    withdrawal_count integer NOT NULL DEFAULT 0 CHECK(withdrawal_count>=0),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    PRIMARY KEY(user_id,month_key)
  )`)
  await db.query(`CREATE TABLE IF NOT EXISTS weave_sunshine_withdrawal_audit(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES weave_sunshine_savings_plans(user_id) ON DELETE CASCADE,
    month_key char(7) NOT NULL,
    action varchar(12) NOT NULL CHECK(action IN ('record','correct')),
    request_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    UNIQUE(user_id,request_id)
  )`)
  await db.query('CREATE INDEX IF NOT EXISTS idx_sunshine_plans_manager_visibility ON weave_sunshine_savings_plans(manager_visibility,needs_help)')
}
