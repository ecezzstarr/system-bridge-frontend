-- Additive Pro Regional Manager policy migration for new Agent/Bridger appointments.
-- No existing approved salary agreements, Client Pro activations, File Numbers,
-- payroll records or payment receipts are rewritten.
ALTER TABLE weave_pro_regional_manager_applications
  ADD COLUMN IF NOT EXISTS compensation_model varchar(32) NOT NULL DEFAULT 'legacy_salary';
ALTER TABLE weave_pro_regional_manager_applications
  ADD COLUMN IF NOT EXISTS monthly_profit_share_bps integer NOT NULL DEFAULT 0;
ALTER TABLE weave_pro_regional_manager_applications
  ADD COLUMN IF NOT EXISTS approved_continent varchar(20);
ALTER TABLE weave_pro_regional_manager_applications
  ADD COLUMN IF NOT EXISTS approved_activation_fee_usdt numeric(16,2);

ALTER TABLE weave_pro_regional_manager_activations
  ADD COLUMN IF NOT EXISTS quoted_fee_usdt numeric(16,2);
ALTER TABLE weave_pro_regional_manager_activations
  ADD COLUMN IF NOT EXISTS activation_continent varchar(20);
ALTER TABLE weave_pro_regional_manager_activations
  ADD COLUMN IF NOT EXISTS compensation_model varchar(32);
ALTER TABLE weave_pro_regional_manager_activations
  ADD COLUMN IF NOT EXISTS profit_share_bps integer;

-- Only newly approved profit-share appointments use the new policy.
-- Africa prices must be positive but strictly below 60 USDT. Europe is 680.
-- A cost proposal is not a payment receipt or a verified company liability.
ALTER TABLE weave_pro_regional_manager_applications
  ADD CONSTRAINT weave_pro_manager_new_quote_valid CHECK (
    compensation_model <> 'profit_share' OR (
      monthly_profit_share_bps = 2000 AND
      agreed_monthly_salary_usdt IS NULL AND (
        (approved_continent = 'africa' AND approved_activation_fee_usdt > 0 AND approved_activation_fee_usdt < 60)
        OR (approved_continent = 'europe' AND approved_activation_fee_usdt = 680)
      )
    )
  ) NOT VALID;
-- Existing unmodified salary contracts are not subjected to the new condition.
