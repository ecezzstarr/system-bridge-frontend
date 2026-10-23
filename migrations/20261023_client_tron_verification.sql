-- Older installations created deposits before Administration verification fields.
-- This migration adds audit fields only and never approves or credits a deposit.
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS verifier_id uuid;
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS verified_at timestamptz;
