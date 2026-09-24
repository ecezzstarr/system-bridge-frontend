-- Department Entry Ticket Center
-- Visitors seeking Agent or Bridger entry receive a 3 Flame Coin ticket.
-- The Naira quote uses the current TRX/NGN value because 1 Flame Coin = 1 TRX.
-- A one-use departmental code is issued only after Administration verifies payment.

CREATE TABLE IF NOT EXISTS departmental_entry_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(48) UNIQUE NOT NULL,
  access_token_hash VARCHAR(128) UNIQUE NOT NULL,
  department VARCHAR(20) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'PRESENTED',
  price_flame_coin NUMERIC(30,8) NOT NULL DEFAULT 3,
  trx_ngn_rate NUMERIC(30,8) NOT NULL,
  amount_ngn NUMERIC(30,2) NOT NULL,
  opay_account_number VARCHAR(32) NOT NULL,
  payer_name VARCHAR(255),
  payer_email VARCHAR(255),
  payer_phone VARCHAR(80),
  payment_reference VARCHAR(255) UNIQUE,
  payment_submitted_at TIMESTAMPTZ,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  rejected_reason TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_department_entry_tickets_status
  ON departmental_entry_tickets(status);
CREATE INDEX IF NOT EXISTS idx_department_entry_tickets_department
  ON departmental_entry_tickets(department);
CREATE INDEX IF NOT EXISTS idx_department_entry_tickets_created_at
  ON departmental_entry_tickets(created_at DESC);


ALTER TABLE departmental_codes
  ADD COLUMN IF NOT EXISTS registration_request_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_departmental_codes_registration_request
  ON departmental_codes(registration_request_id)
  WHERE registration_request_id IS NOT NULL;
