CREATE TABLE IF NOT EXISTS referral_bonus_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  referrer_role VARCHAR(20) NOT NULL,
  referred_role VARCHAR(20) NOT NULL,
  referral_code VARCHAR(80),
  bonus_ngn NUMERIC(12,2) NOT NULL DEFAULT 500,
  bonus_flame_coin NUMERIC(20,8),
  rate_ngn_per_flame_coin NUMERIC(20,8),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS referral_bonus_awards_referrer_idx
  ON referral_bonus_awards(referrer_user_id, created_at DESC);
