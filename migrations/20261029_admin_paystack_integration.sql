-- Encrypted Paystack configuration managed from Administration > Paystack Integration Workshop.
-- Secret material is encrypted by the application before it is written to this table.
CREATE TABLE IF NOT EXISTS weave_paystack_integration (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  secret_key_ciphertext text NOT NULL,
  public_origin text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('test','live')),
  verified_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  updated_by uuid
);
