CREATE TABLE IF NOT EXISTS password_recovery_challenges (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  code_hash VARCHAR(64) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_recovery_user_created
ON password_recovery_challenges(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_password_recovery_email_created
ON password_recovery_challenges(LOWER(email), created_at DESC);
