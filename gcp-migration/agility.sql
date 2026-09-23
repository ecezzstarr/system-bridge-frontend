-- WEAVE Agility production schema
-- Safe to run before the first Agility production deployment.

CREATE TABLE IF NOT EXISTS agility_stock_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES users(id),
  variant_id varchar(80) NOT NULL,
  distribution_mode varchar(40) NOT NULL DEFAULT 'retailer',
  box_count integer NOT NULL,
  packages_per_box integer NOT NULL,
  package_count integer NOT NULL,
  unit_price_ngn numeric(14,2),
  box_price_ngn numeric(14,2),
  retail_unit_price_ngn numeric(14,2) NOT NULL,
  retail_box_value_ngn numeric(14,2) NOT NULL,
  agent_box_price_ngn numeric(14,2) NOT NULL,
  agent_unit_cost_ngn numeric(14,2) NOT NULL,
  total_ngn numeric(14,2) NOT NULL,
  agent_expected_gross_profit_ngn numeric(14,2) NOT NULL,
  planned_company_cost_per_box_ngn numeric(14,2),
  planned_company_total_cost_ngn numeric(14,2),
  planned_company_gross_profit_ngn numeric(14,2),
  actual_company_cost_per_box_ngn numeric(14,2),
  actual_company_total_cost_ngn numeric(14,2),
  actual_company_gross_profit_ngn numeric(14,2),
  payment_reference varchar(255) UNIQUE NOT NULL,
  payment_method varchar(40) NOT NULL DEFAULT 'OPay',
  opay_account_number varchar(40) NOT NULL,
  opay_receipt_data text,
  opay_proof_hash varchar(64),
  payment_status varchar(40) NOT NULL DEFAULT 'pending',
  payment_verified_by uuid REFERENCES users(id),
  proof_submitted_at timestamptz,
  payment_verified_at timestamptz,
  fulfillment_status varchar(40) NOT NULL DEFAULT 'awaiting_payment',
  delivery_address text,
  delivery_phone varchar(40),
  agent_note text,
  admin_note text,
  paid_at timestamptz,
  heated_at timestamptz,
  packed_at timestamptz,
  boxed_at timestamptz,
  dispatched_at timestamptz,
  delivered_at timestamptz,
  received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CHECK (distribution_mode IN ('wholesaler','retailer')),
  CHECK (box_count > 0),
  CHECK (packages_per_box > 0),
  CHECK (package_count > 0),
  CHECK (total_ngn > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agility_orders_opay_proof
  ON agility_stock_orders(opay_proof_hash)
  WHERE opay_proof_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agility_orders_agent
  ON agility_stock_orders(agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agility_orders_payment
  ON agility_stock_orders(payment_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agility_orders_fulfillment
  ON agility_stock_orders(fulfillment_status, created_at DESC);

CREATE TABLE IF NOT EXISTS agility_agent_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES agility_stock_orders(id),
  agent_id uuid NOT NULL REFERENCES users(id),
  quantity_packages integer NOT NULL,
  sale_mode varchar(40) NOT NULL DEFAULT 'retail_package',
  box_quantity integer NOT NULL DEFAULT 0,
  unit_price_ngn numeric(14,2),
  total_ngn numeric(14,2),
  retail_unit_price_ngn numeric(14,2) NOT NULL,
  agent_unit_cost_ngn numeric(14,2) NOT NULL,
  total_revenue_ngn numeric(14,2) NOT NULL,
  agent_gross_profit_ngn numeric(14,2) NOT NULL,
  sold_at timestamptz NOT NULL DEFAULT NOW(),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CHECK (quantity_packages > 0),
  CHECK (box_quantity >= 0),
  CHECK (sale_mode IN ('retail_package','wholesale_box'))
);

CREATE INDEX IF NOT EXISTS idx_agility_sales_order
  ON agility_agent_sales(order_id, sold_at DESC);

CREATE INDEX IF NOT EXISTS idx_agility_sales_agent
  ON agility_agent_sales(agent_id, sold_at DESC);
