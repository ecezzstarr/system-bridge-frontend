-- Migration: Departmental Registration Gate
-- Date: 2026-09-01

CREATE TABLE IF NOT EXISTS departmental_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    department VARCHAR(20) NOT NULL, -- 'AGENT' or 'BRIDGER'
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'USED', 'EXPIRED', 'REVOKED'
    issued_by UUID, -- Admin user ID
    issued_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    used_by UUID, -- User ID who used the code
    used_at TIMESTAMPTZ,
    registration_request_id UUID, -- Optional reference to a request
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add audit log table for departmental entry
CREATE TABLE IF NOT EXISTS departmental_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event VARCHAR(50) NOT NULL,
    department VARCHAR(20) NOT NULL,
    administration_actor UUID,
    target_user UUID,
    code_id UUID,
    result VARCHAR(50),
    metadata JSONB,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_dept_codes_code ON departmental_codes(code);
CREATE INDEX IF NOT EXISTS idx_dept_codes_status ON departmental_codes(status);
CREATE INDEX IF NOT EXISTS idx_dept_codes_department ON departmental_codes(department);
