-- Flame of Hope is a verified-spending promotional food claim, not a System Switch payout.
-- Monday–Sunday claim weeks are determined in Africa/Lagos.
-- This replaces the earlier *unmerged* daily-credit schema.
CREATE TABLE IF NOT EXISTS weave_flame_of_hope_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bridger_id uuid NOT NULL REFERENCES users(id),
  event_key varchar(48) NOT NULL,
  claim_week_start date NOT NULL,
  product_id varchar(32) NOT NULL CHECK(product_id IN ('electrolyte','ember-small')),
  product_price_ngn integer NOT NULL CHECK(product_price_ngn>0),
  required_spend_system_switch numeric(20,6) NOT NULL CHECK(required_spend_system_switch>0),
  actual_spend_system_switch numeric(20,6) NOT NULL CHECK(actual_spend_system_switch>0),
  reference_rate_ngn numeric(20,6) NOT NULL CHECK(reference_rate_ngn>0),
  fulfillment_status varchar(24) NOT NULL DEFAULT 'pending_fulfillment'
    CHECK(fulfillment_status IN ('pending_fulfillment','preparing','fulfilled')),
  fulfillment_reference varchar(240),
  fulfilled_by uuid REFERENCES users(id),
  fulfilled_at timestamptz,
  claimed_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(bridger_id,event_key,claim_week_start)
);
CREATE INDEX IF NOT EXISTS weave_flame_of_hope_fulfillment_idx
 ON weave_flame_of_hope_claims(fulfillment_status,claimed_at DESC);
CREATE TABLE IF NOT EXISTS weave_flame_of_hope_fulfillment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES weave_flame_of_hope_claims(id),
  actor_id uuid NOT NULL REFERENCES users(id),
  from_status varchar(24) NOT NULL,
  to_status varchar(24) NOT NULL,
  fulfillment_reference varchar(240),
  created_at timestamptz NOT NULL DEFAULT NOW()
);
