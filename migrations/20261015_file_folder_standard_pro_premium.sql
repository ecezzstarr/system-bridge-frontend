-- File Folder pricing alignment
-- Standard: 180–3,000 Flame Coin as normal WEAVE building power.
-- Pro: external/negotiated sale, normally 6,500 Flame Coin and Administration may negotiate to 3,000.
-- Premium: fixed at 35,800 Flame Coin.

ALTER TABLE file_folder_pricing
  ADD COLUMN IF NOT EXISTS standard_max_flame_coin NUMERIC(30,8),
  ADD COLUMN IF NOT EXISTS pro_start_flame_coin NUMERIC(30,8),
  ADD COLUMN IF NOT EXISTS pro_negotiated_min_flame_coin NUMERIC(30,8);

UPDATE file_folder_pricing
SET
  premium_price_flame_coin = 35800,
  standard_min_flame_coin = 180,
  standard_max_flame_coin = 3000,
  pro_start_flame_coin = 6500,
  pro_negotiated_min_flame_coin = 3000,
  price_trx = 35800,
  updated_at = NOW()
WHERE id = 1;

ALTER TABLE file_folder_purchases
  ADD COLUMN IF NOT EXISTS file_folder_tier VARCHAR(20);

COMMENT ON COLUMN file_folder_pricing.standard_min_flame_coin IS
  'Minimum Standard File Folder building-power value: 180 Flame Coin.';

COMMENT ON COLUMN file_folder_pricing.standard_max_flame_coin IS
  'Maximum Standard File Folder building-power value: 3,000 Flame Coin.';

COMMENT ON COLUMN file_folder_pricing.pro_start_flame_coin IS
  'Normal starting value for externally sold Pro File Folder: 6,500 Flame Coin.';

COMMENT ON COLUMN file_folder_pricing.pro_negotiated_min_flame_coin IS
  'Administration-approved minimum negotiated Pro File Folder value: 3,000 Flame Coin.';

COMMENT ON COLUMN file_folder_pricing.premium_price_flame_coin IS
  'Fixed Premium File Folder value: 35,800 Flame Coin.';

COMMENT ON COLUMN file_folder_purchases.file_folder_tier IS
  'Explicit sale classification (standard, pro, premium). Required to preserve the 3,000 Standard/Pro overlap.';
