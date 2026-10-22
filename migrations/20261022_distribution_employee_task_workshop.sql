-- Verified Distribution Managers assign work; appointed assistants report progress.
-- Administration reads the records but cannot create or close tasks on behalf of workers.
CREATE TABLE IF NOT EXISTS weave_distribution_team_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(140) NOT NULL,
  instructions TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned','in_progress','submitted','completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS weave_distribution_team_tasks_team_idx
 ON weave_distribution_team_tasks(manager_user_id,updated_at DESC);
CREATE TABLE IF NOT EXISTS weave_distribution_team_task_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES weave_distribution_team_tasks(id),
  actor_user_id UUID NOT NULL REFERENCES users(id),
  from_status VARCHAR(20),
  to_status VARCHAR(20) NOT NULL,
  note TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
