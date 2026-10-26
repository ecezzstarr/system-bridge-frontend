-- Child-support transfer orders. These are instructions and audit records, not bank transfers.
-- A completed transfer requires an independently verified external receipt.
CREATE TABLE IF NOT EXISTS weave_child_support_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES users(id),
  requester_role varchar(16) NOT NULL CHECK (requester_role IN ('admin','client','agent','bridger')),
  period_month varchar(7) NOT NULL CHECK (period_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  amount_ngn numeric(14,2) NOT NULL CHECK (amount_ngn > 0),
  source_reference varchar(160) NOT NULL,
  recipient_account_name varchar(160) NOT NULL,
  recipient_bank varchar(120) NOT NULL,
  recipient_account_number varchar(20) NOT NULL,
  note varchar(800) NOT NULL DEFAULT '',
  status varchar(20) NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','funds_verified','transferred','rejected')),
  verification_reference varchar(160),
  transfer_reference varchar(160),
  review_note varchar(800),
  verified_by uuid REFERENCES users(id),
  verified_at timestamptz,
  transferred_by uuid REFERENCES users(id),
  transferred_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(requester_id,source_reference),
  CHECK (status <> 'funds_verified' OR verification_reference IS NOT NULL),
  CHECK (status <> 'transferred' OR (verification_reference IS NOT NULL AND transfer_reference IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS weave_child_support_queue_idx
  ON weave_child_support_orders(status,created_at DESC);
CREATE INDEX IF NOT EXISTS weave_child_support_requester_idx
  ON weave_child_support_orders(requester_id,created_at DESC);
