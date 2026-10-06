-- WEAVE Manager employment overlay for existing Agent/Bridger identities.
-- Manager is an employment position, not a fifth WEAVE role.
CREATE TABLE IF NOT EXISTS manager_employment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  source_role VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'probation',
  document_version INTEGER NOT NULL DEFAULT 1,
  accepted_name TEXT,
  document_accepted_at TIMESTAMPTZ NOT NULL,
  probation_started_at TIMESTAMPTZ NOT NULL,
  probation_ends_at TIMESTAMPTZ NOT NULL,
  monthly_salary_ngn NUMERIC(12,2) NOT NULL DEFAULT 150000,
  probation_target INTEGER NOT NULL DEFAULT 300,
  core_duty TEXT NOT NULL DEFAULT 'Market WEAVE to prospective Agents and Bridgers and carry verified referral movement.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

ALTER TABLE manager_employment ADD COLUMN IF NOT EXISTS accepted_name TEXT;

CREATE INDEX IF NOT EXISTS manager_employment_status_idx
  ON manager_employment(status, probation_ends_at);
