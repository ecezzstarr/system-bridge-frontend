-- Client Market + constructed public storefront environments
ALTER TABLE client_business_stores
  ADD COLUMN IF NOT EXISTS environment_config jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Move former shipped defaults to multi-day construction horizons.
-- Conditions preserve any duration already customized by Administration.
UPDATE weave_file_folder_blueprints SET build_hours=24,updated_at=NOW()
WHERE blueprint_key='customer_door' AND build_hours=6;

UPDATE weave_file_folder_blueprints
SET build_hours=72,
    description='A constructed customer-facing store building inside the public WEAVE Client Market, with offers, order intake, patronage and fulfillment movement.',
    updated_at=NOW()
WHERE blueprint_key='commerce_storefront' AND build_hours=24;

UPDATE weave_file_folder_blueprints
SET build_hours=168,
    description='A seven-day base construction that expands the Client storefront into a larger public Market Hall with multi-offer commercial movement, buyers, orders and records.',
    updated_at=NOW()
WHERE blueprint_key='marketplace_network' AND build_hours=120;

UPDATE weave_file_folder_blueprints SET build_hours=168,updated_at=NOW()
WHERE blueprint_key='crypto_exchange_workshop' AND build_hours=72;

UPDATE weave_file_folder_blueprints SET build_hours=72,updated_at=NOW()
WHERE blueprint_key='payments_gateway' AND build_hours=48;

UPDATE weave_file_folder_blueprints SET build_hours=96,updated_at=NOW()
WHERE blueprint_key='operations_suite' AND build_hours=60;

UPDATE weave_file_folder_blueprints SET build_hours=120,updated_at=NOW()
WHERE blueprint_key='mobile_service_app' AND build_hours=72;

UPDATE weave_file_folder_blueprints SET build_hours=168,updated_at=NOW()
WHERE blueprint_key='intelligence_lab' AND build_hours=96;

UPDATE weave_file_folder_blueprints SET build_hours=336,updated_at=NOW()
WHERE blueprint_key='enterprise_operating_system' AND build_hours=168;

UPDATE weave_file_folder_blueprints SET build_hours=72,updated_at=NOW()
WHERE blueprint_key='integration_network' AND build_hours=48;
