-- Generic Company Loop events for Clients, Agents, and Bridgers.
-- Loop 1 is the first company event; Loop 2+ are created and published by Administration
-- after the participant's work/progress is reviewed and the applicable agreement is ready.

CREATE TABLE IF NOT EXISTS company_loops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_number integer NOT NULL CHECK (loop_number > 0),
  title varchar(255) NOT NULL,
  purpose text NOT NULL DEFAULT '',
  stage varchar(255) NOT NULL DEFAULT '',
  position varchar(80) NOT NULL DEFAULT 'all',
  functions text NOT NULL DEFAULT '',
  economics text NOT NULL DEFAULT '',
  responsibilities text NOT NULL DEFAULT '',
  boundaries text NOT NULL DEFAULT '',
  agreement_version varchar(120),
  audience text[] NOT NULL DEFAULT ARRAY['client','agent','bridger']::text[],
  status varchar(40) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  published_at timestamptz
);

CREATE INDEX IF NOT EXISTS company_loops_status_idx ON company_loops(status);
CREATE INDEX IF NOT EXISTS company_loops_number_idx ON company_loops(loop_number);
