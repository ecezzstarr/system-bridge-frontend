-- Security lockdown: there must be exactly one active platform administrator.
-- Apply this migration from Google Cloud Shell before production deployment.

DO $$
DECLARE admin_count integer;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin' AND is_active = true;
  IF admin_count <> 1 THEN
    RAISE EXCEPTION 'SECURITY LOCK: expected exactly 1 active admin, found %; correct the users table before applying lockdown', admin_count;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS users_single_active_admin_idx
  ON users (role)
  WHERE role = 'admin' AND is_active = true;

-- Prevent sensitive API responses from being cached by shared intermediaries.
-- Application routes also set explicit no-store/private cache headers where needed.
