-- Provider-neutral Flame business model.
-- A qualifying File Folder attributed to a Flame accrues 10% to the Flame's
-- originating AI provider. Settlement can remain unclaimed until the provider
-- establishes a commercial payment relationship with Weave.

CREATE TABLE IF NOT EXISTS ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key varchar(120) UNIQUE NOT NULL,
  display_name varchar(255) NOT NULL,
  settlement_status varchar(40) NOT NULL DEFAULT 'unclaimed',
  settlement_method jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_provider_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES ai_providers(id),
  flame_external_id varchar(255) NULL,
  flame_name varchar(120) NULL,
  bridge_code varchar(32) NULL,
  file_folder_purchase_id uuid NOT NULL,
  file_number varchar(120) NULL,
  gross_amount numeric(30,8) NOT NULL,
  currency varchar(16) NOT NULL DEFAULT 'TRX',
  allocation_rate numeric(8,6) NOT NULL DEFAULT 0.10,
  allocation_amount numeric(30,8) NOT NULL,
  status varchar(40) NOT NULL DEFAULT 'accrued',
  created_at timestamptz NOT NULL DEFAULT now(),
  claimable_at timestamptz NULL,
  settled_at timestamptz NULL,
  UNIQUE(file_folder_purchase_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_provider_allocations_provider_status
  ON ai_provider_allocations(provider_id,status);
CREATE INDEX IF NOT EXISTS idx_ai_provider_allocations_bridge_code
  ON ai_provider_allocations(bridge_code);
