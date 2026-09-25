-- Persistent Main File Folder world.
-- The Client's personalized workshop remains the identity/topic.
-- This schema gives that workshop real persistent build mechanics.

CREATE TABLE IF NOT EXISTS weave_file_folder_items (
  item_key varchar(80) PRIMARY KEY,
  name varchar(160) NOT NULL,
  category varchar(80) NOT NULL,
  description text,
  price_flame_coin numeric(30,8) NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weave_file_folder_blueprints (
  blueprint_key varchar(80) PRIMARY KEY,
  name varchar(180) NOT NULL,
  district varchar(80) NOT NULL DEFAULT 'formation_yard',
  system_type varchar(80) NOT NULL,
  description text NOT NULL,
  build_hours integer NOT NULL DEFAULT 1,
  required_item_key varchar(80),
  required_item_quantity integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_file_folder_inventory (
  client_id uuid NOT NULL,
  file_number varchar(120) NOT NULL,
  item_key varchar(80) NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (client_id, item_key)
);

CREATE TABLE IF NOT EXISTS client_file_folder_item_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  file_number varchar(120) NOT NULL,
  item_key varchar(80) NOT NULL,
  quantity integer NOT NULL,
  unit_price_flame_coin numeric(30,8) NOT NULL,
  total_price_flame_coin numeric(30,8) NOT NULL,
  wallet_balance_after numeric(30,8) NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_file_folder_builds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  file_number varchar(120) NOT NULL,
  blueprint_key varchar(80) NOT NULL,
  title varchar(220) NOT NULL,
  purpose text,
  system_type varchar(80) NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'building',
  duration_hours integer NOT NULL,
  started_at timestamptz NOT NULL DEFAULT NOW(),
  completes_at timestamptz NOT NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_file_folder_builds_client_time
ON client_file_folder_builds(client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS client_built_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id uuid UNIQUE NOT NULL,
  client_id uuid NOT NULL,
  file_number varchar(120) NOT NULL,
  system_type varchar(80) NOT NULL,
  title varchar(220) NOT NULL,
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  status varchar(32) NOT NULL DEFAULT 'active',
  activated_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_built_system_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid NOT NULL,
  client_id uuid NOT NULL,
  entry_type varchar(80) NOT NULL DEFAULT 'record',
  title varchar(220) NOT NULL,
  body text,
  status varchar(40) NOT NULL DEFAULT 'open',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_built_system_entries_system
ON client_built_system_entries(system_id, created_at DESC);

CREATE TABLE IF NOT EXISTS client_library_catalog (
  entry_key varchar(80) PRIMARY KEY,
  title varchar(220) NOT NULL,
  summary text NOT NULL,
  lesson text NOT NULL,
  movement varchar(220),
  sort_order integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_library_progress (
  client_id uuid NOT NULL,
  entry_key varchar(80) NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'available',
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (client_id, entry_key)
);
