import { creditAgentCommission, type CommissionActivity } from './agent-commission'
import { creditBridgerCommission } from './bridger-commission'

// Commission routing follows the role Presence economics:
// - qualifying Bridger Prospect purchase -> attached Agent share
// - verified Client File Folder purchase -> Bridger share + attached Agent share
export async function creditBridgerActivityCommission(params: {
  bridgerId: string
  activity: CommissionActivity
  baseAmount: number
  description: string
  sourceId: string
}) {
  const { bridgerId, activity, baseAmount, description, sourceId } = params

  const bridgerShare = activity === 'client_deposit'
    ? await creditBridgerCommission({
        bridgerId,
        baseAmount,
        description: `30% File Folder share: ${description}`,
        sourceId,
      })
    : null

  const agentShare = await creditAgentCommission({
    bridgerId,
    activity,
    baseAmount,
    description,
    sourceId,
  })

  return { bridgerShare, agentShare }
}
