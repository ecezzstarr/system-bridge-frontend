-- Bridger Number Bay country catalog + 30-minute Administration fulfillment.
-- Keeps provider acquisition details internal while allowing country-first purchase/order movement.

CREATE TABLE IF NOT EXISTS bridger_number_country_offers (
  country varchar(100) PRIMARY KEY,
  price_flame_coin numeric(30,8) NOT NULL CHECK (price_flame_coin > 0),
  enabled boolean NOT NULL DEFAULT true,
  delivery_minutes integer NOT NULL DEFAULT 30 CHECK (delivery_minutes BETWEEN 5 AND 30),
  updated_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

INSERT INTO bridger_number_country_offers(country,price_flame_coin,enabled,delivery_minutes)
SELECT country,MAX(price_flame_coin),true,30
FROM bridger_whatsapp_numbers
WHERE country IS NOT NULL
  AND country<>''
  AND price_flame_coin>0
GROUP BY country
ON CONFLICT (country) DO NOTHING;

CREATE TABLE IF NOT EXISTS bridger_number_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bridger_id uuid NOT NULL REFERENCES users(id),
  country varchar(100) NOT NULL,
  price_flame_coin numeric(30,8) NOT NULL CHECK (price_flame_coin > 0),
  status varchar(24) NOT NULL DEFAULT 'requested',
  deadline_at timestamptz NOT NULL DEFAULT (NOW() + interval '30 minutes'),
  number_id uuid REFERENCES bridger_whatsapp_numbers(id),
  admin_message text,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bridger_number_orders_owner
ON bridger_number_orders(bridger_id,created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bridger_number_orders_admin
ON bridger_number_orders(status,deadline_at ASC);
