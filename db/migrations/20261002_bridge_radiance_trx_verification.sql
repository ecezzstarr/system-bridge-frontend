-- Bridge Radiance automatic TRX verification evidence.

ALTER TABLE file_folder_purchases
  ADD COLUMN IF NOT EXISTS payment_verification_source varchar(40);

ALTER TABLE file_folder_purchases
  ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz;

ALTER TABLE file_folder_purchases
  ADD COLUMN IF NOT EXISTS verified_tx_from varchar(80);

ALTER TABLE file_folder_purchases
  ADD COLUMN IF NOT EXISTS verified_tx_to varchar(80);

CREATE INDEX IF NOT EXISTS idx_file_folder_purchases_verification
ON file_folder_purchases(status,payment_verified_at);
