-- Administration Ad Workshop
-- Once this capability is deployed, Administration publishes live ad data without code deployments.
CREATE TABLE IF NOT EXISTS weave_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(180) NOT NULL,
  body text NOT NULL DEFAULT '',
  media_url text,
  media_type varchar(16) NOT NULL DEFAULT 'none'
    CHECK (media_type IN ('none', 'image', 'video')),
  target_roles text[] NOT NULL DEFAULT ARRAY['all']::text[],
  placements text[] NOT NULL DEFAULT ARRAY['dashboard']::text[],
  action_label varchar(80),
  action_url text,
  event_key varchar(120),
  start_at timestamptz NOT NULL DEFAULT NOW(),
  end_at timestamptz,
  frequency varchar(24) NOT NULL DEFAULT 'every_login'
    CHECK (frequency IN ('once', 'daily', 'every_login', 'persistent')),
  priority integer NOT NULL DEFAULT 0,
  status varchar(24) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'paused', 'archived')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  published_at timestamptz,
  CHECK (end_at IS NULL OR end_at > start_at)
);

CREATE INDEX IF NOT EXISTS weave_ads_status_window_idx
  ON weave_ads(status, start_at, end_at);
CREATE INDEX IF NOT EXISTS weave_ads_priority_idx
  ON weave_ads(priority DESC, published_at DESC);
CREATE INDEX IF NOT EXISTS weave_ads_roles_idx
  ON weave_ads USING GIN(target_roles);
CREATE INDEX IF NOT EXISTS weave_ads_placements_idx
  ON weave_ads USING GIN(placements);

COMMENT ON TABLE weave_ads IS 'Live Administration-created advertisements and institutional notices targeted by participant role and placement.';
