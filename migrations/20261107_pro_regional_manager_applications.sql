-- Pro Regional Manager is a separate company position from ordinary Regional
-- Manager. Agent and Bridger candidates apply through Lifestyle. This table
-- is NOT an activated File Folder, salary wallet or payments/approval ledger.
-- External Client Pro staff verify through their issued File Number.
CREATE TABLE IF NOT EXISTS weave_pro_regional_manager_applications (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  source_role varchar(20) NOT NULL CHECK(source_role IN ('agent','bridger')),
  operating_country varchar(100) NOT NULL,
  operating_region varchar(150) NOT NULL,
  operating_city varchar(150) NOT NULL,
  contact_address text NOT NULL,
  business_name varchar(180) NOT NULL,
  business_plan jsonb NOT NULL,
  daily_work_plan text NOT NULL,
  status varchar(40) NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','approved_pending_verification','rejected','withdrawn')),
  agreed_monthly_salary_usdt numeric(16,2),
  employment_terms_reference varchar(255),
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  review_note text,
  submitted_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS weave_pro_regional_manager_application_status_time
  ON weave_pro_regional_manager_applications(status,submitted_at DESC);
