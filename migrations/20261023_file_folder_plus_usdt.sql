-- Plus is priced in USDT, not in Flame Coin/TRX. Legacy amount_trx is
-- retained only for compatibility with existing Standard/Pro/Premium records.
-- No historic purchase is upgraded by this migration.
ALTER TABLE file_folder_purchases
  ADD COLUMN IF NOT EXISTS amount_usdt NUMERIC(30,8);

COMMENT ON COLUMN file_folder_purchases.amount_usdt IS
  'Fixed USDT amount for Plus File Folder only. Never converted from amount_trx.';

CREATE INDEX IF NOT EXISTS idx_file_folder_purchases_plus_confirmed
  ON file_folder_purchases(client_id, file_number)
  WHERE file_folder_tier='plus' AND status='confirmed';
