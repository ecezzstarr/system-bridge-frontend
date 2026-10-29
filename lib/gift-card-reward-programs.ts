import { sql } from '@/lib/db'

export async function ensureGiftCardRewardProgramsSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS weave_gift_card_reward_programs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      program_key VARCHAR(40) NOT NULL UNIQUE,
      platform_name VARCHAR(120) NOT NULL,
      platform_url TEXT NOT NULL,
      reward_summary TEXT NOT NULL,
      qualification_summary TEXT NOT NULL,
      cash_reward_ngn INTEGER NOT NULL DEFAULT 0 CHECK (cash_reward_ngn >= 0),
      coupon_reward_ngn INTEGER NOT NULL DEFAULT 0 CHECK (coupon_reward_ngn >= 0),
      referral_summary TEXT NOT NULL DEFAULT '',
      offer_source_url TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS weave_gift_card_reward_enrollments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      participant_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      program_key VARCHAR(40) NOT NULL REFERENCES weave_gift_card_reward_programs(program_key),
      platform_profile_reference VARCHAR(180) NOT NULL,
      authorization_note TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','approved','active','held','closed')),
      first_trade_reference VARCHAR(180),
      first_trade_evidence TEXT,
      reward_evidence TEXT,
      participant_agreed BOOLEAN NOT NULL DEFAULT FALSE,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ,
      reviewed_by UUID REFERENCES users(id),
      UNIQUE(participant_user_id, program_key, platform_profile_reference)
    )
  `
  await sql`
    INSERT INTO weave_gift_card_reward_programs
      (program_key,platform_name,platform_url,reward_summary,qualification_summary,cash_reward_ngn,coupon_reward_ngn,referral_summary,offer_source_url,checked_at)
    VALUES
      ('cardgoal','Cardgoal','https://cardgoal.store/','Advertised welcome package: ₦400 cash plus ₦2,300 in coupons (₦2,700 total advertised value).','Enter a valid invitation code and sell at least ₦20,000 in gift cards within 72 hours. Check the current app terms; coupons are not cash.','400','2300','Advertises ₦500 per successful referral, subject to qualifying activity.','https://blog.cardgoal.com/cardgoal-refer--earn-program-just-leveled-up-get-500-per-sign-up-now.html',NOW()),
      ('cardcosmic','CardCosmic','https://www.cardcosmics.com/','Advertised ₦3,000 welcome cash reward.','Reward is advertised as withdrawable after the first successful eligible gift-card trade; registration alone does not unlock withdrawal.','3000','0','Advertises a 1% bonus on eligible successful trades by referred users, subject to its rules.','https://help.cardlaxy.com/en/articles/11514912-about-welcome-reward',NOW())
    ON CONFLICT (program_key) DO UPDATE SET
      platform_name=EXCLUDED.platform_name,
      platform_url=EXCLUDED.platform_url,
      reward_summary=EXCLUDED.reward_summary,
      qualification_summary=EXCLUDED.qualification_summary,
      cash_reward_ngn=EXCLUDED.cash_reward_ngn,
      coupon_reward_ngn=EXCLUDED.coupon_reward_ngn,
      referral_summary=EXCLUDED.referral_summary,
      offer_source_url=EXCLUDED.offer_source_url,
      checked_at=NOW(),
      updated_at=NOW()
  `
}
