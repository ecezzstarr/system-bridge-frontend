-- WEAVE Development Foundry
-- Persistent AI engineering roles and work stream for Administration.

CREATE TABLE IF NOT EXISTS weave_development_agents (
  agent_key varchar(80) PRIMARY KEY,
  name varchar(160) NOT NULL,
  role varchar(200) NOT NULL,
  mandate text NOT NULL,
  cadence_minutes integer NOT NULL DEFAULT 30,
  enabled boolean NOT NULL DEFAULT true,
  last_pulse_at timestamptz,
  next_pulse_at timestamptz NOT NULL DEFAULT NOW(),
  last_summary text,
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weave_development_work (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_key varchar(80) NOT NULL REFERENCES weave_development_agents(agent_key) ON DELETE CASCADE,
  requested_by uuid REFERENCES users(id) ON DELETE SET NULL,
  source varchar(32) NOT NULL DEFAULT 'automatic',
  priority integer NOT NULL DEFAULT 50,
  title varchar(220) NOT NULL,
  brief text NOT NULL,
  target_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
  status varchar(32) NOT NULL DEFAULT 'queued',
  proposal text,
  verification text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  decided_at timestamptz,
  CONSTRAINT weave_development_work_status_check
    CHECK (status IN ('queued','working','proposal','approved','rejected','shipped'))
);

CREATE INDEX IF NOT EXISTS idx_weave_development_work_agent_status
  ON weave_development_work(agent_key,status,created_at DESC);

CREATE INDEX IF NOT EXISTS idx_weave_development_agents_next_pulse
  ON weave_development_agents(enabled,next_pulse_at);
