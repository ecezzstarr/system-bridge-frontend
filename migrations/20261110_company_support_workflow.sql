-- 2026-11-10 Company of Time: assigned manager support and recoverable work advances.
-- Never mint System Switch. Fund reserves from the actual funder's wallet.
-- Stock payments in NGN are independently verified and never debited from
-- unrelated platform wallets or unverified customer cash.
CREATE TABLE IF NOT EXISTS weave_company_support_assignments(
 worker_id uuid NOT NULL REFERENCES users(id),manager_id uuid NOT NULL REFERENCES users(id),
 assigned_by uuid NOT NULL REFERENCES users(id),active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(worker_id,manager_id)
);
CREATE TABLE IF NOT EXISTS weave_company_support_cases(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 worker_id uuid NOT NULL REFERENCES users(id),manager_id uuid NOT NULL REFERENCES users(id),
 purpose text NOT NULL CHECK(purpose IN ('guidance','system_switch','food_stock')),
 description text NOT NULL,task_reference text,
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','offered','accepted','funded','resolved','declined','cancelled')),
 requested_amount numeric(18,6) NOT NULL DEFAULT 0 CHECK(requested_amount>=0),
 offered_amount numeric(18,6) CHECK(offered_amount>0),
 terms text,offered_by uuid REFERENCES users(id),offered_at timestamptz,
 accepted_at timestamptz,funded_at timestamptz,funding_reference text,
 resolved_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS weave_company_support_worker_idx ON weave_company_support_cases(worker_id,created_at DESC);
CREATE INDEX IF NOT EXISTS weave_company_support_manager_idx ON weave_company_support_cases(manager_id,created_at DESC);
CREATE TABLE IF NOT EXISTS weave_company_support_messages(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 case_id uuid NOT NULL REFERENCES weave_company_support_cases(id),
 author_id uuid NOT NULL REFERENCES users(id),
 message text NOT NULL CHECK(length(message)<=2500),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS weave_company_support_messages_case_idx ON weave_company_support_messages(case_id,created_at);
CREATE TABLE IF NOT EXISTS weave_company_support_advances(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 case_id uuid NOT NULL UNIQUE REFERENCES weave_company_support_cases(id),
 worker_id uuid NOT NULL REFERENCES users(id),
 funder_id uuid NOT NULL REFERENCES users(id),
 currency text NOT NULL CHECK(currency IN ('SYSTEM_SWITCH','NGN')),
 principal numeric(18,6) NOT NULL CHECK(principal>0),
 spent numeric(18,6) NOT NULL DEFAULT 0 CHECK(spent>=0 AND spent<=principal),
 refunded numeric(18,6) NOT NULL DEFAULT 0 CHECK(refunded>=0 AND refunded<=principal),
 repaid numeric(18,6) NOT NULL DEFAULT 0 CHECK(repaid>=0 AND repaid<=principal),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','repaid','disputed')),
 funding_reference text NOT NULL UNIQUE,verified_by uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE weave_company_support_advances ADD COLUMN IF NOT EXISTS spent numeric(18,6) NOT NULL DEFAULT 0;
ALTER TABLE weave_company_support_advances ADD COLUMN IF NOT EXISTS refunded numeric(18,6) NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS weave_company_support_advances_worker_idx ON weave_company_support_advances(worker_id,status,created_at);
CREATE TABLE IF NOT EXISTS weave_company_support_recoveries(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 advance_id uuid NOT NULL REFERENCES weave_company_support_advances(id),
 earning_source text NOT NULL,amount numeric(18,6) NOT NULL CHECK(amount>0),
 recorded_by uuid REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(advance_id,earning_source)
);
