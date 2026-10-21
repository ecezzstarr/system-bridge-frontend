// Distribution salary is a monthly, team-gated employment entitlement.
// The existing referral-bonus ledger is the sole payment source for referral
// bonuses. This calculation MUST NOT create a second wallet credit.
export const DISTRIBUTION_REFERRAL_RATE_NGN = 500
export const DISTRIBUTION_TEAM_TARGET = 500

export function calculateDistributionTeamCompensation({
  teamReferrals, ownReferrals, monthlySalaryNgn, monthClosed = false,
}:{
  teamReferrals:number
  ownReferrals:number
  monthlySalaryNgn:number
  monthClosed?:boolean
}) {
  const qualifiedTeamReferrals=Math.max(0,Math.floor(Number(teamReferrals)||0))
  const qualifiedOwnReferrals=Math.max(0,Math.floor(Number(ownReferrals)||0))
  const agreedSalaryNgn=Math.max(0,Math.round(Number(monthlySalaryNgn)||0))
  const teamQualified=qualifiedTeamReferrals>=DISTRIBUTION_TEAM_TARGET
  const salaryEntitlementNgn=teamQualified?agreedSalaryNgn:0
  const individualReferralBonusNgn=qualifiedOwnReferrals*DISTRIBUTION_REFERRAL_RATE_NGN
  return {
    teamTarget:DISTRIBUTION_TEAM_TARGET,
    teamReferrals:qualifiedTeamReferrals,
    teamQualified,
    monthlySalaryNgn:agreedSalaryNgn,
    salaryEntitlementNgn,
    individualReferrals:qualifiedOwnReferrals,
    individualReferralBonusNgn,
    illustrativeCombinedNgn:salaryEntitlementNgn+individualReferralBonusNgn,
    // The ongoing month is a preview, never proof that salary or bonus was paid.
    periodStatus:monthClosed?'month_closed_requires_forensic_payroll_verification':'provisional_current_month',
    referralPaymentSource:'existing_referral_bonus_awards_ledger',
    salaryPaymentSource:'forensic_payroll_approval_required',
    paymentRule:'full_salary_only_if_team_reaches_500_else_referrals_only',
  } as const
}
