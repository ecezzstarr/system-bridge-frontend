import { creditAgentCommission, type CommissionActivity } from './agent-commission'
import { creditBridgerCommission } from './bridger-commission'

// Commission ownership is explicit:
// - Client File Folder value can credit the Bridger.
// - A Bridger Prospect-package purchase can credit the assigned Agent.
// No other Bridger activity creates Agent commission.
export async function creditBridgerActivityCommission(params: {
  bridgerId: string
  activity: CommissionActivity
  baseAmount: number
  description: string
}) {
  const { bridgerId, activity, baseAmount, description } = params

  if (activity === 'client_deposit') {
    await creditBridgerCommission({
      bridgerId,
      baseAmount,
      description: `30% commission: Client purchased File Folder (${baseAmount} Flame Coin)`,
    }).catch(err => console.error('[bridger-router] Bridger commission error:', err))
    return null
  }

  if (activity === 'prospect_package_purchase') {
    return creditAgentCommission({ bridgerId, activity, baseAmount, description })
  }

  return null
}
