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
