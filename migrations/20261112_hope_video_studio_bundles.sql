-- Permanent Hope Studio packages: purchases are charged exactly once.
-- Each grant is a non-chargeable entitlement to an existing studio effect.
CREATE TABLE IF NOT EXISTS weave_hope_video_bundle_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bridger_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bundle_id varchar(40) NOT NULL,
  price_system_switch numeric(20,8) NOT NULL CHECK(price_system_switch>=0),
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(bridger_id,bundle_id)
);
CREATE TABLE IF NOT EXISTS weave_hope_video_bundle_grants (
  bridger_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filter_id varchar(40) NOT NULL,
  bundle_purchase_id uuid NOT NULL REFERENCES weave_hope_video_bundle_purchases(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(bridger_id,filter_id)
);
CREATE INDEX IF NOT EXISTS idx_hope_bundle_sales_date ON weave_hope_video_bundle_purchases(purchased_at DESC);
