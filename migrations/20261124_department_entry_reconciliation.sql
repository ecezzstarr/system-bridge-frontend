ALTER TABLE departmental_entry_tickets
  ADD COLUMN IF NOT EXISTS reconciliation_original_reference VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reconciliation_credit_ngn NUMERIC(30,2),
  ADD COLUMN IF NOT EXISTS reconciliation_original_quote JSONB,
  ADD COLUMN IF NOT EXISTS reconciliation_authorized_by UUID,
  ADD COLUMN IF NOT EXISTS reconciliation_authorized_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_entry_reconciliation_original_reference
  ON departmental_entry_tickets(reconciliation_original_reference)
  WHERE reconciliation_original_reference IS NOT NULL;
