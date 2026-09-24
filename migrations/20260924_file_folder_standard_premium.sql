-- File Folder pricing tiers
-- Premium is fixed at 35,800 Flame Coin / TRX.
-- Standard may be any value from 180 Flame Coin / TRX up to anything below Premium.

ALTER TABLE file_folder_pricing
  ADD COLUMN IF NOT EXISTS premium_price_flame_coin NUMERIC(30,8),
  ADD COLUMN IF NOT EXISTS standard_min_flame_coin NUMERIC(30,8);

UPDATE file_folder_pricing
SET
  premium_price_flame_coin = 35800,
  standard_min_flame_coin = 180,
  price_trx = 35800,
  updated_at = NOW()
WHERE id = 1;

COMMENT ON COLUMN file_folder_pricing.price_trx IS
  'Legacy compatibility column containing the Premium File Folder price.';

COMMENT ON COLUMN file_folder_pricing.premium_price_flame_coin IS
  'Fixed Premium File Folder price. 1 Flame Coin = 1 TRX.';

COMMENT ON COLUMN file_folder_pricing.standard_min_flame_coin IS
  'Minimum Standard File Folder value. Standard values must remain below Premium.';
