import { creditAgentCommission, type CommissionActivity } from './agent-commission'
import { creditBridgerReferralCommission, getBridgerReferrer, type BridgerReferralActivity } from './bridger-referral-commission'
import { creditBridgerCommission } from './bridger-commission'

// Routes a Bridger's commission-eligible activity to whichever party should
// be paid. For client_deposit, the Bridger themselves earns 30% AND their 
// Agent earns a cut. For other activities, if the Bridger was referred by 
// another Bridger, that referrer is paid instead of the Agent.
export async function creditBridgerActivityCommission(params: {
  bridgerId: string
  activity: CommissionActivity
  baseAmount: number
  description: string
}) {
  const { bridgerId, activity, baseAmount, description } = params

  // 1. If it's a client deposit, the Bridger themselves earns 30%
  if (activity === 'client_deposit') {
    await creditBridgerCommission({
      bridgerId,
      baseAmount,
      description: `30% commission: Client purchased File Folder (${baseAmount} Flame Coin)`
    }).catch(err => console.error('[bridger-router] Bridger commission error:', err))
  }

  // 2. Determine who else gets a cut (Referrer Bridger or Agent)
  if (activity !== 'client_deposit') {
    const referrerId = await getBridgerReferrer(bridgerId)
    if (referrerId) {
      return creditBridgerReferralCommission({
        bridgerId,
        activity: activity as BridgerReferralActivity,
        baseAmount,
        description,
      })
    }
  }

  // Fallback or secondary: Agent gets their cut
  return creditAgentCommission({ bridgerId, activity, baseAmount, description })
}
