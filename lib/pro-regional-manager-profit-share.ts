/**
 * Agent/Bridger Pro managers own their business and serve WEAVE under a
 * voluntarily signed 20% monthly NET business-profit participation agreement.
 * This is not a salary, a share of gross sales, or an automatic wallet debit.
 * Existing independently signed salary appointments remain legacy agreements.
 */
export const PRO_MANAGER_PROFIT_SHARE_BPS = 2000 as const
export const PRO_MANAGER_PROFIT_SHARE_RATE = PRO_MANAGER_PROFIT_SHARE_BPS / 10000
export const PRO_MANAGER_EUROPE_ACTIVATION_USDT = 680 as const
export const PRO_MANAGER_PROFIT_TERMS_VERSION = 'PRO-REGIONAL-MANAGER-2026-11-PROFIT-SHARE'
export type ProManagerCompensationModel = 'profit_share' | 'legacy_salary'
export type ProManagerActivationContinent = 'africa' | 'europe'

/** Administrations independently verifies operating location; never infer it
 * from IP, location spoofable profile, currency or the applicant's selection. */
export function validateProManagerActivationQuote(continent: unknown, amount: unknown) {
  if(continent!=='africa' && continent!=='europe')
    throw new Error('An approved Africa or Europe operating continent is required; other continents have no published Pro fee yet.')
  const fee=Number(amount)
  if(!Number.isFinite(fee) || Math.round(fee*100)!==fee*100)
    throw new Error('Enter an exact USDT amount with at most two decimal places.')
  if(continent==='africa' && (fee<=0 || fee>=60))
    throw new Error('The approved Africa Pro activation fee must be greater than zero and below 60 USDT.')
  if(continent==='europe' && fee!==PRO_MANAGER_EUROPE_ACTIVATION_USDT)
    throw new Error('The Europe Pro activation quote is exactly 680 USDT.')
  return {continent,feeUSDT:fee}
}

type AppointmentRecord = {
  compensation_model?:string|null
  agreed_monthly_salary_usdt?:number|string|null
  monthly_profit_share_bps?:number|string|null
  approved_activation_fee_usdt?:number|string|null
  approved_continent?:string|null
  employment_terms_reference?:string|null
}

/** Old approved salary agreements and payments keep their original fee.
 * A new profit-share appointment must have a verified individually quoted fee.
 */
export function proManagerApprovalState(row:AppointmentRecord) {
  const model=row.compensation_model||'legacy_salary'
  const reference=String(row.employment_terms_reference||'').trim()
  if(reference.length<8)return null
  if(model==='legacy_salary') {
    if(!(Number(row.agreed_monthly_salary_usdt)>0))return null
    return {model:'legacy_salary' as const,feeUSDT:PRO_MANAGER_EUROPE_ACTIVATION_USDT,continent:null,profitShareBps:0}
  }
  if(model!=='profit_share'||Number(row.monthly_profit_share_bps)!==PRO_MANAGER_PROFIT_SHARE_BPS||
    row.agreed_monthly_salary_usdt!=null&&Number(row.agreed_monthly_salary_usdt)!==0)return null
  try {
    const quote=validateProManagerActivationQuote(row.approved_continent,row.approved_activation_fee_usdt)
    return {model:'profit_share' as const,feeUSDT:quote.feeUSDT,continent:quote.continent,
      profitShareBps:PRO_MANAGER_PROFIT_SHARE_BPS}
  }catch{return null}
}

/** Accounting-only computation: a payable cannot be collected before valid
 * expense proof, all-currency reconciliation, approval and recorded settlement. */
export function proManagerMonthlyProfitShare(verifiedRevenue:number,verifiedCosts:number) {
  if(!Number.isFinite(verifiedRevenue)||!Number.isFinite(verifiedCosts)||
    verifiedRevenue<0||verifiedCosts<0)throw new Error('Use verified nonnegative business amounts in a common currency.')
  const round=(x:number)=>Math.round((x+Number.EPSILON)*100)/100
  const profit=round(Math.max(0,verifiedRevenue-verifiedCosts))
  return {profit,companyShare:round(profit*PRO_MANAGER_PROFIT_SHARE_RATE),ownerBeforeOtherDeductions:round(profit*(1-PRO_MANAGER_PROFIT_SHARE_RATE))}
}
