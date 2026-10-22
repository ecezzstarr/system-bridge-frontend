-- WEAVE Distribution Manager: signature submits for Administration verification.
-- Never reset existing verified managers' probation clocks.
ALTER TABLE manager_employment ALTER COLUMN status TYPE VARCHAR(24);
ALTER TABLE manager_employment ALTER COLUMN status SET DEFAULT 'pending_verification';
ALTER TABLE manager_employment ALTER COLUMN probation_started_at DROP NOT NULL;
ALTER TABLE manager_employment ALTER COLUMN probation_ends_at DROP NOT NULL;
ALTER TABLE manager_employment ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id);
ALTER TABLE manager_employment ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE manager_employment ADD COLUMN IF NOT EXISTS verification_note TEXT;
CREATE INDEX IF NOT EXISTS manager_employment_verification_queue_idx
  ON manager_employment(status,document_accepted_at DESC);

-- Team messages and task reports are written only by verified active team members.
-- Administration can inspect the same immutable-attribution stream, but cannot
-- send, revise, or delete the team’s operational messages.
CREATE TABLE IF NOT EXISTS weave_distribution_team_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('message','plan','progress','handoff')),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 2 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS weave_distribution_team_updates_feed_idx
 ON weave_distribution_team_updates(manager_user_id,created_at DESC);
