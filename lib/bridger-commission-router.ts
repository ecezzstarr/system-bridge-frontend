import { creditAgentCommission, type CommissionActivity } from './agent-commission'
import { creditBridgerCommission } from './bridger-commission'
import { sql } from './db'

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

  const [relationship]=await sql`
    SELECT assigned_agent_id
    FROM users
    WHERE id=${bridgerId}::uuid
      AND role='bridger'
    LIMIT 1
  `
  const agentExpected=Boolean(relationship?.assigned_agent_id)
  const agentShare = await creditAgentCommission({
    bridgerId,
    activity,
    baseAmount,
    description,
    sourceId,
  })

  return { bridgerShare, agentShare, agentExpected }
}
