-- Client-owned File Folder formation and explicit Customer Door publication boundary.
-- WEAVE hosts and organizes the runtime; the Client owns business formation and chooses public system exposure.

CREATE TABLE IF NOT EXISTS client_business_formations (
  client_id uuid PRIMARY KEY,
  file_number varchar(120) NOT NULL,
  business_name varchar(220) NOT NULL,
  sector varchar(160),
  purpose text,
  customer_description text,
  operating_model varchar(120),
  formation_state varchar(40) NOT NULL DEFAULT 'forming',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_business_formations_file_number
ON client_business_formations(file_number);

CREATE TABLE IF NOT EXISTS client_customer_door_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  client_id uuid NOT NULL,
  system_id uuid NOT NULL,
  public_label varchar(220),
  public_summary text,
  enabled boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, system_id)
);

CREATE INDEX IF NOT EXISTS idx_client_customer_door_systems_store
ON client_customer_door_systems(store_id, enabled, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_customer_door_systems_client
ON client_customer_door_systems(client_id, updated_at DESC);
