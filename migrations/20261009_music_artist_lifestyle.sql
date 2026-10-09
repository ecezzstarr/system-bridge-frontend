-- Music Artist is carried by an existing account; it never changes users.role.
CREATE TABLE IF NOT EXISTS music_artists (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  source_role varchar(20) NOT NULL CHECK (source_role IN ('agent','bridger','client')),
  stage_name varchar(80) NOT NULL,
  experience varchar(20) NOT NULL CHECK (experience IN ('upcoming','established')),
  genre varchar(120) NOT NULL,
  sample_url text,
  availability text NOT NULL,
  time_zone varchar(80) NOT NULL DEFAULT 'Africa/Lagos',
  introduction text NOT NULL DEFAULT '',
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','offered','active','rejected','ended')),
  offer_terms text,
  offer_version uuid,
  review_note text,
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  accepted_name text,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS artist_performances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES music_artists(user_id),
  title varchar(120) NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  time_zone varchar(80) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','completed','cancelled','missed')),
  stream_url text,
  started_at timestamptz,
  ended_at timestamptz,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS music_artists_status_idx ON music_artists(status, created_at);
CREATE INDEX IF NOT EXISTS artist_performances_schedule_idx ON artist_performances(starts_at, ends_at) WHERE status IN ('scheduled','live');
CREATE UNIQUE INDEX IF NOT EXISTS artist_performances_one_live_idx ON artist_performances((status)) WHERE status='live';
CREATE INDEX IF NOT EXISTS artist_performances_owner_idx ON artist_performances(artist_id, starts_at);
CREATE TABLE IF NOT EXISTS artist_employment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES music_artists(user_id),
  actor_id uuid NOT NULL REFERENCES users(id),
  event varchar(32) NOT NULL,
  document jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
