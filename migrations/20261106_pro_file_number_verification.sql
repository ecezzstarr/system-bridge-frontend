-- Additive Pro File Number verification ledger. This does not grant access to a
-- private File Folder, expose Siblings Event balances or touch an existing wallet.
-- User-facing proof: File Number + business plan + e-signature. Independent
-- Administration identity verification is required before payment instructions.
CREATE TABLE IF NOT EXISTS pro_file_number_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_number varchar(120) NOT NULL,
  business_name varchar(180) NOT NULL,
  business_plan jsonb NOT NULL,
  signed_name varchar(255) NOT NULL,
  signed_terms_version varchar(64) NOT NULL DEFAULT 'PRO-680-USDT-2026-11',
  terms_accepted_at timestamptz NOT NULL DEFAULT now(),
  access_token_hash char(64) NOT NULL UNIQUE,
  status varchar(40) NOT NULL DEFAULT 'pending_identity'
    CHECK(status IN (
      'pending_identity','payment_required','pending_forensics',
      'payment_rejected','paid_pending_account','active','rejected'
    )),
  identity_reference varchar(255),
  identity_verified_by uuid REFERENCES users(id),
  identity_verified_at timestamptz,
  payment_wallet varchar(64),
  payment_tx_hash char(64) UNIQUE,
  payment_submitted_at timestamptz,
  payment_verified_by uuid REFERENCES users(id),
  payment_verified_at timestamptz,
  payment_verified_amount_usdt numeric(16,2),
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pro_file_number_verifications_file_status
  ON pro_file_number_verifications(file_number,status,created_at DESC);
COMMENT ON TABLE pro_file_number_verifications IS
 'Passwordless Pro File Number intake only. Not Client authentication, proof of receipt or a wallet credit.';
