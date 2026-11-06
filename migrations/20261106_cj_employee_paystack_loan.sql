-- CJ Dorado keeps the original issued File Number and one existing Client identity.
-- No migration creates a new Client, marks a loan funded, or fabricates a repayment.
-- Terms and independently verified 680 USDT funding are entered through Administration.
CREATE TABLE IF NOT EXISTS cj_loan_access_grants (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 client_id uuid NOT NULL REFERENCES users(id),
 token_hash char(64) NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS cj_loan_paystack_payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 client_id uuid NOT NULL REFERENCES users(id),
 reference varchar(100) UNIQUE NOT NULL,
 amount_usdt numeric(16,2) NOT NULL,
 amount_ngn numeric(18,2) NOT NULL,
 rate_ngn_per_usdt numeric(18,4) NOT NULL,
 status varchar(20) NOT NULL DEFAULT 'pending',
 verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
-- Paystack verification is not an Administration employee's personal attestation.
ALTER TABLE client_folder_loan_repayments
 ADD COLUMN IF NOT EXISTS verification_method varchar(32) NOT NULL DEFAULT 'administration';
ALTER TABLE client_folder_loan_repayments
 ALTER COLUMN verified_by DROP NOT NULL;
COMMENT ON COLUMN client_folder_loan_repayments.verification_method IS
 'administration = verified by named reviewer; paystack_provider = independently verified via Paystack transaction endpoint';
