-- Weave system spine migration
-- Apply from Google Cloud Shell against the production PostgreSQL database before deployment.

CREATE TABLE IF NOT EXISTS system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type varchar(100) NOT NULL,
  actor_id uuid,
  actor_role varchar(40),
  subject_type varchar(80),
  subject_id varchar(160),
  source varchar(120),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_system_events_subject ON system_events(subject_type, subject_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_actor ON system_events(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_type ON system_events(event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS file_folder_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL,
  file_number varchar(120),
  amount_trx numeric(30,8) NOT NULL,
  bridger_amount_trx numeric(30,8) NOT NULL,
  agent_amount_trx numeric(30,8) NOT NULL,
  company_amount_trx numeric(30,8) NOT NULL,
  client_vault_amount_trx numeric(30,8) NOT NULL,
  bridger_id uuid,
  agent_id uuid,
  client_id uuid,
  status varchar(40) NOT NULL DEFAULT 'pending_assignment',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  distributed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_file_folder_distributions_purchase ON file_folder_distributions(purchase_id);
CREATE INDEX IF NOT EXISTS idx_file_folder_distributions_status ON file_folder_distributions(status, created_at DESC);

-- Canonical File Folder economics: 30% Bridger / 5% Agent / 35% Company / 30% Client Vault.
