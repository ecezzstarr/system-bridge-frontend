-- Food preparation staffing: exactly one lead Manager application place
-- and two Assistant Manager application places. Salaries are employment terms,
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

-- New policy: ONE allocation set PER food bowl or package purchased as WEAVE
-- stock via OPay, not a flat ₦800 charge per source order.
-- Per package: Administration ₦800, family support ₦200, rest of the paid
-- WEAVE unit cost goes to the Stability Lead for preparation. The selling
-- Agent's ₦1,000 gross margin is earned at subsequent Carrier retail sale.
-- Historical per-order rows are preserved for audit but are no longer written.
CREATE TABLE IF NOT EXISTS weave_food_forensic_stock_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product varchar(20) NOT NULL CHECK (product IN ('agility','electrolyte','ember')),
  source_order_id uuid NOT NULL,
  purchasing_agent_id uuid NOT NULL REFERENCES users(id),
  package_count integer NOT NULL CHECK (package_count>0),
  received_ngn numeric(14,2) NOT NULL CHECK (received_ngn>0),
  agent_expected_margin_ngn numeric(14,2) NOT NULL CHECK (agent_expected_margin_ngn>=0),
  administration_ngn numeric(14,2) NOT NULL CHECK (administration_ngn>=0),
  family_support_ngn numeric(14,2) NOT NULL CHECK (family_support_ngn>=0),
  lead_preparation_ngn numeric(14,2) NOT NULL CHECK (lead_preparation_ngn>0),
  retail_unit_price_ngn numeric(14,2) NOT NULL,
  unit_cost_ngn numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(product,source_order_id),
  CHECK (received_ngn=administration_ngn+family_support_ngn+lead_preparation_ngn)
);
CREATE TABLE IF NOT EXISTS weave_food_forensic_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id uuid NOT NULL REFERENCES weave_food_forensic_stock_splits(id) ON DELETE CASCADE,
  beneficiary varchar(24) NOT NULL CHECK (beneficiary IN ('administration','family_support','lead_manager')),
  amount_ngn numeric(14,2) NOT NULL CHECK(amount_ngn>0),
  status varchar(24) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','transfer_reported')),
  transfer_reference varchar(180) UNIQUE,
  bank_name varchar(120),
  destination_account_last4 varchar(4),
  transfer_note varchar(800),
  recorded_by uuid REFERENCES users(id),
  recorded_at timestamptz,
  UNIQUE(split_id,beneficiary)
);
CREATE INDEX IF NOT EXISTS weave_food_forensic_payout_queue_idx
  ON weave_food_forensic_payouts(status,beneficiary);

-- Pre-packed discount baskets through existing Farm-to-Family escrow and Carrier inventory.

    -- Ready-packed, independently counted food baskets published by approved
    -- Agent suppliers. Baseline uses that SAME supplier's active single offers.
    -- No fictitious availability or invented comparison price is created.
    CREATE TABLE IF NOT EXISTS weave_food_household_bundles (
      listing_id uuid PRIMARY KEY REFERENCES weave_food_surplus(id) ON DELETE CASCADE,
      farmer_id uuid NOT NULL REFERENCES weave_food_farmers(id),
      template_id varchar(40) NOT NULL,
      components jsonb NOT NULL,
      separate_listed_ngn numeric(18,2) NOT NULL CHECK(separate_listed_ngn>0),
      bundle_price_ngn numeric(18,2) NOT NULL CHECK(bundle_price_ngn>1000),
      listing_saving_ngn numeric(18,2) NOT NULL CHECK(listing_saving_ngn>0),
      stock_attested_separate boolean NOT NULL DEFAULT false CHECK(stock_attested_separate),
      created_at timestamptz NOT NULL DEFAULT NOW(),
      CHECK (separate_listed_ngn=bundle_price_ngn+listing_saving_ngn)
    );
