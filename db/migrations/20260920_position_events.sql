-- Weave events are bounded periods inside continuing Interaction in Motion.
-- One event is shared in time but resolves differently for each participant position.
CREATE TABLE IF NOT EXISTS weave_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key varchar(120) NOT NULL UNIQUE,
  title varchar(255) NOT NULL,
  subtitle text,
  loop_number integer NOT NULL DEFAULT 1,
  status varchar(32) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','closed')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  announcement text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS weave_event_position_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES weave_events(id) ON DELETE CASCADE,
  role varchar(32) NOT NULL CHECK (role IN ('client','bridger','agent')),
  activity_key varchar(120) NOT NULL,
  title varchar(255) NOT NULL,
  description text,
  opens_at timestamptz,
  closes_at timestamptz,
  status varchar(32) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','closed')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, role, activity_key)
);

CREATE TABLE IF NOT EXISTS weave_event_participant_movement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES weave_events(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL,
  role varchar(32) NOT NULL CHECK (role IN ('client','bridger','agent')),
  activity_key varchar(120),
  movement_type varchar(120) NOT NULL,
  subject_type varchar(120),
  subject_id varchar(255),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weave_event_movement_event_role_time
  ON weave_event_participant_movement(event_id, role, occurred_at DESC);

COMMENT ON TABLE weave_events IS 'Bounded event seasons inside Loop One / Interaction in Motion.';
COMMENT ON TABLE weave_event_position_activity IS 'Role-specific activities: the same event resolves personally by participant position.';
COMMENT ON TABLE weave_event_participant_movement IS 'Actual participant movement recorded during an event; not artificial game missions.';
