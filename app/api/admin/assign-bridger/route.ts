import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'

// Max bridgers per agent
const MAX_BRIDGERS_PER_AGENT = 3

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { bridgerId, agentId } = await request.json()

    if (!bridgerId) {
      return NextResponse.json({ error: 'Bridger ID required' }, { status: 400 })
    }

    // Verify bridger exists and is a bridger
    const bridgers = await sql`
      SELECT id, role, assigned_agent_id FROM users WHERE id = ${bridgerId}::uuid
    `
    if (bridgers.length === 0) {
      return NextResponse.json({ error: 'Bridger not found' }, { status: 404 })
    }

    const bridger = bridgers[0]
    if (bridger.role !== 'bridger') {
      return NextResponse.json({ error: 'User is not a bridger' }, { status: 400 })
    }

    // If agentId is empty/null, unassign the bridger
    if (!agentId) {
      await sql`
        UPDATE users SET assigned_agent_id = NULL WHERE id = ${bridgerId}::uuid
      `
      try {
        await sql`
          INSERT INTO notifications (user_id, type, title, content, from_user_name)
          VALUES (${bridgerId}::uuid, 'assignment', 'A thread has loosened', 'Your connection to your Agent has been released.', 'WEAVE')
        `
      } catch (notifyError) {
        console.error('Failed to send unassign notification:', notifyError)
      }
      return NextResponse.json({ 
        success: true, 
        message: 'Bridger unassigned from agent' 
      })
    }

    // Verify agent exists and is an agent
    const agents = await sql`
      SELECT id, role, name FROM users WHERE id = ${agentId}::uuid
    `
    if (agents.length === 0) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const agent = agents[0]
    if (agent.role !== 'agent') {
      return NextResponse.json({ error: 'User is not an agent' }, { status: 400 })
    }

    // Count current bridgers assigned to this agent
    const countResult = await sql`
      SELECT COUNT(*) as count FROM users 
      WHERE assigned_agent_id = ${agentId}::uuid 
      AND id != ${bridgerId}::uuid
    `
    const currentCount = parseInt(countResult[0].count)

    if (currentCount >= MAX_BRIDGERS_PER_AGENT) {
      return NextResponse.json({ 
        error: `Agent ${agent.name} already has ${MAX_BRIDGERS_PER_AGENT} bridgers (maximum)`,
        currentCount,
        maxAllowed: MAX_BRIDGERS_PER_AGENT
      }, { status: 400 })
    }

    // Assign bridger to agent
    await sql`
      UPDATE users SET assigned_agent_id = ${agentId}::uuid WHERE id = ${bridgerId}::uuid
    `

    try {
      await sql`
        INSERT INTO notifications (user_id, type, title, content, from_user_name, link)
        VALUES (${bridgerId}::uuid, 'assignment', 'A thread has formed', ${'You are now connected to ' + agent.name + '.'}, 'WEAVE', '/bridger/dashboard')
      `
      await sql`
        INSERT INTO notifications (user_id, type, title, content, from_user_name)
        VALUES (${agentId}::uuid, 'assignment', 'A new thread has formed', 'A Bridger has joined your presence.', 'WEAVE')
      `
    } catch (notifyError) {
      console.error('Failed to send assignment notifications:', notifyError)
    }

    return NextResponse.json({ 
      success: true, 
      message: `Bridger assigned to ${agent.name}`,
      agentBridgerCount: currentCount + 1
    })

  } catch (error) {
    console.error('Error assigning bridger:', error)
    return NextResponse.json({ error: 'Failed to assign bridger' }, { status: 500 })
  }
}
