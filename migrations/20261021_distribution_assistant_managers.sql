-- Six company-wide Assistant Distribution Manager appointments: two per each of three lead managers.
-- Agents and Bridgers apply through Lifestyle; employment only begins on approval.
CREATE TABLE IF NOT EXISTS weave_distribution_assistants (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','ended')),
  application_note TEXT NOT NULL,
  manager_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  monthly_salary_ngn NUMERIC(12,2) NOT NULL DEFAULT 30000,
  monthly_referral_target INTEGER NOT NULL DEFAULT 400,
  hired_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS weave_distribution_assistants_status_idx
  ON weave_distribution_assistants(status,created_at);

-- The 400 target belongs to a Manager's full team, not to each employee.
ALTER TABLE manager_employment ALTER COLUMN probation_target SET DEFAULT 400;
UPDATE manager_employment SET probation_target=400 WHERE probation_target<>400;
ALTER TABLE weave_distribution_assistants ALTER COLUMN monthly_referral_target SET DEFAULT 400;
UPDATE weave_distribution_assistants SET monthly_referral_target=400 WHERE monthly_referral_target<>400;
