-- Fixes schema drift: market_prospect_contacts was missing the status
-- column that lib/market.ts has always relied on, and had package_id/name
-- as NOT NULL even though generateNumberSeries() creates contacts before
-- they're assigned to a package or given a name.
ALTER TABLE market_prospect_contacts ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'available';
ALTER TABLE market_prospect_contacts ALTER COLUMN package_id DROP NOT NULL;
ALTER TABLE market_prospect_contacts ALTER COLUMN name DROP NOT NULL;
