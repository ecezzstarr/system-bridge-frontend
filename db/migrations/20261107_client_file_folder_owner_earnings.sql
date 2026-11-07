-- Owner File Folder operating record; verified revenue is sourced from
-- client_customer_door_settlements, never inserted as synthetic earnings here.
-- Costs are owner-reported obligations and do not move funds.
CREATE TABLE IF NOT EXISTS client_file_folder_operating_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES users(id),
  file_number varchar(120) NOT NULL,
  store_id uuid NOT NULL REFERENCES client_business_stores(id),
  category varchar(48) NOT NULL CHECK (category IN (
    'production','fulfilment','staff_compensation','marketing','equipment','operations','other'
  )),
  amount numeric(30,8) NOT NULL CHECK (amount>0),
  currency varchar(20) NOT NULL CHECK (currency IN ('FLAME COIN','NGN','USD','EUR','GBP','USDT')),
  description varchar(300) NOT NULL,
  order_id uuid REFERENCES client_store_orders(id),
  system_id uuid REFERENCES client_built_systems(id),
  client_request_id varchar(80) NOT NULL,
  evidence_reference varchar(160),
  recorded_by uuid NOT NULL REFERENCES users(id),
  recorded_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (client_id,client_request_id)
);
CREATE INDEX IF NOT EXISTS idx_folder_costs_owner
  ON client_file_folder_operating_costs(client_id,file_number,recorded_at DESC);
