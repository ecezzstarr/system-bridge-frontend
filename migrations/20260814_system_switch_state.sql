CREATE TABLE IF NOT EXISTS system_switch_state (
  session_id UUID PRIMARY KEY,
  file_number TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  days_active INTEGER NOT NULL DEFAULT 0,

  business_concept JSONB NOT NULL DEFAULT '{}'::jsonb,
  story_state JSONB NOT NULL DEFAULT '{}'::jsonb,

  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  decisions JSONB NOT NULL DEFAULT '[]'::jsonb,
  milestones JSONB NOT NULL DEFAULT '[]'::jsonb,

  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'awaiting_recognition', 'recognized')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_switch_active
ON system_switch_state(status, last_active_at);

CREATE INDEX IF NOT EXISTS idx_system_switch_file
ON system_switch_state(file_number);
