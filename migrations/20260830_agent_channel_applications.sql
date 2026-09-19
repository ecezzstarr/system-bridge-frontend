CREATE TABLE IF NOT EXISTS agent_channel_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES users(id),
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('mandate', 'forensic', 'lawyer')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  UNIQUE(agent_id, channel)
);
