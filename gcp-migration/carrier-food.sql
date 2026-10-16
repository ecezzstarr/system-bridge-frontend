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
  status varchar(40) NOT NULL DEFAULT 'awaiting_customer_payment',
  payment_method varchar(40) NOT NULL DEFAULT 'OPay',
  payment_account_number varchar(40) NOT NULL DEFAULT '8136003459',
  payment_reference varchar(255),
  opay_transaction_reference varchar(255),
  payment_status varchar(40) NOT NULL DEFAULT 'awaiting_payment',
  payment_expires_at timestamptz,
  payment_proof_submitted_at timestamptz,
  payment_verified_by uuid REFERENCES users(id),
  payment_verified_at timestamptz,
  payment_rejected_at timestamptz,
  payment_admin_note text,
  fulfilled_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CHECK (quantity_packages > 0),
  CHECK (unit_price_ngn > 0),
  CHECK (total_ngn > 0),
  CHECK (status IN ('awaiting_customer_payment','awaiting_payment_verification','requested','fulfilled','cancelled')),
  CHECK (payment_status IN ('awaiting_payment','proof_submitted','paid','rejected'))
);

ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_method varchar(40) NOT NULL DEFAULT 'OPay';
ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_account_number varchar(40) NOT NULL DEFAULT '8136003459';
ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_reference varchar(255);
ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS opay_transaction_reference varchar(255);
ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_status varchar(40) NOT NULL DEFAULT 'paid';
ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_expires_at timestamptz;
ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_proof_submitted_at timestamptz;
ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_verified_by uuid REFERENCES users(id);
ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz;
ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_rejected_at timestamptz;
ALTER TABLE carrier_food_orders ADD COLUMN IF NOT EXISTS payment_admin_note text;

ALTER TABLE carrier_food_orders DROP CONSTRAINT IF EXISTS carrier_food_orders_status_check;
ALTER TABLE carrier_food_orders
  ADD CONSTRAINT carrier_food_orders_status_check
  CHECK (status IN ('awaiting_customer_payment','awaiting_payment_verification','requested','fulfilled','cancelled'));
ALTER TABLE carrier_food_orders DROP CONSTRAINT IF EXISTS carrier_food_orders_payment_status_check;
ALTER TABLE carrier_food_orders
  ADD CONSTRAINT carrier_food_orders_payment_status_check
  CHECK (payment_status IN ('awaiting_payment','proof_submitted','paid','rejected'));

CREATE INDEX IF NOT EXISTS carrier_food_orders_agent_idx ON carrier_food_orders(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS carrier_food_orders_stock_idx ON carrier_food_orders(stock_order_id, status);
CREATE INDEX IF NOT EXISTS carrier_food_orders_ref_idx ON carrier_food_orders(referral_code, created_at DESC);
CREATE INDEX IF NOT EXISTS carrier_food_orders_payment_status_idx ON carrier_food_orders(payment_status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS carrier_food_orders_payment_ref_uidx ON carrier_food_orders(payment_reference) WHERE payment_reference IS NOT NULL;

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
