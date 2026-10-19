-- WEAVE Food Preparation Manager · Agent Lifestyle employment
-- Source of payroll terms: ₦60,000 / month, payable only under actual
-- approved employment arrangements; no automatic wallet salary credit.
CREATE TABLE IF NOT EXISTS weave_food_preparation_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  application_note text NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','revoked')),
  monthly_salary_ngn numeric(12,2) NOT NULL DEFAULT 60000,
  review_note text,
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS weave_food_preparation_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES weave_food_preparation_managers(id),
  product varchar(20) NOT NULL CHECK (product IN ('agility','electrolyte','daisy')),
  source_order_id uuid NOT NULL,
  assigned_by uuid NOT NULL REFERENCES users(id),
  assigned_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(product,source_order_id)
);
CREATE TABLE IF NOT EXISTS weave_food_preparation_task_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES weave_food_preparation_tasks(id),
  manager_id uuid NOT NULL REFERENCES weave_food_preparation_managers(id),
  stage varchar(32) NOT NULL,
  note varchar(800) NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS weave_food_preparation_tasks_manager_idx
  ON weave_food_preparation_tasks(manager_id,assigned_at DESC);
CREATE INDEX IF NOT EXISTS weave_food_preparation_events_idx
  ON weave_food_preparation_task_events(task_id,occurred_at DESC);

-- Daisy Pastries: the Agent verifies the payment received, then
-- Administration explicitly authorizes preparation. The release makes
-- the customer-facing order eligible for assignment and manager alert.
ALTER TABLE carrier_cake_orders
  ADD COLUMN IF NOT EXISTS preparation_released_at timestamptz;
ALTER TABLE carrier_cake_orders
  ADD COLUMN IF NOT EXISTS preparation_released_by uuid REFERENCES users(id);
