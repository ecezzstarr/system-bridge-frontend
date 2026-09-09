-- Weave Bridge AI / ChatGPT integration
-- The API also creates this table defensively so deployment does not depend on
-- a separate migration runner.

CREATE TABLE IF NOT EXISTS chatgpt_bridge_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(32) UNIQUE NOT NULL,
  source varchar(64) NOT NULL DEFAULT 'chatgpt',
  message text NOT NULL,
  topic varchar(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  opened_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_chatgpt_bridge_sessions_expires_at
  ON chatgpt_bridge_sessions (expires_at);
