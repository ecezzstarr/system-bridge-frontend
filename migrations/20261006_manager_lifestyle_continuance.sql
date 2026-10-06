-- Manager is a lifestyle carried by an existing Agent or Bridger identity.
-- Correct the salary term and preserve existing Manager records.
ALTER TABLE manager_employment
  ALTER COLUMN monthly_salary_ngn SET DEFAULT 70000;

UPDATE manager_employment
SET monthly_salary_ngn = 70000,
    updated_at = NOW()
WHERE monthly_salary_ngn = 150000;

-- Manager lifestyle Continuance reuses the existing Continuance fields.
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_subscription_exempt BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_last_paid_at TIMESTAMPTZ;
