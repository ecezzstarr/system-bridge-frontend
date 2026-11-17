import {getPool} from '@/lib/db'
import {ensureRegionalOperationsSchema} from '@/lib/regional-manager-operations'
import {SUNSHINE_ENROLLMENT_TARGET_SS} from '@/lib/sunshine-continuity'

/**
 * Sunrise/Sunshine support is a separate consumer-credit product.
 * No disbursement is lawful/operational merely because a user requested it.
 * Independent interest verification, written informed consent, regulatory
 * approval and a genuinely funded manager wallet are mandatory.
 */
export const SUNSHINE_ADVANCE_FRACTION=0.70
export const SUNSHINE_INTEREST_FEE_FRACTION=0.10
export const SUNSHINE_CREDIT_RELEASE_ENABLED=process.env.SUNSHINE_CREDIT_RELEASE_ENABLED==='true'
export {SUNSHINE_ENROLLMENT_TARGET_SS}
const round6=(v:number)=>Math.round(v*1e6)/1e6
const floor6=(v:number)=>Math.floor(v*1e6+1e-8)/1e6
export type InterestPeriod='daily'|'monthly'

export function calculateSunshineSupport(netInterestNgn:number,rateNgnPerSystemSwitch:number){
  if(!Number.isFinite(netInterestNgn)||netInterestNgn<=0||netInterestNgn>1e12||
    !Number.isFinite(rateNgnPerSystemSwitch)||rateNgnPerSystemSwitch<=0)
    throw new Error('Interest and verified NGN/System Switch quotation must be positive')
  const exactInterestSwitch=netInterestNgn/rateNgnPerSystemSwitch
  const bankInterestSwitch=round6(exactInterestSwitch)
  // Round the advance and fee down against unrounded interest so a quotation
  // can never exceed 70% support or 10% company share by rounding up.
  const maximumAdvanceSwitch=floor6(exactInterestSwitch*SUNSHINE_ADVANCE_FRACTION)
  const companyInterestShareSwitch=floor6(exactInterestSwitch*SUNSHINE_INTEREST_FEE_FRACTION)
  const repaymentSwitch=round6(maximumAdvanceSwitch+companyInterestShareSwitch)
  const retainedInterestSwitch=round6(exactInterestSwitch-repaymentSwitch)
  if(maximumAdvanceSwitch<=0||retainedInterestSwitch<0)
    throw new Error('Bank interest too small for a valid Sunshine quote')
  return {bankInterestSwitch,maximumAdvanceSwitch,companyInterestShareSwitch,
    repaymentSwitch,retainedInterestSwitch,rateNgnPerSystemSwitch,
    advancePercent:70,interestFeePercent:10}
}
export async function ensureSunshineFinanceSchema(){
 await ensureRegionalOperationsSchema()
 const db=getPool()
 await db.query(`CREATE TABLE IF NOT EXISTS weave_sunshine_manager_assignments(
   user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
   manager_id uuid NOT NULL REFERENCES users(id),
   assigned_by uuid NOT NULL REFERENCES users(id),
   active boolean NOT NULL DEFAULT true,
   created_at timestamptz NOT NULL DEFAULT now(),
   updated_at timestamptz NOT NULL DEFAULT now()
 )`)
 await db.query(`CREATE TABLE IF NOT EXISTS weave_sunshine_support_advances(
   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   request_id uuid NOT NULL UNIQUE,
   user_id uuid NOT NULL REFERENCES weave_sunshine_savings_plans(user_id),
   manager_id uuid NOT NULL REFERENCES weave_regional_manager_appointments(user_id),
   bank_product varchar(40) NOT NULL,
   interest_period varchar(8) NOT NULL CHECK(interest_period IN ('daily','monthly')),
   expected_net_interest_ngn numeric(18,2) NOT NULL CHECK(expected_net_interest_ngn>0),
   rate_ngn_per_switch numeric(20,8) NOT NULL CHECK(rate_ngn_per_switch>0),
   bank_interest_switch numeric(20,6) NOT NULL CHECK(bank_interest_switch>0),
   maximum_advance_switch numeric(20,6) NOT NULL CHECK(maximum_advance_switch>0),
   company_fee_switch numeric(20,6) NOT NULL CHECK(company_fee_switch>=0),
   repayment_switch numeric(20,6) NOT NULL CHECK(repayment_switch>=maximum_advance_switch),
   evidence_reference varchar(160) NOT NULL,
   verification_reference varchar(180),
   settlement_reference varchar(180),
   terms_accepted_at timestamptz,
   interest_verified_by uuid REFERENCES users(id),
   settlement_verified_by uuid REFERENCES users(id),
   funded_by uuid REFERENCES users(id),
   funded_at timestamptz,
   repaid_at timestamptz,
   rejected_by uuid REFERENCES users(id),
   rejection_reason text,
   status varchar(30) NOT NULL DEFAULT 'requested'
      CHECK(status IN ('requested','interest_verified','terms_accepted','funded','interest_received','repaid','rejected')),
   created_at timestamptz NOT NULL DEFAULT now(),
   updated_at timestamptz NOT NULL DEFAULT now()
 )`)
 await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_sunshine_one_active_advance
   ON weave_sunshine_support_advances(user_id)
   WHERE status IN ('requested','interest_verified','terms_accepted','funded','interest_received')`)
 await db.query('CREATE INDEX IF NOT EXISTS idx_sunshine_advances_manager ON weave_sunshine_support_advances(manager_id,status,created_at DESC)')
}
