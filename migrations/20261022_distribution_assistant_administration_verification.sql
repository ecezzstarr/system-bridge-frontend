-- Administration screens Assistant Distribution Manager applicants first.
-- Verified lead Distribution Managers choose which screened assistants join their teams.
-- Preserve all existing approved appointments, history, salaries and team assignments.
ALTER TABLE weave_distribution_assistants
 ADD COLUMN IF NOT EXISTS administration_verification VARCHAR(16) NOT NULL DEFAULT 'pending';
ALTER TABLE weave_distribution_assistants
 ADD COLUMN IF NOT EXISTS administration_verified_by UUID REFERENCES users(id);
ALTER TABLE weave_distribution_assistants
 ADD COLUMN IF NOT EXISTS administration_verified_at TIMESTAMPTZ;
ALTER TABLE weave_distribution_assistants
 ADD COLUMN IF NOT EXISTS administration_verification_note TEXT;
UPDATE weave_distribution_assistants
SET administration_verification='verified',
    administration_verified_at=COALESCE(administration_verified_at,reviewed_at,hired_at)
WHERE status='approved' AND administration_verification='pending';
CREATE INDEX IF NOT EXISTS weave_distribution_assistants_admin_review_idx
 ON weave_distribution_assistants(administration_verification,status,created_at DESC);
