-- Client employees receive a company-granted File Folder after a separate,
-- Administration-verified employment entry ticket. Not a retail sale.
CREATE TABLE IF NOT EXISTS company_client_staff_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash varchar(64) NOT NULL UNIQUE,
  candidate_name varchar(255) NOT NULL,
  candidate_email varchar(255) NOT NULL,
  candidate_phone varchar(80),
  position_title varchar(160) NOT NULL,
  monthly_salary_usdt numeric(16,2) NOT NULL DEFAULT 0,
  ticket_amount_usdt numeric(16,2) NOT NULL,
  applicant_contribution_usdt numeric(16,2) NOT NULL DEFAULT 0,
  proposed_personal_loan_usdt numeric(16,2) NOT NULL DEFAULT 0,
  personal_loan_terms text,
  personal_loan_accepted_at timestamptz,
  loan_funding_reference varchar(255),
  loan_funding_network varchar(80),
  folder_tier varchar(12) NOT NULL CHECK (folder_tier IN ('standard','pro','premium')),
  status varchar(32) NOT NULL DEFAULT 'offered'
    CHECK (status IN ('offered','accepted','pending_verification','approved','rejected','withdrawn')),
  payment_reference varchar(255),
  payment_network varchar(80),
  file_number varchar(120) UNIQUE,
  client_id uuid UNIQUE,
  receipt_number varchar(80) UNIQUE,
  created_by uuid NOT NULL,
  verified_by uuid,
  rejection_reason varchar(500),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  submitted_at timestamptz,
  verified_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS company_client_staff_work (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES company_client_staff_offers(id),
  client_id uuid NOT NULL REFERENCES users(id),
  prospect_name varchar(160) NOT NULL,
  organization varchar(200),
  stage varchar(32) NOT NULL DEFAULT 'introduced'
    CHECK(stage IN ('introduced','conversation','follow_up','proposal','completed')),
  next_action varchar(1200),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS company_client_staff_work_owner_idx ON company_client_staff_work(client_id,created_at DESC);
CREATE INDEX IF NOT EXISTS company_staff_offers_email_idx ON company_client_staff_offers(lower(candidate_email));
CREATE INDEX IF NOT EXISTS company_staff_offers_status_idx ON company_client_staff_offers(status,created_at DESC);
COMMENT ON TABLE company_client_staff_offers IS
  'Company employment entry tickets and granted employee File Folders. Separate from retail file_folder_purchases and salary payroll.';
COMMENT ON COLUMN company_client_staff_offers.monthly_salary_usdt IS
  'Confidential monthly employment offer figure, not an automatic salary payment.';
COMMENT ON COLUMN company_client_staff_offers.ticket_amount_usdt IS
  'USDT employment ticket amount for manual Administration verification; not File Folder purchase price.';

-- Compatible with databases that created company staff offers before personal-loan support.
ALTER TABLE company_client_staff_offers ADD COLUMN IF NOT EXISTS applicant_contribution_usdt numeric(16,2) NOT NULL DEFAULT 0;
ALTER TABLE company_client_staff_offers ADD COLUMN IF NOT EXISTS proposed_personal_loan_usdt numeric(16,2) NOT NULL DEFAULT 0;
ALTER TABLE company_client_staff_offers ADD COLUMN IF NOT EXISTS personal_loan_terms text;
ALTER TABLE company_client_staff_offers ADD COLUMN IF NOT EXISTS personal_loan_accepted_at timestamptz;
ALTER TABLE company_client_staff_offers ADD COLUMN IF NOT EXISTS loan_funding_reference varchar(255);
ALTER TABLE company_client_staff_offers ADD COLUMN IF NOT EXISTS loan_funding_network varchar(80);
COMMENT ON COLUMN company_client_staff_offers.proposed_personal_loan_usdt IS 'Optional explicitly proposed private loan, not automatically funded, incurred or repaid';
COMMENT ON COLUMN company_client_staff_offers.applicant_contribution_usdt IS 'Actual expected applicant part of a company entry ticket; Administration verifies its own payment evidence';
