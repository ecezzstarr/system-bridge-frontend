-- Bridge File Folder purchase deposits
CREATE TABLE IF NOT EXISTS bridge_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  bridge_id UUID NOT NULL REFERENCES bridge_ais(id),
  bridger_id UUID REFERENCES users(id),

  session_id UUID,
  prospect_name TEXT NOT NULL,
  prospect_phone TEXT NOT NULL,

  tier_trx NUMERIC(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),

  tx_hash TEXT,
  company_wallet TEXT NOT NULL,

  file_number VARCHAR(50) REFERENCES file_folders(file_number),

  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bridge_deposits_status
  ON bridge_deposits(status);

CREATE INDEX IF NOT EXISTS idx_bridge_deposits_bridge
  ON bridge_deposits(bridge_id);

CREATE INDEX IF NOT EXISTS idx_bridge_deposits_session
  ON bridge_deposits(session_id);

CREATE INDEX IF NOT EXISTS idx_bridge_deposits_file_number
  ON bridge_deposits(file_number);

-- Make the File Folder price authoritative in the database.
CREATE TABLE IF NOT EXISTS file_folder_pricing (
  id INTEGER PRIMARY KEY DEFAULT 1,
  price_trx NUMERIC(12,2) NOT NULL,
  company_wallet TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT file_folder_pricing_single_row CHECK (id = 1)
);

INSERT INTO file_folder_pricing (
  id,
  price_trx,
  company_wallet
)
VALUES (
  1,
  35800,
  'THGBvmPt3XEb8mbSRXViA93GkW3PpCanJk'
)
ON CONFLICT (id) DO UPDATE
SET
  price_trx = EXCLUDED.price_trx,
  company_wallet = EXCLUDED.company_wallet,
  updated_at = now();
