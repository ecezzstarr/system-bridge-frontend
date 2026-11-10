-- Company of Time · offline branding business formation and advertising records.
-- Actual customer cash, physical manufacturing, and social reach are not inferred.
-- The authenticated API creates the same tables defensively on hosts which have
-- not yet applied this additive migration.

CREATE TABLE IF NOT EXISTS weave_branding_launch_plans(
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role varchar(16) NOT NULL CHECK(role IN ('agent','bridger','client')),
  kit_id varchar(32) NOT NULL,
  business_name varchar(100) NOT NULL,
  offer_text varchar(260) NOT NULL,
  audience varchar(150) NOT NULL,
  customer_quote_ngn numeric(20,2) CHECK(customer_quote_ngn>=0 AND customer_quote_ngn<=100000000),
  daily_outreach_goal integer NOT NULL DEFAULT 2 CHECK(daily_outreach_goal BETWEEN 1 AND 30),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS weave_branding_ad_campaigns(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_key uuid NOT NULL,
  kit_id varchar(32) NOT NULL,
  sample_id varchar(80) NOT NULL,
  channel varchar(40) NOT NULL,
  headline varchar(110) NOT NULL,
  message text NOT NULL,
  customer_door text,
  status varchar(24) NOT NULL DEFAULT 'prepared'
    CHECK(status IN ('prepared','reported_shared')),
  external_post_url varchar(500),
  created_at timestamptz NOT NULL DEFAULT now(),
  reported_shared_at timestamptz,
  UNIQUE(user_id,client_key)
);
CREATE INDEX IF NOT EXISTS weave_branding_campaigns_user_idx
  ON weave_branding_ad_campaigns(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS weave_branding_template_features(
  sample_id varchar(80) PRIMARY KEY,
  featured boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
