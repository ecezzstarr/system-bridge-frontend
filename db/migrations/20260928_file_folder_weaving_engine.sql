-- Main File Folder weaving engine.
-- Extends existing Client routes instead of creating a parallel connection system.
ALTER TABLE client_business_routes
  ADD COLUMN IF NOT EXISTS source_output varchar(120) NOT NULL DEFAULT 'movement',
  ADD COLUMN IF NOT EXISTS target_input varchar(120) NOT NULL DEFAULT 'movement',
  ADD COLUMN IF NOT EXISTS integration_type varchar(40) NOT NULL DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS authority_state varchar(40) NOT NULL DEFAULT 'client_authorized';

COMMENT ON COLUMN client_business_routes.source_output IS 'Named capability or movement emitted by the source Client system.';
COMMENT ON COLUMN client_business_routes.target_input IS 'Named capability or movement accepted by the target Client system.';
COMMENT ON COLUMN client_business_routes.integration_type IS 'Connection behavior: direct, verified, automated, or AI-assisted.';
COMMENT ON COLUMN client_business_routes.authority_state IS 'Human authority state for the weave. AI assistance does not grant authorization.';

-- Field evidence belongs to completed Client system operations, not to capital spend.
ALTER TABLE client_built_system_entries
  ADD COLUMN IF NOT EXISTS evidence_type varchar(40) NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS evidence_value numeric(18,4),
  ADD COLUMN IF NOT EXISTS evidence_unit varchar(40),
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

COMMENT ON COLUMN client_built_system_entries.evidence_type IS 'Operation evidence classification: internal, customer_use, visitor_use, fulfilment, delivery, service, or revenue.';
COMMENT ON COLUMN client_built_system_entries.evidence_value IS 'Optional measured quantity attached to the operation evidence.';
COMMENT ON COLUMN client_built_system_entries.evidence_unit IS 'Optional unit for evidence_value.';
COMMENT ON COLUMN client_built_system_entries.completed_at IS 'Time the operation became completed field evidence.';

