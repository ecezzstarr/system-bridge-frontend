-- DJ Workshop / institutional live broadcast
-- Makes the live player deployable on a fresh or partially migrated database.

CREATE TABLE IF NOT EXISTS dj_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255),
  file_url TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  track_type VARCHAR(32) NOT NULL DEFAULT 'music',
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT dj_tracks_type_check CHECK (track_type IN ('music','voice','announcement'))
);

CREATE TABLE IF NOT EXISTS dj_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dj_playlist_tracks (
  playlist_id UUID NOT NULL,
  track_id UUID NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (playlist_id, track_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dj_playlist_position
  ON dj_playlist_tracks(playlist_id, position);

CREATE TABLE IF NOT EXISTS dj_broadcast_state (
  id INTEGER PRIMARY KEY,
  is_live BOOLEAN NOT NULL DEFAULT false,
  playlist_id UUID,
  current_track_id UUID,
  track_started_at TIMESTAMPTZ,
  announcement_text TEXT,
  manual_stop_event_key VARCHAR(120),
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE dj_broadcast_state
  ADD COLUMN IF NOT EXISTS manual_stop_event_key VARCHAR(120);

INSERT INTO dj_broadcast_state (id, is_live)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;
