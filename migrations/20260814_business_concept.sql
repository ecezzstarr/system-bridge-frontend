ALTER TABLE bridge_sessions
  ADD COLUMN IF NOT EXISTS business_concept JSONB;
