-- Echo + EIGHT File Folder sales manager.
-- Echo coordinates the active commercial movement; EIGHT reviews the funnel as intelligence.
-- The manager enforces cadence and accountability. It does not claim guaranteed buyer behavior.

CREATE TABLE IF NOT EXISTS weave_file_folder_sales_manager (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT true,
  weekly_target integer NOT NULL DEFAULT 1 CHECK (weekly_target >= 1 AND weekly_target <= 1000),
  echo_active boolean NOT NULL DEFAULT true,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

INSERT INTO weave_file_folder_sales_manager (id, enabled, weekly_target, echo_active)
VALUES (1, true, 1, true)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS weave_file_folder_sales_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL,
  report_date date NOT NULL,
  status varchar(24) NOT NULL,
  weekly_target integer NOT NULL,
  confirmed_sales integer NOT NULL DEFAULT 0,
  remaining_sales integer NOT NULL DEFAULT 0,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  echo_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  eight_analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (report_date)
);

CREATE INDEX IF NOT EXISTS idx_weave_file_folder_sales_reports_week
ON weave_file_folder_sales_reports(week_start, report_date DESC);

CREATE TABLE IF NOT EXISTS weave_file_folder_sales_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL,
  action_key varchar(255) NOT NULL,
  priority varchar(16) NOT NULL DEFAULT 'normal',
  channel varchar(24) NOT NULL,
  action_type varchar(64) NOT NULL,
  owner_role varchar(24) NOT NULL,
  owner_id uuid,
  target_ref varchar(255),
  reason text NOT NULL,
  instruction text NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'open',
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (week_start, action_key)
);

CREATE INDEX IF NOT EXISTS idx_weave_file_folder_sales_actions_open
ON weave_file_folder_sales_actions(status, priority, due_at, created_at);
