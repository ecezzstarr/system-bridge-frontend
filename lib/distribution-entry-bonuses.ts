import type { PoolClient } from 'pg'
import { getPool } from './db'

export const DISTRIBUTION_SALARY_NGN = { regional: 100_000, lead: 70_000, assistant: 45_000 }

export async function ensureDistributionEntryBonusSchema() {
  await getPool().query(`CREATE TABLE IF NOT EXISTS weave_distribution_entry_bonuses (
    ticket_id uuid PRIMARY KEY REFERENCES departmental_entry_tickets(id),
    registrant_id uuid NOT NULL UNIQUE REFERENCES users(id),
    referrer_id uuid NOT NULL REFERENCES users(id),
    regional_manager_id uuid NOT NULL REFERENCES users(id),
    amount_kobo bigint NOT NULL CHECK (amount_kobo > 0),
    bonus_kobo bigint NOT NULL CHECK (bonus_kobo >= 0),
    registered_at timestamptz NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_distribution_entry_bonus_region
    ON weave_distribution_entry_bonuses(regional_manager_id, registered_at);
  CREATE TABLE IF NOT EXISTS weave_distribution_entry_bonus_splits (
    regional_manager_id uuid NOT NULL REFERENCES users(id),
    month_start date NOT NULL,
    allocations jsonb NOT NULL,
    total_kobo bigint NOT NULL,
    recorded_at timestamptz NOT NULL DEFAULT NOW(),
    PRIMARY KEY(regional_manager_id, month_start)
  );
  CREATE TABLE IF NOT EXISTS weave_distribution_salary_reviews (
    regional_manager_id uuid NOT NULL REFERENCES users(id),
    month_start date NOT NULL,
    reviewed_by uuid NOT NULL REFERENCES users(id),
    approved boolean NOT NULL,
    note text NOT NULL,
    salary_terms jsonb NOT NULL,
    reviewed_at timestamptz NOT NULL DEFAULT NOW(),
    PRIMARY KEY(regional_manager_id, month_start)
  );
  CREATE TABLE IF NOT EXISTS weave_distribution_entry_corrections (
    ticket_id uuid PRIMARY KEY REFERENCES weave_distribution_entry_bonuses(ticket_id),
    recorded_by uuid NOT NULL REFERENCES users(id),
    reason text NOT NULL,
    recorded_at timestamptz NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS weave_distribution_payments (
    regional_manager_id uuid NOT NULL REFERENCES users(id),
    month_start date NOT NULL,
    recipient_id uuid NOT NULL REFERENCES users(id),
    kind text NOT NULL CHECK(kind IN ('salary','bonus')),
    amount_kobo bigint NOT NULL CHECK(amount_kobo > 0),
    reference text NOT NULL UNIQUE,
    recorded_by uuid NOT NULL REFERENCES users(id),
    recorded_at timestamptz NOT NULL DEFAULT NOW(),
    PRIMARY KEY(regional_manager_id,month_start,recipient_id,kind)
  )`)
}

export async function recordDistributionEntryBonus(
  db: PoolClient, codeId: string, registrantId: string, referrerId: string, regionId: string,
) {
  await db.query(`INSERT INTO weave_distribution_entry_bonuses
    (ticket_id,registrant_id,referrer_id,regional_manager_id,amount_kobo,bonus_kobo)
    SELECT t.id,$2::uuid,$3::uuid,$4::uuid,ROUND(t.amount_ngn*100),ROUND(t.amount_ngn*30)
    FROM departmental_codes c
    JOIN departmental_entry_tickets t ON t.id=c.registration_request_id
    WHERE c.id=$1::uuid AND c.status='USED' AND c.used_by=$2::uuid
      AND t.status='CODE_ISSUED' AND t.verified_at IS NOT NULL AND t.amount_ngn>0
      AND NULLIF(t.payment_reference,'') IS NOT NULL
      AND NOT EXISTS(SELECT 1 FROM department_entry_loan_requests l WHERE l.ticket_id=t.id
        AND l.status IN ('approved','registered'))
    ON CONFLICT(ticket_id) DO NOTHING`, [codeId,registrantId,referrerId,regionId])
}


export const distributionPayableSql = `
  SELECT regional_manager_id, month_start, (term->>'userId')::uuid AS recipient_id,
    'salary'::text AS kind, ROUND((term->>'salaryNgn')::numeric * 100)::bigint AS amount_kobo
  FROM weave_distribution_salary_reviews CROSS JOIN LATERAL jsonb_array_elements(salary_terms) term
  WHERE approved
  UNION ALL
  SELECT regional_manager_id, month_start, (allocation->>'userId')::uuid,
    'bonus'::text, (allocation->>'kobo')::bigint
  FROM weave_distribution_entry_bonus_splits CROSS JOIN LATERAL jsonb_array_elements(allocations) allocation
  WHERE (allocation->>'kobo')::bigint > 0
`
