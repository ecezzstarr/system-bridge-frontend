ALTER TABLE client_business_stores
  ADD COLUMN IF NOT EXISTS formation_status varchar(40) NOT NULL DEFAULT 'forming',
  ADD COLUMN IF NOT EXISTS formation_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS public_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_offer_published_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_wallet_required boolean NOT NULL DEFAULT false;

UPDATE client_business_stores
SET formation_due_at = COALESCE(formation_due_at, created_at + INTERVAL '3 days')
WHERE formation_due_at IS NULL;

ALTER TABLE client_store_items
  ADD COLUMN IF NOT EXISTS offer_type varchar(40) NOT NULL DEFAULT 'product';
