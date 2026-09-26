CREATE TABLE IF NOT EXISTS bridger_whatsapp_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 varchar(32) NOT NULL UNIQUE,
  country varchar(100) NOT NULL,
  provider varchar(160),
  provider_reference varchar(220),
  price_flame_coin numeric(30,8) NOT NULL CHECK (price_flame_coin >= 0),
  status varchar(32) NOT NULL DEFAULT 'available',
  assigned_to uuid REFERENCES users(id),
  assigned_at timestamptz,
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bridger_whatsapp_numbers_status ON bridger_whatsapp_numbers(status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bridger_whatsapp_numbers_owner ON bridger_whatsapp_numbers(assigned_to,assigned_at DESC);
