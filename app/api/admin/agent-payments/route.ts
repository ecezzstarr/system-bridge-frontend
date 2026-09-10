import { NextRequest, NextResponse } from 'next/server'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { getSql } from '@/lib/db'

async function ensureSchema(sql: any) {
  await sql`
    CREATE TABLE IF NOT EXISTS agent_payments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      amount numeric(30,8) NOT NULL CHECK (amount > 0),
      currency text NOT NULL DEFAULT 'TRX',
      payment_month text NOT NULL,
      paid_by_admin_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      confirmed_functions text NOT NULL,
      payment_date timestamptz NOT NULL DEFAULT now(),
      status text NOT NULL DEFAULT 'completed'
    )
  `
}

export async function GET(req: NextRequest) {
  const admin = await requireWorkshopAuthorization(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sql = getSql()
    await ensureSchema(sql)
    const rows = await sql`
      SELECT p.id, p.agent_id, p.amount, p.currency, p.payment_month,
             p.paid_by_admin_id, p.confirmed_functions, p.payment_date, p.status,
             u.name AS agent_name, u.username AS agent_username
      FROM agent_payments p
      JOIN users u ON u.id = p.agent_id
      ORDER BY p.payment_date DESC
    `
    const agents = await sql`
      SELECT id, name, username
      FROM users
      WHERE role = 'agent' AND is_active = true
      ORDER BY name ASC
    `
    return NextResponse.json({ agents, payments: rows })
  } catch {
    return NextResponse.json({ error: 'Unable to load agent payments' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireWorkshopAuthorization(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const agentId = typeof body.agentId === 'string' ? body.agentId : ''
    const amount = Number(body.amount)
    const paymentMonth = typeof body.paymentMonth === 'string' ? body.paymentMonth : ''
    const confirmedFunctions = typeof body.confirmedFunctions === 'string' ? body.confirmedFunctions.trim() : ''

    if (!agentId || !Number.isFinite(amount) || amount <= 0 || !/^\d{4}-\d{2}$/.test(paymentMonth) || !confirmedFunctions) {
      return NextResponse.json({ error: 'Valid agent, amount, month and confirmed work are required' }, { status: 400 })
    }

    const sql = getSql()
    await ensureSchema(sql)
    const [agent] = await sql`SELECT id, name, username FROM users WHERE id=${agentId}::uuid AND role='agent' AND is_active=true LIMIT 1`
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

    const [payment] = await sql`
      INSERT INTO agent_payments (agent_id, amount, currency, payment_month, paid_by_admin_id, confirmed_functions)
      VALUES (${agentId}::uuid, ${amount}, 'TRX', ${paymentMonth}, ${admin.id}::uuid, ${confirmedFunctions})
      RETURNING id, agent_id, amount, currency, payment_month, paid_by_admin_id, confirmed_functions, payment_date, status
    `

    return NextResponse.json({ payment: { ...payment, agent_name: agent.name, agent_username: agent.username } }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unable to record agent payment' }, { status: 500 })
  }
}
