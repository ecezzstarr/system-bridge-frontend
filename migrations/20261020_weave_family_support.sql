-- Family support extends the approved Forensics child-support instruction ledger.
-- This migration does NOT move funds or create bank accounts.
CREATE TABLE IF NOT EXISTS weave_family_support_beneficiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES users(id),
  kind varchar(12) NOT NULL CHECK(kind IN ('child','parent')),
  display_name varchar(160) NOT NULL,
  bank_name varchar(120) NOT NULL,
  account_number varchar(20) NOT NULL,
  purpose varchar(32) NOT NULL DEFAULT 'education_food_activities',
  monthly_amount_ngn numeric(14,2) NOT NULL CHECK(monthly_amount_ngn > 0),
  recurring boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(sender_id,bank_name,account_number)
);
ALTER TABLE weave_child_support_orders ADD COLUMN IF NOT EXISTS beneficiary_id uuid REFERENCES weave_family_support_beneficiaries(id);
ALTER TABLE weave_child_support_orders ADD COLUMN IF NOT EXISTS support_kind varchar(12) NOT NULL DEFAULT 'child';
ALTER TABLE weave_child_support_orders ADD COLUMN IF NOT EXISTS purpose varchar(32) NOT NULL DEFAULT 'education_food_activities';
ALTER TABLE weave_child_support_orders DROP CONSTRAINT IF EXISTS weave_child_support_orders_status_check;
ALTER TABLE weave_child_support_orders ADD CONSTRAINT weave_child_support_orders_status_check
 CHECK(status IN ('awaiting_funding','submitted','funds_verified','transferred','rejected'));
CREATE UNIQUE INDEX IF NOT EXISTS weave_family_support_monthly_once
 ON weave_child_support_orders(beneficiary_id,period_month) WHERE beneficiary_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS weave_family_support_guidance (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES weave_child_support_orders(id) ON DELETE CASCADE,
 author_id uuid NOT NULL REFERENCES users(id),
 department varchar(16) NOT NULL CHECK(department IN ('mandate','lawyer')),
 guidance_note varchar(1000) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS weave_family_support_guidance_order_idx
 ON weave_family_support_guidance(order_id,created_at);
