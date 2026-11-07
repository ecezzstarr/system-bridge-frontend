-- One Pro Regional Manager File Folder per approved Agent/Bridger.
-- The original account remains Agent/Stability or Bridger/Hope.
-- Payments and staff salary are separate ledgers; only independently verified
-- 680 USDT TRC-20 activation enables the private Pro File Folder.
CREATE TABLE IF NOT EXISTS weave_pro_regional_manager_activations (
 user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 file_number varchar(120) NOT NULL UNIQUE,
 source_role varchar(20) NOT NULL CHECK(source_role IN ('bridger','agent')),
 status varchar(40) NOT NULL DEFAULT 'awaiting_signature'
  CHECK(status IN ('awaiting_signature','payment_required','pending_forensics','payment_rejected','active')),
 signed_name varchar(255),
 signed_at timestamptz,
 terms_version varchar(80),
 payment_wallet varchar(64),
 payment_tx_hash char(64) UNIQUE,
 payment_submitted_at timestamptz,
 payment_verified_at timestamptz,
 verified_amount_usdt numeric(16,2),
 verified_by uuid REFERENCES users(id),
 verified_evidence_reference varchar(255),
 rejection_reason text,
 activated_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT NOW(),
 updated_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS weave_pro_manager_activation_status_time
 ON weave_pro_regional_manager_activations(status,created_at DESC);
CREATE TABLE IF NOT EXISTS weave_pro_regional_manager_work (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES weave_pro_regional_manager_activations(user_id) ON DELETE CASCADE,
 source_role varchar(20) NOT NULL CHECK(source_role IN ('bridger','agent')),
 activity_type varchar(36) NOT NULL
  CHECK(activity_type IN ('business_contact','partnership','department_operation','customer_service','follow_up','company_report')),
 title varchar(180) NOT NULL,
 organization varchar(180),
 details text,
 next_action text,
 status varchar(20) NOT NULL DEFAULT 'planned'
  CHECK(status IN ('planned','in_progress','completed','blocked')),
 completed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT NOW(),
 updated_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS weave_pro_manager_work_user_time
 ON weave_pro_regional_manager_work(user_id,created_at DESC);
