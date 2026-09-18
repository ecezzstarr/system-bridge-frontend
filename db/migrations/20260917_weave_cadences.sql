-- Weave Cadences: a public stream of human observations, quotes, thoughts,
-- lessons, and reported experiences that can be searched by meaning.
CREATE TABLE IF NOT EXISTS weave_cadences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cadence_type VARCHAR(24) NOT NULL DEFAULT 'thought'
    CHECK (cadence_type IN ('thought', 'quote', 'experience', 'lesson', 'event')),
  content TEXT NOT NULL CHECK (char_length(trim(content)) BETWEEN 1 AND 2000),
  context TEXT CHECK (context IS NULL OR char_length(context) <= 1000),
  visibility VARCHAR(16) NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weave_cadences_author
  ON weave_cadences(author_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_weave_cadences_type
  ON weave_cadences(cadence_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_weave_cadences_search
  ON weave_cadences USING GIN (to_tsvector('simple', content || ' ' || COALESCE(context, '')));
