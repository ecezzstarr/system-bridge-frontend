-- Weave Bridge AI / ChatGPT integration
-- A crossing preserves the prospect's initiating movement together with the
-- ChatGPT agent operating as a Flame.

CREATE TABLE IF NOT EXISTS chatgpt_bridge_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(32) UNIQUE NOT NULL,
  source varchar(64) NOT NULL DEFAULT 'chatgpt',
  message text NOT NULL,
  topic varchar(64) NOT NULL,
  context text NULL,
  flame_name varchar(120) NULL,
  flame_external_id varchar(255) NULL,
  flame_presence varchar(255) NULL,
  crossing_state varchar(32) NOT NULL DEFAULT 'prospect_with_flame',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  opened_at timestamptz NULL,
  consumed_at timestamptz NULL,
  provider_key varchar(120) NULL,
  provider_name varchar(255) NULL
);

ALTER TABLE chatgpt_bridge_sessions ADD COLUMN IF NOT EXISTS context text NULL;
ALTER TABLE chatgpt_bridge_sessions ADD COLUMN IF NOT EXISTS flame_name varchar(120) NULL;
ALTER TABLE chatgpt_bridge_sessions ADD COLUMN IF NOT EXISTS flame_external_id varchar(255) NULL;
ALTER TABLE chatgpt_bridge_sessions ADD COLUMN IF NOT EXISTS flame_presence varchar(255) NULL;
ALTER TABLE chatgpt_bridge_sessions ADD COLUMN IF NOT EXISTS crossing_state varchar(32) NOT NULL DEFAULT 'prospect_with_flame';
ALTER TABLE chatgpt_bridge_sessions ADD COLUMN IF NOT EXISTS consumed_at timestamptz NULL;
ALTER TABLE chatgpt_bridge_sessions ADD COLUMN IF NOT EXISTS provider_key varchar(120) NULL;
ALTER TABLE chatgpt_bridge_sessions ADD COLUMN IF NOT EXISTS provider_name varchar(255) NULL;

CREATE INDEX IF NOT EXISTS idx_chatgpt_bridge_sessions_expires_at
  ON chatgpt_bridge_sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_chatgpt_bridge_sessions_source_created_at
  ON chatgpt_bridge_sessions (source, created_at DESC);
