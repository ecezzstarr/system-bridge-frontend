-- Food preparation staffing: exactly one lead Manager application place
-- and five Assistant Manager application places. Salaries are employment terms,
-- visible to the applicant after submission and to Administration; no auto-pay.
-- Preserve existing applications as lead Manager applications.
ALTER TABLE weave_food_preparation_managers
  ADD COLUMN IF NOT EXISTS position varchar(16) NOT NULL DEFAULT 'manager';

ALTER TABLE weave_food_preparation_managers
  ALTER COLUMN monthly_salary_ngn SET DEFAULT 70000;

UPDATE weave_food_preparation_managers
SET monthly_salary_ngn=CASE WHEN position='assistant' THEN 40000 ELSE 70000 END,
    updated_at=NOW()
WHERE monthly_salary_ngn IS DISTINCT FROM
  CASE WHEN position='assistant' THEN 40000 ELSE 70000 END;

-- Application-slot capacities and the single-application-per-Agent rule are
-- checked within pg_advisory_xact_lock(20261021, 51) by both application and
-- Administration review endpoints. Rejected/revoked applications release slots.
-- Existing appointments are deliberately not revoked by this migration.

-- Food-operation assignments belong to the appointed Stability lead.
-- All transfers between the lead and assistants have a permanent audit trail.
CREATE TABLE IF NOT EXISTS weave_food_preparation_assignment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES weave_food_preparation_tasks(id),
  from_manager_id uuid REFERENCES weave_food_preparation_managers(id),
  to_manager_id uuid NOT NULL REFERENCES weave_food_preparation_managers(id),
  assigned_by_agent_id uuid NOT NULL REFERENCES users(id),
  note varchar(800) NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS weave_food_preparation_assignment_events_task_idx
  ON weave_food_preparation_assignment_events(task_id,assigned_at DESC);

-- A single fixed Administration allocation PER verified food order. A carton
-- with many packages still results in just one ₦800 allocation, never one per
-- individual package. This ledger tracks allocations; it is not a payout engine.
CREATE TABLE IF NOT EXISTS weave_food_administration_allocations (
  product varchar(20) NOT NULL CHECK (product IN ('agility','electrolyte','ember','daisy')),
  source_order_id uuid NOT NULL,
  amount_ngn numeric(12,2) NOT NULL DEFAULT 800 CHECK (amount_ngn=800),
  status varchar(24) NOT NULL DEFAULT 'allocated' CHECK (status IN ('allocated','settled')),
  allocated_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY(product,source_order_id)
);
