-- Company Guidance support staff are departmental assignments carried by
-- existing Agent or Bridger positions, not independently authenticated roles.
-- Re-applications reuse a unique user+department record. An approved status
-- is still subject to live account status and Lifestyle entitlement.
CREATE TABLE IF NOT EXISTS weave_guidance_staff_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_role varchar(16) NOT NULL CHECK (source_role IN ('agent','bridger')),
  department varchar(24) NOT NULL CHECK (department IN ('mandate','forensic','lawyer')),
  application_note varchar(1500) NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','revoked')),
  reviewer_id uuid REFERENCES users(id),
  review_note varchar(2000),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(user_id,department)
);
CREATE INDEX IF NOT EXISTS weave_guidance_staff_queue_idx
 ON weave_guidance_staff_applications(status,created_at DESC);
CREATE INDEX IF NOT EXISTS weave_guidance_staff_active_idx
 ON weave_guidance_staff_applications(user_id,department)
 WHERE status='approved';

-- Match the read receipts already used by Administration Company Guidance.
ALTER TABLE lounge_messages ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;
