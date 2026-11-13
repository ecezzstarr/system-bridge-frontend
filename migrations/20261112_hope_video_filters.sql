-- Separate, permanent purchase of each Hope live video treatment.
-- No free/unpaid entitlement is inserted by this migration.
CREATE TABLE IF NOT EXISTS weave_hope_video_filter_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bridger_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filter_id varchar(40) NOT NULL,
  price_system_switch numeric(20,8) NOT NULL CHECK(price_system_switch>0),
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(bridger_id,filter_id)
);
CREATE INDEX IF NOT EXISTS idx_weave_hope_filter_purchases_bridger ON weave_hope_video_filter_purchases(bridger_id,purchased_at DESC);
