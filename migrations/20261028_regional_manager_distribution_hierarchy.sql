-- Regional Manager distribution hierarchy: up to ten lead Distribution Managers per Regional Manager.
-- Lead appointments remain independent of Regional Manager assignment and can begin with one lead and two assistants.
CREATE TABLE IF NOT EXISTS weave_regional_manager_distribution_managers (
  distribution_manager_user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  regional_manager_user_id UUID NOT NULL REFERENCES weave_regional_manager_appointments(user_id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS weave_regional_manager_distribution_managers_manager_idx
  ON weave_regional_manager_distribution_managers(regional_manager_user_id,status);
