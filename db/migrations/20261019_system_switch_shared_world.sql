-- Ephemeral public-world presence; no Client records, balances or authority are copied here.
CREATE TABLE IF NOT EXISTS system_switch_presence (
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 connection_id uuid NOT NULL,
 avatar_id uuid NOT NULL DEFAULT gen_random_uuid(),
 x double precision NOT NULL DEFAULT 0,
 z double precision NOT NULL DEFAULT 8.2,
 yaw double precision NOT NULL DEFAULT 0,
 heading double precision NOT NULL DEFAULT 0,
 sequence bigint NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT NOW(),
 PRIMARY KEY(user_id,connection_id)
);
CREATE INDEX IF NOT EXISTS system_switch_presence_updated ON system_switch_presence(updated_at);
ALTER TABLE client_stream_channels ADD COLUMN IF NOT EXISTS live_medium varchar(16) NOT NULL DEFAULT 'stream';
ALTER TABLE client_stream_programs ADD COLUMN IF NOT EXISTS broadcast_medium varchar(16) NOT NULL DEFAULT 'stream';
