-- Regional Manager applications are independent of the number of active appointments.
-- No fixed application-count ceiling: Administration reviews applications in paginated batches.
CREATE TABLE IF NOT EXISTS weave_regional_manager_applications (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  source_role VARCHAR(20) NOT NULL CHECK (source_role IN ('client','bridger','agent')),
  region VARCHAR(120) NOT NULL,
  experience TEXT NOT NULL,
  motivation TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','withdrawn')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  review_note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS weave_regional_manager_applications_status_submitted_idx
  ON weave_regional_manager_applications(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS weave_regional_manager_applications_role_submitted_idx
  ON weave_regional_manager_applications(source_role, submitted_at DESC);
