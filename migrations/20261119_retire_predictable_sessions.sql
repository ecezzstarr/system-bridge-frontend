-- Deliberately revoke only the old UUID+timestamp registration tokens.
-- Users reauthenticate with their existing password; accounts and money remain.
DELETE FROM sessions
WHERE token ~* '^ssb_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_[0-9]+$';

CREATE TABLE IF NOT EXISTS weave_auth_attempts (
  scope varchar(64) NOT NULL, subject_hash char(64) NOT NULL,
  attempts integer NOT NULL, reset_at timestamptz NOT NULL,
  PRIMARY KEY(scope, subject_hash)
);
CREATE INDEX IF NOT EXISTS weave_auth_attempts_expiry ON weave_auth_attempts(reset_at);
CREATE TABLE IF NOT EXISTS weave_presence_heartbeats (
  user_id uuid PRIMARY KEY REFERENCES users(id),
  last_credited_at timestamptz NOT NULL DEFAULT NOW(),
  credited boolean NOT NULL DEFAULT false
);
