-- WEAVE live infrastructure registry, deployment audit, and Divine Shield.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS weave_infrastructure_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_key VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  kind VARCHAR(40) NOT NULL DEFAULT 'service',
  deployment_target VARCHAR(40) NOT NULL DEFAULT 'cloudrun',
  public_url TEXT,
  health_path VARCHAR(255) NOT NULL DEFAULT '/api/health',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weave_platform_controls (
  control_key VARCHAR(80) PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  title VARCHAR(255),
  message TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weave_deployment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(40) NOT NULL,
  source_ref VARCHAR(255),
  provider VARCHAR(40) NOT NULL DEFAULT 'google-cloud-build',
  external_id VARCHAR(255),
  status VARCHAR(40) NOT NULL DEFAULT 'requested',
  requested_by UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO weave_platform_controls(control_key,enabled,title,message)
VALUES(
  'divine_shield',
  FALSE,
  'WEAVE is under maintenance',
  'The system is being refined. Participation will reopen when Administration releases the Divine Shield.'
)
ON CONFLICT(control_key) DO NOTHING;

INSERT INTO weave_infrastructure_systems(system_key,name,kind,deployment_target,public_url,health_path,metadata)
VALUES
('weave-public','WEAVINGSYSTEM.ONLINE · WEAVE Public App','application','cloudrun','https://weavingsystem.online','/api/health','{"role":"public"}'::jsonb),
('weave-admin','SSBNOW.ONLINE · Administration Workshop','application','cloudrun','https://ssbnow.online','/api/health','{"role":"administration"}'::jsonb),
('weave-client','SSBNOW.SHOP · Client Service Portal','application','cloudrun','https://ssbnow.shop','/api/health','{"role":"client-service"}'::jsonb),
('system-bridge-frontend','System Bridge Frontend · Cloud Run Runtime','runtime','cloudrun','https://system-bridge-frontend-823579957639.us-central1.run.app','/api/health','{"project":"ssbr-495208","region":"us-central1","service":"system-bridge-frontend"}'::jsonb),
('api-server','API Server','service','cloudrun','https://api-server-823579957639.us-central1.run.app','/health','{"legacy":true}'::jsonb),
('ssbnow-core','SSBNOW Core','service','cloudrun','https://ssbnow-core-823579957639.us-central1.run.app','/health','{"legacy":true}'::jsonb),
('ssbnowshop-service','SSBNOW Shop Service','service','cloudrun','https://ssbnowshop-823579957639.us-central1.run.app','/health','{"legacy":true}'::jsonb),
('eight-runtime','EIGHT · Infrastructure Operator','intelligence','cloudrun',NULL,'/api/health','{"scope":"administration","web":"read-only","deploy":"cloud-build-trigger"}'::jsonb)
ON CONFLICT(system_key) DO UPDATE SET
  name=EXCLUDED.name,
  kind=EXCLUDED.kind,
  deployment_target=EXCLUDED.deployment_target,
  public_url=EXCLUDED.public_url,
  health_path=EXCLUDED.health_path,
  metadata=weave_infrastructure_systems.metadata || EXCLUDED.metadata,
  updated_at=NOW();
