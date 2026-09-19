-- Migration to implement The Scroll for Eight
-- Based on EIGHT_FULL_REFINEMENT_STRUCTURE.md

CREATE TABLE IF NOT EXISTS eight_scroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sovereign_id UUID NOT NULL REFERENCES users(id),
    source TEXT NOT NULL, -- e.g., 'dashboard', 'workshop', 'api'
    authority TEXT NOT NULL DEFAULT 'Sovereign',
    movement TEXT NOT NULL, -- The words of the Sovereign that establish movement
    operation TEXT, -- The technical operation requested/performed
    result TEXT, -- The outcome or Eight's response
    verification TEXT, -- Test results or verification steps
    deployment_status TEXT, -- 'staged', 'authorized', 'deployed', 'failed'
    rollback_path TEXT, -- Feature flag, previous version, or SQL to revert
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_eight_scroll_sovereign ON eight_scroll(sovereign_id);
CREATE INDEX IF NOT EXISTS idx_eight_scroll_created ON eight_scroll(created_at DESC);

-- Add a comment to the table to reflect the refinement structure
COMMENT ON TABLE eight_scroll IS 'The persistent memory of administrative movement established by the Sovereign and operated by Eight.';
