-- Regional Manager appointment overlay and Bridger attribution for File Folder commissions.
-- A Regional Manager can retain Client, Bridger, or Agent as their underlying role.
CREATE TABLE IF NOT EXISTS weave_regional_manager_appointments (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  source_role VARCHAR(20) NOT NULL CHECK (source_role IN ('client','bridger','agent')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','ended')),
  appointed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Each Bridger has at most one active Regional Manager attribution at a time.
CREATE TABLE IF NOT EXISTS weave_regional_manager_bridgers (
  bridger_user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  regional_manager_user_id UUID NOT NULL REFERENCES weave_regional_manager_appointments(user_id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS weave_regional_manager_bridgers_manager_idx
  ON weave_regional_manager_bridgers(regional_manager_user_id,status);
