-- Prospective food preparation assistant salary policy: ₦30,000 per month.
-- Keep the sole lead Food Preparation Manager's ₦70,000 salary unchanged.
-- This updates employment terms only. It does not transfer funds, revoke
-- appointments, or alter historical payroll records.
UPDATE weave_food_preparation_managers
SET monthly_salary_ngn=30000, updated_at=NOW()
WHERE position='assistant'
  AND monthly_salary_ngn IS DISTINCT FROM 30000;
