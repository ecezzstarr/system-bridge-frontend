-- The four File Folder types are Standard, Pro, Premium and Plus.
-- Never classify a personal loan as a paid File Folder purchase.
CREATE TABLE IF NOT EXISTS file_folder_global_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version bigint GENERATED ALWAYS AS IDENTITY,
  state varchar(20) NOT NULL CHECK(state IN ('draft','published','archived')),
  config jsonb NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_by uuid,
  published_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS file_folder_single_published_release
 ON file_folder_global_releases(state) WHERE state='published';
CREATE INDEX IF NOT EXISTS file_folder_release_history
 ON file_folder_global_releases(version DESC);

CREATE TABLE IF NOT EXISTS client_folder_upgrades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid UNIQUE NOT NULL REFERENCES users(id),
  file_number varchar(120) UNIQUE NOT NULL,
  tier varchar(16) NOT NULL CHECK(tier IN ('standard','pro','premium','plus')),
  status varchar(32) NOT NULL CHECK(status IN ('construction','repayment_required','ready')),
  loan_principal_usdt numeric(16,2) NOT NULL DEFAULT 0,
  loan_funded_at timestamptz,
  loan_funding_reference varchar(255),
  loan_agreed_at timestamptz,
  loan_agreement_reference varchar(255),
  repayment_verified_usdt numeric(16,2) NOT NULL DEFAULT 0,
  construction_note text NOT NULL,
  prepared_by uuid REFERENCES users(id),
  approved_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(loan_principal_usdt>=0),
  CHECK(repayment_verified_usdt>=0 AND repayment_verified_usdt<=loan_principal_usdt)
);
CREATE TABLE IF NOT EXISTS client_folder_loan_repayments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upgrade_id uuid NOT NULL REFERENCES client_folder_upgrades(id),
  amount_usdt numeric(16,2) NOT NULL CHECK(amount_usdt>0),
  network varchar(80) NOT NULL,
  reference varchar(255) NOT NULL UNIQUE,
  verified_by uuid NOT NULL REFERENCES users(id),
  verified_at timestamptz NOT NULL DEFAULT now()
);

-- Existing company employee offer records must be compatible with the
-- fourth tier without changing their existing ticket-value policies.
ALTER TABLE company_client_staff_offers
  DROP CONSTRAINT IF EXISTS company_client_staff_offers_folder_tier_check;
ALTER TABLE company_client_staff_offers
  ADD CONSTRAINT company_client_staff_offers_folder_tier_check
  CHECK(folder_tier IN ('standard','pro','premium','plus'));

COMMENT ON TABLE file_folder_global_releases IS
  'Administration-controlled versioned guidance for all File Folder worlds. Source-code releases still require independent host deployment.';
COMMENT ON TABLE client_folder_upgrades IS
  'Owner-bound tier upgrades and construction release gates. A personal loan is not due until agreement and funding are verified.';
COMMENT ON TABLE client_folder_loan_repayments IS
  'Administration-verified loan repayments. Recording a transaction reference never transfers funds.';
