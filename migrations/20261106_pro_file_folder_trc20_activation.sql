-- One-time 680 USDT PRO File Folder activation, signed agreement and Forensics receipt.
-- Safe additions only: no existing Client accounts, File Folders, staff workspaces,
-- historic loans, deposits, wallet balances or receipts are edited.
-- Existing Pro clients are not retroactively enrolled by this migration.
CREATE TABLE IF NOT EXISTS pro_file_folder_activations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 client_id uuid NOT NULL UNIQUE REFERENCES users(id),
 file_number varchar(120) NOT NULL UNIQUE,
 status varchar(36) NOT NULL DEFAULT 'awaiting_signature'
  CHECK (status IN ('awaiting_signature','business_plan_required','payment_required',
                   'pending_forensics','rejected','active')),
 client_signature_name varchar(255),
 client_signature_at timestamptz,
 client_terms_version varchar(40),
 signed_agreement_reference varchar(255),
 signed_agreement_verified_at timestamptz,
 signed_agreement_verified_by uuid REFERENCES users(id),
 business_plan jsonb,
 business_plan_submitted_at timestamptz,
 wallet_address varchar(64),
 payment_tx_hash char(64) UNIQUE,
 payment_submitted_at timestamptz,
 rejection_reason text,
 verified_amount_usdt numeric(16,2),
 verified_by uuid REFERENCES users(id),
 verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 activated_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE pro_file_folder_activations ADD COLUMN IF NOT EXISTS client_signature_name varchar(255);
ALTER TABLE pro_file_folder_activations ADD COLUMN IF NOT EXISTS client_signature_at timestamptz;
ALTER TABLE pro_file_folder_activations ADD COLUMN IF NOT EXISTS client_terms_version varchar(40);
CREATE TABLE IF NOT EXISTS pro_activation_wallet_config (
 id int PRIMARY KEY CHECK(id=1),
 wallet_address varchar(64) NOT NULL,
 updated_by uuid NOT NULL REFERENCES users(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS pro_activation_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 activation_id uuid NOT NULL REFERENCES pro_file_folder_activations(id),
 action varchar(80) NOT NULL,
 actor_id uuid NOT NULL REFERENCES users(id),
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE pro_file_folder_activations IS
 'Client-owned one-time 680 USDT Pro activation; not a personal loan or wallet credit.';
COMMENT ON COLUMN pro_file_folder_activations.payment_tx_hash IS
 'TRON TRC-20 USDT payment reference; unique, never proof of payment without Forensics review.';

-- Reported Siblings Event Mandate earnings are NOT a credit, deposit or available balance.
CREATE TABLE IF NOT EXISTS client_siblings_event_claims (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 client_id uuid NOT NULL UNIQUE REFERENCES users(id),
 file_number varchar(120) NOT NULL UNIQUE,
 event_name varchar(64) NOT NULL DEFAULT 'Siblings Event',
 reported_amount_usdt numeric(16,2) NOT NULL DEFAULT 0 CHECK(reported_amount_usdt>=0),
 verified_amount_usdt numeric(16,2) NOT NULL DEFAULT 0 CHECK(verified_amount_usdt>=0),
 status varchar(36) NOT NULL DEFAULT 'pending_mandate_verification'
  CHECK(status IN ('pending_mandate_verification','mandate_verified','disputed')),
 source varchar(80) NOT NULL DEFAULT 'administration_report',
 mandate_evidence_reference varchar(255),
 verified_by uuid REFERENCES users(id),
 verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE client_siblings_event_claims IS
 'Unverified Siblings Event reported claims; may never be treated as settled withdrawable Client funds.';
