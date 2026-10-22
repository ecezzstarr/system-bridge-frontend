-- Distribution Assistant Manager employment compensation revision.
-- Distinct from the two Food Preparation assistants, who already have ₦40,000 terms.
-- This applies to the six Distribution Assistant roles (two under each main Manager).
-- Existing appointments contracted at the previous WEAVE standard receive the new term.
CREATE TABLE IF NOT EXISTS weave_distribution_assistants (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  application_note TEXT NOT NULL,
  manager_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  monthly_salary_ngn NUMERIC(12,2) NOT NULL DEFAULT 40000,
  monthly_referral_target INTEGER NOT NULL DEFAULT 500,
  hired_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE weave_distribution_assistants ALTER COLUMN monthly_salary_ngn SET DEFAULT 40000;
UPDATE weave_distribution_assistants
SET monthly_salary_ngn=40000,updated_at=NOW()
WHERE monthly_salary_ngn=30000;
