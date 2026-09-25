ALTER TABLE client_file_folder_builds
  ADD COLUMN IF NOT EXISTS base_duration_minutes integer,
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS speed_multiplier numeric(10,4) NOT NULL DEFAULT 1;

UPDATE client_file_folder_builds
SET
  base_duration_minutes=COALESCE(base_duration_minutes,duration_hours*60),
  duration_minutes=COALESCE(duration_minutes,duration_hours*60),
  speed_multiplier=COALESCE(speed_multiplier,1)
WHERE base_duration_minutes IS NULL
   OR duration_minutes IS NULL;
