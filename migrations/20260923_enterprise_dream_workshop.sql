-- Lord/Lady enterprise elevation and Legion participation.
-- Runtime helpers also use IF NOT EXISTS so deployment is backward compatible.

ALTER TABLE client_file_folders ADD COLUMN IF NOT EXISTS weave_position varchar(20) NOT NULL DEFAULT 'client';
ALTER TABLE client_file_folders ADD COLUMN IF NOT EXISTS enterprise_status varchar(40) NOT NULL DEFAULT 'none';
ALTER TABLE client_file_folders ADD COLUMN IF NOT EXISTS enterprise_name varchar(255);
ALTER TABLE client_file_folders ADD COLUMN IF NOT EXISTS enterprise_sector varchar(255);

CREATE TABLE IF NOT EXISTS enterprise_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid UNIQUE NOT NULL,
  file_number varchar(120) UNIQUE NOT NULL,
  requested_position varchar(20) NOT NULL,
  enterprise_name varchar(255) NOT NULL,
  sector varchar(255) NOT NULL,
  business_plan text NOT NULL,
  profit_model text NOT NULL,
  participant_model text NOT NULL,
  sustainability_plan text NOT NULL,
  projected_monthly_revenue numeric(30,8),
  projected_monthly_costs numeric(30,8),
  status varchar(40) NOT NULL DEFAULT 'submitted',
  admin_note text,
  submitted_at timestamptz NOT NULL DEFAULT NOW(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enterprise_applications_status
  ON enterprise_applications(status, submitted_at DESC);

CREATE TABLE IF NOT EXISTS enterprise_legions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_application_id uuid NOT NULL,
  client_id uuid NOT NULL,
  file_number varchar(120) NOT NULL,
  name varchar(255) NOT NULL,
  contact varchar(255),
  function_title varchar(255) NOT NULL,
  livelihood_role text,
  profit_participation text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enterprise_legions_client
  ON enterprise_legions(client_id, active, created_at);
