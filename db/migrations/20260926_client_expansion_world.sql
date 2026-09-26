
-- Client expansion world: Enterprise Door, Streaming Open Gate, capability modules,
-- Business Routes and activity-based Business Vitality.

ALTER TABLE enterprise_applications ADD COLUMN IF NOT EXISTS public_slug varchar(160);

UPDATE enterprise_applications
SET public_slug=LOWER(
  REGEXP_REPLACE(
    TRIM(BOTH '-' FROM REGEXP_REPLACE(file_number,'[^A-Za-z0-9]+','-','g')),
    '[^A-Za-z0-9-]+','','g'
  )
)
WHERE public_slug IS NULL OR public_slug='';

CREATE UNIQUE INDEX IF NOT EXISTS idx_enterprise_applications_public_slug
ON enterprise_applications(public_slug)
WHERE public_slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS client_stream_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid UNIQUE NOT NULL,
  file_number varchar(120) UNIQUE NOT NULL,
  public_slug varchar(160) UNIQUE NOT NULL,
  name varchar(255) NOT NULL,
  description text,
  tagline varchar(255),
  enabled boolean NOT NULL DEFAULT true,
  is_live boolean NOT NULL DEFAULT false,
  live_title varchar(255),
  live_source_url text,
  live_started_at timestamptz,
  environment_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_stream_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL,
  client_id uuid NOT NULL,
  title varchar(255) NOT NULL,
  description text,
  program_type varchar(40) NOT NULL DEFAULT 'program',
  media_url text,
  scheduled_at timestamptz,
  status varchar(32) NOT NULL DEFAULT 'scheduled',
  duration_minutes integer,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_stream_programs_channel
ON client_stream_programs(channel_id,created_at DESC);

CREATE TABLE IF NOT EXISTS client_business_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  file_number varchar(120) NOT NULL,
  name varchar(255) NOT NULL,
  source_system_id uuid NOT NULL,
  target_system_id uuid NOT NULL,
  route_type varchar(60) NOT NULL DEFAULT 'business',
  status varchar(32) NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT client_business_routes_distinct_systems CHECK (source_system_id <> target_system_id)
);

CREATE INDEX IF NOT EXISTS idx_client_business_routes_client
ON client_business_routes(client_id,status,created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_business_routes_unique_pair
ON client_business_routes(client_id,source_system_id,target_system_id)
WHERE status='active';

CREATE TABLE IF NOT EXISTS client_business_route_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL,
  client_id uuid NOT NULL,
  title varchar(255) NOT NULL,
  movement_value numeric(30,8),
  movement_unit varchar(40),
  note text,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_business_route_movements_route
ON client_business_route_movements(route_id,created_at DESC);

INSERT INTO weave_file_folder_items
(item_key,name,category,description,price_flame_coin,published)
VALUES
('creator_booth_kit','Creator Booth Kit','streaming','Core room, interface and publishing components for the first Client-owned media production space.',180,true),
('broadcast_studio_kit','Broadcast Studio Kit','streaming','Studio control, program formation and broadcast workflow components for a Client media operation.',520,true),
('streaming_gate_kit','Streaming Open Gate Kit','streaming','Public broadcast entrance components that open the Client channel to people outside WEAVE.',950,true),
('media_network_kit','Media Network Kit','streaming','High-capacity components for a larger programming, distribution and audience network.',1900,true),
('route_station_kit','Business Route Station Kit','network','Infrastructure for connecting completed Client systems and recording real movement between them.',650,true),
('enterprise_door_kit','Enterprise Door Kit','enterprise','Public enterprise entrance architecture available after Lord/Lady elevation approval.',1500,true),
('enterprise_hall_kit','Enterprise Hall Kit','enterprise','Headquarters components for the approved enterprise public hall and internal command space.',2400,true),
('legion_quarters_kit','Legion Quarters Kit','enterprise','Working-space components that open structured capacity for enterprise Legions.',1300,true),
('operations_command_kit','Operations Command Kit','enterprise','Command infrastructure for approvals, recurring operations and coordinated enterprise movement.',2600,true),
('enterprise_treasury_kit','Enterprise Treasury Kit','enterprise','Financial operating infrastructure for enterprise budgets, allocations and records.',2200,true),
('distribution_network_kit','Distribution Network Kit','enterprise','Network infrastructure that connects enterprise systems to wider distribution and operating routes.',3400,true)
ON CONFLICT (item_key) DO NOTHING;

INSERT INTO weave_file_folder_items
(item_key,name,category,description,price_flame_coin,build_effect,effect_value,published)
VALUES
('route_capacity_module','Route Capacity Module','network_upgrade','Install during a compatible build to add one persistent Business Route slot after Route Station construction.',420,'route_capacity',1,true),
('legion_capacity_module','Legion Capacity Module','enterprise_upgrade','Install during enterprise construction to add two Legion operating positions after Legion Quarters are live.',550,'legion_capacity',2,true),
('stream_capacity_module','Stream Program Capacity Module','streaming_upgrade','Install during streaming construction to add three simultaneous scheduled/live program slots.',390,'stream_capacity',3,true),
('audience_capacity_module','Audience Capacity Module','streaming_upgrade','Install during streaming construction to expand the Client channel audience-capacity indicator by 500.',460,'audience_capacity',500,true),
('ai_flame_node','AI Flame Node','intelligence_upgrade','Install an AI assistance node into a system build; completed nodes remain visible as Client capability.',720,'ai_node',1,true),
('automation_node','Automation Node','operations_upgrade','Install an automation node into a compatible system build for reusable operating capability.',640,'automation',1,true),
('verification_lab_module','Verification Lab Module','operations_upgrade','Install a verification/testing capability into a major build and preserve it in the system configuration.',580,'verification',1,true)
ON CONFLICT (item_key) DO UPDATE SET
  name=EXCLUDED.name,
  category=EXCLUDED.category,
  description=EXCLUDED.description,
  price_flame_coin=EXCLUDED.price_flame_coin,
  build_effect=EXCLUDED.build_effect,
  effect_value=EXCLUDED.effect_value,
  published=true,
  updated_at=NOW();

INSERT INTO weave_file_folder_blueprints
(blueprint_key,name,district,system_type,description,build_hours,required_item_key,required_item_quantity,published)
VALUES
('route_station','Business Route Station','network_district','route_station','A Client network station that connects completed systems so commerce, media, service, distribution and operating movement can be recorded between them.',72,'route_station_kit',1,true),
('creator_booth','Creator Booth','streaming_district','creator_booth','The first Client-owned production room for planning programs, launches, demonstrations, interviews and media movement.',24,'creator_booth_kit',1,true),
('broadcast_studio','Broadcast Studio','streaming_district','broadcast_studio','A three-day studio build that opens structured programming, scheduling and broadcast preparation.',72,'broadcast_studio_kit',1,true),
('streaming_gate','Streaming Open Gate','streaming_district','streaming_gate','A five-day public broadcast gate that allows people outside WEAVE to visit the Client channel and enter a live source when the Client opens it.',120,'streaming_gate_kit',1,true),
('media_network','Media Network','streaming_district','media_network','A ten-day expansion from one public Streaming Gate into a larger programming and media-distribution network.',240,'media_network_kit',1,true),
('enterprise_door','Enterprise Door','enterprise_district','enterprise_door','A seven-day public enterprise entrance unlocked only after Administration approves Lord/Lady elevation and the Client has formed a Marketplace Network.',168,'enterprise_door_kit',1,true),
('enterprise_hall','Enterprise Hall','enterprise_district','enterprise_hall','A fourteen-day enterprise headquarters build that expands the Enterprise Door into a public and internal operating hall.',336,'enterprise_hall_kit',1,true),
('legion_quarters','Legion Quarters','enterprise_district','legion_quarters','A seven-day working structure that opens real Legion operating capacity for an approved Lord/Lady enterprise.',168,'legion_quarters_kit',1,true),
('operations_command','Operations Command','enterprise_district','operations_command','A ten-day enterprise command structure for recurring operations, approvals, coordinated systems and participant movement.',240,'operations_command_kit',1,true),
('enterprise_treasury','Enterprise Treasury','enterprise_district','enterprise_treasury','A seven-day enterprise finance structure for budgets, allocations, revenue records and controlled business movement.',168,'enterprise_treasury_kit',1,true),
('distribution_network','Distribution Network','enterprise_district','distribution_network','A fourteen-day expansion network that connects enterprise operations to built Business Routes and wider distribution movement.',336,'distribution_network_kit',1,true)
ON CONFLICT (blueprint_key) DO NOTHING;

UPDATE weave_file_folder_blueprints
SET district='enterprise_district',updated_at=NOW()
WHERE blueprint_key='enterprise_operating_system'
  AND district='formation_yard';
