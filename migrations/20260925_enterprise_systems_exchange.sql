-- WEAVE Enterprise Systems Exchange
-- Contract-scale software, infrastructure and software+hardware systems.

CREATE TABLE IF NOT EXISTS enterprise_system_catalog (
  system_key varchar(100) PRIMARY KEY,
  name varchar(220) NOT NULL,
  category varchar(100) NOT NULL,
  summary text NOT NULL,
  includes jsonb NOT NULL DEFAULT '[]'::jsonb,
  delivery_model varchar(160) NOT NULL,
  price_gbp numeric(18,2) NOT NULL CHECK (price_gbp >= 1000000),
  published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enterprise_system_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_key varchar(100) NOT NULL REFERENCES enterprise_system_catalog(system_key),
  buyer_user_id uuid NOT NULL,
  buyer_role varchar(40) NOT NULL,
  buyer_name varchar(220),
  buyer_email varchar(255),
  quoted_price_gbp numeric(18,2) NOT NULL CHECK (quoted_price_gbp >= 1000000),
  quoted_flame_coin numeric(30,8),
  gbp_per_flame_coin numeric(30,12),
  rate_source varchar(32),
  status varchar(40) NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested','reviewing','approved','in_contract','building','delivered','declined')),
  acquisition_note text,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enterprise_system_orders_buyer
ON enterprise_system_orders(buyer_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_enterprise_system_orders_status
ON enterprise_system_orders(status, created_at DESC);


ALTER TABLE enterprise_system_orders ADD COLUMN IF NOT EXISTS quoted_flame_coin numeric(30,8);
ALTER TABLE enterprise_system_orders ADD COLUMN IF NOT EXISTS gbp_per_flame_coin numeric(30,12);
ALTER TABLE enterprise_system_orders ADD COLUMN IF NOT EXISTS rate_source varchar(32);
