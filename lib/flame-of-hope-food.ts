import { getPool } from '@/lib/db'
import { getElectrolyteVariant } from '@/lib/electrolyte-catalog'
import { getEmberVariant } from '@/lib/ember-catalog'

export const FLAME_OF_HOPE_EVENT_KEY = 'flame-event-01'
export const FLAME_OF_HOPE_WEEK_SQL = "date_trunc('week', NOW() AT TIME ZONE 'Africa/Lagos')::date"
export const FLAME_OF_HOPE_ENABLED = () => process.env.WEAVE_FLAME_OF_HOPE_FOOD_ENABLED === 'true'
export const FLAME_OF_HOPE_PRODUCTS = [
  { id: 'electrolyte', label: getElectrolyteVariant('electrolyte')?.name || 'Electrolyte · Small Bowl', priceNgn: Number(getElectrolyteVariant('electrolyte')?.agentSellingUnitPriceNgn || 0) },
  { id: 'ember-small', label: getEmberVariant('ember-small')?.name || 'Ember · Small Box', priceNgn: Number(getEmberVariant('ember-small')?.agentSellingUnitPriceNgn || 0) },
] as const

export type HopeRewardId = typeof FLAME_OF_HOPE_PRODUCTS[number]['id']

export function foodThreshold(priceNgn:number,rateNgnPerSystemSwitch:number) {
  if (!Number.isFinite(rateNgnPerSystemSwitch) || rateNgnPerSystemSwitch <= 0)throw new Error('System Switch reference price unavailable')
  if (!Number.isFinite(priceNgn) || priceNgn <= 0)throw new Error('Food price unavailable')
  // Round *up* to six units of account, never round a qualification shortfall away.
  return Math.ceil(((priceNgn * 5) / rateNgnPerSystemSwitch) * 1_000_000) / 1_000_000
}

export function eligibleFood(spentSystemSwitch:number,rateNgnPerSystemSwitch:number) {
  return FLAME_OF_HOPE_PRODUCTS.filter(product => spentSystemSwitch + 0.00000001 >= foodThreshold(product.priceNgn,rateNgnPerSystemSwitch))
}

export async function ensureFlameOfHopeFoodSchema() {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS weave_flame_of_hope_claims (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      bridger_id uuid NOT NULL REFERENCES users(id),
      event_key varchar(48) NOT NULL,
      claim_week_start date NOT NULL,
      product_id varchar(32) NOT NULL CHECK(product_id IN ('electrolyte','ember-small')),
      product_price_ngn integer NOT NULL CHECK(product_price_ngn > 0),
      required_spend_system_switch numeric(20,6) NOT NULL CHECK(required_spend_system_switch > 0),
      actual_spend_system_switch numeric(20,6) NOT NULL CHECK(actual_spend_system_switch > 0),
      reference_rate_ngn numeric(20,6) NOT NULL CHECK(reference_rate_ngn > 0),
      fulfillment_status varchar(24) NOT NULL DEFAULT 'pending_fulfillment'
        CHECK (fulfillment_status IN ('pending_fulfillment','preparing','fulfilled')),
      fulfillment_reference varchar(240),
      fulfilled_by uuid REFERENCES users(id),
      fulfilled_at timestamptz,
      claimed_at timestamptz NOT NULL DEFAULT NOW(),
      UNIQUE (bridger_id,event_key,claim_week_start)
    )
  `)
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS weave_flame_of_hope_fulfillment_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      claim_id uuid NOT NULL REFERENCES weave_flame_of_hope_claims(id),
      actor_id uuid NOT NULL REFERENCES users(id),
      from_status varchar(24) NOT NULL,
      to_status varchar(24) NOT NULL,
      fulfillment_reference varchar(240),
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `)
}

export async function getWeeklyFoodSpend(
  db:{query:(sql:string,values?:unknown[])=>Promise<{rows:any[]}>},
  bridgerId:string,
) {
  // Only debit entries representing paid WEAVE goods/services count.
  // Pure transfers, withdrawals, play balances, casino bets, loans, referrals,
  // commission grants and reward credits do not qualify. Debit math is checked.
  const result = await db.query(`
    SELECT COALESCE(SUM(l.amount),0)::numeric AS spent
    FROM ledger_entries l
    WHERE l.user_id=$1::uuid
      AND l.created_at AT TIME ZONE 'Africa/Lagos' >= date_trunc('week',NOW() AT TIME ZONE 'Africa/Lagos')
      AND l.created_at AT TIME ZONE 'Africa/Lagos' < date_trunc('week',NOW() AT TIME ZONE 'Africa/Lagos') + interval '7 days'
      AND l.currency IN ('Flame Coin','System Switch')
      AND l.amount > 0
      AND l.balance_before IS NOT NULL AND l.balance_after IS NOT NULL
      AND l.balance_before - l.balance_after >= l.amount - 0.000001
      AND (
        (l.entry_type='prospect_package_purchase' AND l.metadata->>'commerce_type'='prospect_package_purchase')
        OR (l.entry_type='fee' AND (
          l.metadata->>'commerce_type' IN ('email_prospect_purchase','whatsapp_number_order','whatsapp_number_purchase','river_voice_call')
          OR (l.metadata->>'commerce_type'='purchase' AND l.metadata->>'source' IN ('agentic_bridger_one_time','bridge_ai_template_open'))
        ))
      )
  `,[bridgerId])
  return Number(result.rows[0]?.spent || 0)
}
