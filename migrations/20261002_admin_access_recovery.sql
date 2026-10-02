-- WEAVE Administration Access Recovery
-- One-time Administration-issued recovery grants. Codes are never stored in plaintext.

CREATE TABLE IF NOT EXISTS admin_access_recovery_grants (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  issued_by UUID NOT NULL REFERENCES users(id),
  email VARCHAR(255) NOT NULL,
  code_hash VARCHAR(64) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_access_recovery_user
  ON admin_access_recovery_grants(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_access_recovery_admin
  ON admin_access_recovery_grants(issued_by,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_access_recovery_email
  ON admin_access_recovery_grants(LOWER(email),created_at DESC);
