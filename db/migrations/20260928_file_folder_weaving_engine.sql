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
