-- File Folder world slots remain permanent property. Clients may reposition
-- only their visual castle on WEAVE's fictional shared land.
ALTER TABLE weave_open_world_domains ADD COLUMN IF NOT EXISTS map_x numeric(8,2);
ALTER TABLE weave_open_world_domains ADD COLUMN IF NOT EXISTS map_z numeric(8,2);
ALTER TABLE weave_open_world_domains ADD COLUMN IF NOT EXISTS map_position_changed_at timestamptz;
-- Both coordinates must be set together; older domains keep their original slot position.
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='weave_open_world_map_pair') THEN
  ALTER TABLE weave_open_world_domains ADD CONSTRAINT weave_open_world_map_pair CHECK (
   (map_x IS NULL AND map_z IS NULL) OR
   (map_x IS NOT NULL AND map_z IS NOT NULL
     AND map_x BETWEEN -105 AND 105 AND map_z BETWEEN -105 AND 105)
  );
 END IF;
END $$;
