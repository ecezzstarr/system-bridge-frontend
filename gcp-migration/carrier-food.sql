CREATE TABLE IF NOT EXISTS carrier_food_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code varchar(40) NOT NULL,
  stock_order_id uuid NOT NULL REFERENCES agility_stock_orders(id),
  variant_id varchar(80) NOT NULL,
  quantity_packages integer NOT NULL,
  unit_price_ngn numeric(14,2) NOT NULL,
  total_ngn numeric(14,2) NOT NULL,
  customer_name varchar(180) NOT NULL,
  customer_phone varchar(60) NOT NULL,
  delivery_location text NOT NULL,
  customer_note text,
  status varchar(30) NOT NULL DEFAULT 'requested',
  fulfilled_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CHECK (quantity_packages > 0),
  CHECK (unit_price_ngn > 0),
  CHECK (total_ngn > 0),
  CHECK (status IN ('requested','fulfilled','cancelled'))
);

CREATE INDEX IF NOT EXISTS carrier_food_orders_agent_idx ON carrier_food_orders(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS carrier_food_orders_stock_idx ON carrier_food_orders(stock_order_id, status);
CREATE INDEX IF NOT EXISTS carrier_food_orders_ref_idx ON carrier_food_orders(referral_code, created_at DESC);

CREATE TABLE IF NOT EXISTS carrier_food_visitors (
  agent_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visitor_key varchar(120) NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT NOW(),
  last_seen_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (agent_id, visitor_key)
);

CREATE TABLE IF NOT EXISTS carrier_food_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel varchar(40) NOT NULL DEFAULT 'share',
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS carrier_food_shares_agent_idx ON carrier_food_shares(agent_id, created_at DESC);
