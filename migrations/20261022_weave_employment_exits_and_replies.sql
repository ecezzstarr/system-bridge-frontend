-- WEAVE employment separation and private correspondence.
-- Roles covered: Distribution Manager, Assistant Distribution Manager,
-- Food Preparation Manager and Assistant Food Preparation Manager.
-- No personal account is deleted or demoted; salary and earned payment records remain.
ALTER TABLE manager_employment ADD COLUMN IF NOT EXISTS exit_kind varchar(20);
ALTER TABLE manager_employment ADD COLUMN IF NOT EXISTS exit_reason text;
ALTER TABLE manager_employment ADD COLUMN IF NOT EXISTS exited_at timestamptz;
ALTER TABLE manager_employment ADD COLUMN IF NOT EXISTS exited_by uuid REFERENCES users(id);

ALTER TABLE weave_distribution_assistants ADD COLUMN IF NOT EXISTS exit_kind varchar(20);
ALTER TABLE weave_distribution_assistants ADD COLUMN IF NOT EXISTS exit_reason text;
ALTER TABLE weave_distribution_assistants ADD COLUMN IF NOT EXISTS exited_at timestamptz;
ALTER TABLE weave_distribution_assistants ADD COLUMN IF NOT EXISTS exited_by uuid REFERENCES users(id);

ALTER TABLE weave_food_preparation_managers ADD COLUMN IF NOT EXISTS exit_kind varchar(20);
ALTER TABLE weave_food_preparation_managers ADD COLUMN IF NOT EXISTS exit_reason text;
ALTER TABLE weave_food_preparation_managers ADD COLUMN IF NOT EXISTS exited_at timestamptz;
ALTER TABLE weave_food_preparation_managers ADD COLUMN IF NOT EXISTS exited_by uuid REFERENCES users(id);

CREATE TABLE IF NOT EXISTS weave_employment_correspondence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position varchar(36) NOT NULL CHECK (position IN ('distribution_manager','distribution_assistant','food_preparation')),
  employee_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES users(id),
  author_role varchar(16) NOT NULL CHECK (author_role IN ('employee','administration','system')),
  message text NOT NULL CHECK (char_length(message) BETWEEN 2 AND 2000),
  created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS weave_employment_correspondence_thread_idx
  ON weave_employment_correspondence(position,employee_user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS weave_employment_exit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position varchar(36) NOT NULL CHECK (position IN ('distribution_manager','distribution_assistant','food_preparation')),
  employee_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL REFERENCES users(id),
  exit_kind varchar(20) NOT NULL CHECK (exit_kind IN ('resigned','withdrawn','fired','lead_departed')),
  reason text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT NOW()
);
