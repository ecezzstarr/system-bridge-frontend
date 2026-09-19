-- Daily activity log: drives tier 1 -> 2 admin review
CREATE TABLE IF NOT EXISTS daily_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_number VARCHAR(50) NOT NULL REFERENCES file_folders(file_number),
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  activity_type VARCHAR(50) NOT NULL,
  position VARCHAR(20),
  minutes_spent INTEGER NOT NULL DEFAULT 0,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_daily_activity_file_date
  ON daily_activity_log(file_number, activity_date);

-- Workshop key tiers (admin-configured pricing/access rules)
CREATE TABLE IF NOT EXISTS workshop_key_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier INTEGER NOT NULL UNIQUE CHECK (tier IN (1,2,3)),
  name TEXT NOT NULL,
  hours_per_day INTEGER,
  price_trx NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO workshop_key_tiers (tier, name, hours_per_day, price_trx, description)
VALUES
  (1, 'Workshop Key - Tier 1', 4, 0, '4 hours daily access per company position'),
  (2, 'Workshop Key - Tier 2', 10, 0, '10 hours daily access per company position, store building unlocked'),
  (3, 'Workshop Key - Tier 3', NULL, 0, 'Unbounded access, gated by real-world business milestone verification')
ON CONFLICT (tier) DO NOTHING;

-- Per-client tier assignment/progress
CREATE TABLE IF NOT EXISTS client_workshop_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_number VARCHAR(50) NOT NULL UNIQUE REFERENCES file_folders(file_number),
  current_tier INTEGER NOT NULL DEFAULT 0 CHECK (current_tier IN (0,1,2,3)),
  tier_1_started_at TIMESTAMPTZ,
  tier_2_started_at TIMESTAMPTZ,
  tier_3_started_at TIMESTAMPTZ,
  advanced_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tier-3 real-world milestones (admin-attested)
CREATE TABLE IF NOT EXISTS business_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_number VARCHAR(50) NOT NULL REFERENCES file_folders(file_number),
  milestone_name TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Client-owned stores (tier 2 build, tier 3 publish)
CREATE TABLE IF NOT EXISTS client_stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_number VARCHAR(50) NOT NULL UNIQUE REFERENCES file_folders(file_number),
  store_name TEXT NOT NULL,
  description TEXT,
  ai_generated_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  visibility VARCHAR(20) NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public')),
  public_slug VARCHAR(80) UNIQUE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Optional: track prospect consent explicitly
ALTER TABLE market_prospect_contacts
  ADD COLUMN IF NOT EXISTS consented_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consent_status VARCHAR(20) NOT NULL DEFAULT 'pending';
