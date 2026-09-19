CREATE TABLE IF NOT EXISTS terms_acceptances (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role VARCHAR(20) NOT NULL,
  terms_version VARCHAR(20) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_terms_acceptances_user_role
  ON terms_acceptances (user_id, role, accepted_at DESC);
