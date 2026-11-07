-- An independently verified external Client Pro staff invite is delivered only
-- to the email attached to their approved company offer, never exposed by
-- knowing a File Number or public verification reference.
CREATE TABLE IF NOT EXISTS pro_client_registration_invitation_delivery (
  verification_id uuid PRIMARY KEY REFERENCES pro_file_number_verifications(id) ON DELETE CASCADE,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  sent_count integer NOT NULL DEFAULT 0,
  last_sent_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
