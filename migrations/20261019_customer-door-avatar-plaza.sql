-- Client controls publication of their public File Folder Customer Door worlds.
ALTER TABLE client_business_stores ADD COLUMN IF NOT EXISTS world_host_flame_event boolean NOT NULL DEFAULT false;
ALTER TABLE client_business_stores ADD COLUMN IF NOT EXISTS world_host_customer_market boolean NOT NULL DEFAULT false;
-- Live multiplayer has a short, server-verified 30-second occupancy window;
-- no attendance records are used as proof of financial work or compensation.
CREATE TABLE IF NOT EXISTS weave_world_presence_sessions (
 room varchar(250) NOT NULL,participant_key varchar(130) NOT NULL,
 label varchar(90) NOT NULL,participant_role varchar(20) NOT NULL,
 x numeric(8,3) NOT NULL DEFAULT 0,z numeric(8,3) NOT NULL DEFAULT 3,
 yaw numeric(8,4) NOT NULL DEFAULT 0,seen_at timestamptz NOT NULL DEFAULT NOW(),
 PRIMARY KEY(room,participant_key)
);
CREATE INDEX IF NOT EXISTS weave_world_presence_room_idx
 ON weave_world_presence_sessions(room,seen_at DESC);
