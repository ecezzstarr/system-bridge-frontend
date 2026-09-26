-- Administration Visual Systems Workshop
-- One deployed control plane; subsequent visual publications are database-backed.
CREATE TABLE IF NOT EXISTS weave_visual_profiles (
  profile_key varchar(120) PRIMARY KEY,
  draft_config jsonb NOT NULL,
  published_config jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  updated_by uuid,
  published_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  published_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weave_visual_profile_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_key varchar(120) NOT NULL,
  version integer NOT NULL CHECK (version >= 1),
  config jsonb NOT NULL,
  action varchar(32) NOT NULL DEFAULT 'publish',
  published_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(profile_key, version)
);

CREATE INDEX IF NOT EXISTS weave_visual_history_profile_idx
  ON weave_visual_profile_history(profile_key, version DESC);
