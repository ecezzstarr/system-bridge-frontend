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
  ADD COLUMN IF NOT EXISTS file_folder_tier VARCHAR(20),
  ADD COLUMN IF NOT EXISTS bridge_code VARCHAR(32);

-- Preserve existing purchases created before sale classification was stored.
-- At the 3,000 overlap, an old Bridge sale is retained as Pro while a normal
-- WEAVE purchase remains Standard. Historical values above the new Standard
-- maximum remain usable by being classified as Pro.
UPDATE file_folder_purchases
SET file_folder_tier = CASE
  WHEN amount_trx = 35800 THEN 'premium'
  WHEN amount_trx = 3000 AND bridge_code IS NOT NULL THEN 'pro'
  WHEN amount_trx > 3000 AND amount_trx < 35800 THEN 'pro'
  WHEN amount_trx >= 180 AND amount_trx <= 3000 THEN 'standard'
  ELSE file_folder_tier
END
WHERE file_folder_tier IS NULL;

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
