import {getPool} from '@/lib/db'
import {SUNSHINE_BANK_PRODUCTS} from '@/lib/sunshine-bank-products'

/**
 * Sunshine is an elective savings-and-work-continuity program, not an account
 * custodian. Users can enroll before reaching their savings target.
 * System Switch is an internal value unit, not a blockchain deposit or a bank.
 */
export const SUNSHINE_ENROLLMENT_TARGET_SS=1_000_000
export const SUNSHINE_WITHDRAWAL_TARGET=2
export const SUNSHINE_PRODUCTS=SUNSHINE_BANK_PRODUCTS.map(item=>item.id)
export const SUNSHINE_OBSTACLES=['work_tools','food_stock','customer_orders','transport','earnings_gap','other'] as const
export const SUNSHINE_MAX_INTEREST_ADVANCE_SHARE=0.70
export const SUNSHINE_COMPANY_INTEREST_SHARE=0.10

export function validSunshineCapital(value:unknown,currency:'NGN'|'TRX'='NGN'):number|null{
  const n=Number(value)
  const places=currency==='TRX'?6:2
  const factor=Math.pow(10,places)
  return Number.isFinite(n)&&n>=0&&n<=999_999_999_999&&
    Math.abs(Math.round(n*factor)-n*factor)<0.0001?n:null
}
export async function ensureSunshineSchema(){
  const db=getPool()
  const bankIds=SUNSHINE_PRODUCTS.map(id=>"'"+id+"'").join(',')
  await db.query(\`CREATE TABLE IF NOT EXISTS weave_sunshine_savings_plans(
    user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    declared_capital_ngn numeric(18,2) NOT NULL DEFAULT 0 CHECK(declared_capital_ngn>=0),
    declared_capital_trx numeric(18,6) NOT NULL DEFAULT 0 CHECK(declared_capital_trx>=0),
    capital_basis varchar(3) NOT NULL DEFAULT 'NGN' CHECK(capital_basis IN ('NGN','TRX')),
    bank_product varchar(40) NOT NULL CHECK(bank_product IN (\${bankIds})),
    manager_visibility boolean NOT NULL DEFAULT false,
    needs_help boolean NOT NULL DEFAULT false,
    obstacle_kind varchar(30) CHECK(obstacle_kind IN ('work_tools','food_stock','customer_orders','transport','earnings_gap','other')),
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
  )\`)
  // Existing Sunshine plans used a minimum-one-million naira CHECK. Preserve
  // enrolled records while allowing brand-new savers to start at zero.
  await db.query('ALTER TABLE weave_sunshine_savings_plans DROP CONSTRAINT IF EXISTS weave_sunshine_savings_plans_declared_capital_ngn_check')
  await db.query('ALTER TABLE weave_sunshine_savings_plans ADD COLUMN IF NOT EXISTS declared_capital_trx numeric(18,6) NOT NULL DEFAULT 0')
  await db.query("ALTER TABLE weave_sunshine_savings_plans ADD COLUMN IF NOT EXISTS capital_basis varchar(3) NOT NULL DEFAULT 'NGN'")
  await db.query('ALTER TABLE weave_sunshine_savings_plans ALTER COLUMN declared_capital_ngn SET DEFAULT 0')
  await db.query(\`CREATE TABLE IF NOT EXISTS weave_sunshine_monthly_withdrawals(
    user_id uuid NOT NULL REFERENCES weave_sunshine_savings_plans(user_id) ON DELETE CASCADE,
    month_key char(7) NOT NULL CHECK(month_key ~ '^[0-9]{4}-[0-9]{2}$'),
    withdrawal_count integer NOT NULL DEFAULT 0 CHECK(withdrawal_count>=0),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    PRIMARY KEY(user_id,month_key)
  )\`)
  await db.query(\`CREATE TABLE IF NOT EXISTS weave_sunshine_withdrawal_audit(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES weave_sunshine_savings_plans(user_id) ON DELETE CASCADE,
    month_key char(7) NOT NULL,
    action varchar(12) NOT NULL CHECK(action IN ('record','correct')),
    request_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    UNIQUE(user_id,request_id)
  )\`)
  await db.query(\`CREATE TABLE IF NOT EXISTS weave_sunshine_monthly_living_money(
    user_id uuid NOT NULL REFERENCES weave_sunshine_savings_plans(user_id) ON DELETE CASCADE,
    month_key char(7) NOT NULL CHECK(month_key ~ '^[0-9]{4}-[0-9]{2}$'),
    net_interest_credited_ngn numeric(18,2) NOT NULL DEFAULT 0 CHECK(net_interest_credited_ngn>=0),
    spent_from_interest_ngn numeric(18,2) NOT NULL DEFAULT 0 CHECK(spent_from_interest_ngn>=0 AND spent_from_interest_ngn<=net_interest_credited_ngn),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    PRIMARY KEY(user_id,month_key)
  )\`)
  await db.query('CREATE INDEX IF NOT EXISTS idx_sunshine_plans_manager_visibility ON weave_sunshine_savings_plans(manager_visibility,needs_help)')
}
