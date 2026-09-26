-- Administration Environment Organizer
-- Runtime page/card visibility and ordering. Source remains preserved; no deployment is required for later organizer changes.
CREATE TABLE IF NOT EXISTS weave_environment_surfaces (
  surface_key varchar(180) PRIMARY KEY,
  label varchar(180) NOT NULL,
  surface_kind varchar(24) NOT NULL CHECK (surface_kind IN ('page','card')),
  route varchar(320) NOT NULL,
  area varchar(160) NOT NULL,
  scope varchar(40) NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  is_protected boolean NOT NULL DEFAULT false,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS weave_environment_surfaces_area_idx
  ON weave_environment_surfaces(area,sort_order,label);
