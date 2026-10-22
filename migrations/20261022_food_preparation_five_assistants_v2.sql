-- Current WEAVE Stability food preparation staffing: one lead and five assistants.
-- Older migrations are historical; update the current assistant salary term
-- without deleting appointments or changing their employment status.
ALTER TABLE weave_food_preparation_managers
  ALTER COLUMN monthly_salary_ngn SET DEFAULT 70000;
UPDATE weave_food_preparation_managers
SET monthly_salary_ngn=40000,updated_at=NOW()
WHERE position='assistant'
  AND monthly_salary_ngn IS DISTINCT FROM 40000;
