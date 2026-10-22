-- Current WEAVE Stability food team: one lead at ₦70,000/month,
-- and precisely two Assistant Food Preparation Managers at ₦40,000/month each.
-- The employment capacity is enforced by the application and Administration
-- APIs. Preserve all historical records and reviewed appointments.
ALTER TABLE weave_food_preparation_managers
  ALTER COLUMN monthly_salary_ngn SET DEFAULT 70000;
UPDATE weave_food_preparation_managers
SET monthly_salary_ngn=40000,updated_at=NOW()
WHERE position='assistant'
  AND monthly_salary_ngn IS DISTINCT FROM 40000;
