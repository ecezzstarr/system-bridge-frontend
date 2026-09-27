-- Administration-controlled WEAVE environment runtime.
-- Loading/settling and presence ambience can be tuned live without a Cloud Run deployment.

CREATE TABLE IF NOT EXISTS weave_environment_runtime_profiles (
  profile_key varchar(120) PRIMARY KEY,
  config jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

INSERT INTO weave_environment_runtime_profiles(profile_key,config,version)
VALUES(
  'default',
  '{
    "loading": {
      "bootMinMs": 3600,
      "transitMinMs": 900,
      "settleQuietMs": 420,
      "maxWaitMs": 8000,
      "waitForFonts": true,
      "waitForImages": true
    },
    "ambience": {
      "enabled": true,
      "idleGain": 0.024,
      "musicGain": 0.010,
      "voiceGain": 0.005,
      "footstepMinMs": 4200,
      "footstepMaxMs": 9800,
      "bellMinMs": 24000,
      "bellMaxMs": 50000,
      "movementMinMs": 8000,
      "movementMaxMs": 21000
    }
  }'::jsonb,
  1
)
ON CONFLICT(profile_key) DO NOTHING;
