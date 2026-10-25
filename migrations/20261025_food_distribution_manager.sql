-- Food Distribution Manager roles and verified monthly handoff target.
-- A team is one lead and up to two assistants; only Administration-verified
-- records count toward the 200 distinct food handoffs required per Nigeria month.
ALTER TABLE manager_employment ALTER COLUMN probation_target SET DEFAULT 200;
UPDATE manager_employment SET probation_target=200 WHERE probation_target<>200;
UPDATE manager_employment
SET core_duty='Distribute WEAVE food products to consumers and businesses, coordinate verified order handoffs across all food product types, meet the 200-distribution monthly team target, and report distribution records to Administration.',
    updated_at=NOW()
WHERE core_duty IS NULL
   OR core_duty ILIKE '%referral%'
   OR core_duty ILIKE '%public channels%';

ALTER TABLE weave_distribution_assistants
  ADD COLUMN IF NOT EXISTS monthly_food_distribution_target INTEGER NOT NULL DEFAULT 200;
ALTER TABLE weave_distribution_assistants
  ALTER COLUMN monthly_food_distribution_target SET DEFAULT 200;
UPDATE weave_distribution_assistants
  SET monthly_food_distribution_target=200
  WHERE monthly_food_distribution_target<>200;
-- Legacy column retained for older application versions; it no longer governs
-- the food employment target.
ALTER TABLE weave_distribution_assistants ALTER COLUMN monthly_referral_target SET DEFAULT 200;
UPDATE weave_distribution_assistants SET monthly_referral_target=200 WHERE monthly_referral_target<>200;

CREATE TABLE IF NOT EXISTS weave_food_distribution_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  distributor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_type VARCHAR(80) NOT NULL,
  customer_type VARCHAR(20) NOT NULL CHECK (customer_type IN ('consumer','business')),
  recipient_name VARCHAR(120) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 10000),
  evidence_reference TEXT NOT NULL,
  distribution_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  verified_by UUID REFERENCES users(id),
  verification_note TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS weave_food_distribution_manager_month_idx
  ON weave_food_distribution_records(manager_user_id,distribution_date,status);
CREATE INDEX IF NOT EXISTS weave_food_distribution_status_idx
  ON weave_food_distribution_records(status,created_at);

CREATE UNIQUE INDEX IF NOT EXISTS weave_food_distribution_evidence_unique_idx
  ON weave_food_distribution_records(manager_user_id,LOWER(BTRIM(evidence_reference)));
