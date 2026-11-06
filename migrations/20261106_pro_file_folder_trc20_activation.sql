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
