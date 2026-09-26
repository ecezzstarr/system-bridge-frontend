-- File Folder operating environment: live build parts and purchasable acceleration.
-- Client purchases can be attached to a specific active build and remain visible in its history.

ALTER TABLE weave_file_folder_items
  ADD COLUMN IF NOT EXISTS build_effect varchar(40) NOT NULL DEFAULT 'component',
  ADD COLUMN IF NOT EXISTS effect_value numeric(10,4) NOT NULL DEFAULT 0;

ALTER TABLE client_file_folder_builds
  ADD COLUMN IF NOT EXISTS purchase_speed_multiplier numeric(10,4) NOT NULL DEFAULT 1;

UPDATE client_file_folder_builds
SET purchase_speed_multiplier=COALESCE(purchase_speed_multiplier,1)
WHERE purchase_speed_multiplier IS NULL;

CREATE TABLE IF NOT EXISTS client_file_folder_build_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id uuid NOT NULL,
  client_id uuid NOT NULL,
  file_number varchar(120) NOT NULL,
  item_key varchar(80) NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  effect_type varchar(40) NOT NULL DEFAULT 'component',
  effect_value numeric(10,4) NOT NULL DEFAULT 0,
  applied_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_file_folder_build_parts_build
ON client_file_folder_build_parts(build_id, applied_at DESC);

INSERT INTO weave_file_folder_items (
  item_key,name,category,description,price_flame_coin,build_effect,effect_value,published
)
VALUES
  ('build_speed_15','Build Speed Boost · 15%','acceleration','Attach to one active build to increase its formation speed live.',25,'speed_boost',1.15,true),
  ('build_speed_35','Build Speed Boost · 35%','acceleration','Attach to one active build to increase its formation speed live.',60,'speed_boost',1.35,true),
  ('build_speed_75','Build Speed Boost · 75%','acceleration','Attach to one active build for a larger live formation-speed increase.',140,'speed_boost',1.75,true),
  ('verification_module','Verification Module','build_part','Attach a visible verification/testing part to the active build.',90,'component',0,true),
  ('interface_module','Interface Module','build_part','Attach an interface part to the active build and preserve it in the build record.',110,'component',0,true),
  ('integration_module','Integration Module','build_part','Attach an integration part to the active build and preserve it in the build record.',160,'component',0,true)
ON CONFLICT (item_key)
DO UPDATE SET
  name=EXCLUDED.name,
  category=EXCLUDED.category,
  description=EXCLUDED.description,
  price_flame_coin=EXCLUDED.price_flame_coin,
  build_effect=EXCLUDED.build_effect,
  effect_value=EXCLUDED.effect_value,
  published=true,
  updated_at=NOW();
