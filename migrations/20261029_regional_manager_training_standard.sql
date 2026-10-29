-- Persist acknowledgement of the Regional Manager student-employment operating standard.
-- Existing applications remain reviewable but must acknowledge the standard when reapplying.
ALTER TABLE weave_regional_manager_applications
  ADD COLUMN IF NOT EXISTS training_standard_acknowledged BOOLEAN NOT NULL DEFAULT FALSE;
