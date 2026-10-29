import { createHash, randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { getGuidanceStaffDepartments } from '@/lib/weave-guidance-departments'

export const dynamic = 'force-dynamic'

type RequestKind = 'message' | 'item' | 'lawful_task'
const validKinds: RequestKind[] = ['message', 'item', 'lawful_task']

async function ensureSchema() {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS weave_reach_delivery_requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      public_reference varchar(20) NOT NULL UNIQUE,
      tracking_code_hash char(64) NOT NULL UNIQUE,
      request_kind varchar(20) NOT NULL CHECK (request_kind IN ('message','item','lawful_task')),
      sender_name varchar(120) NOT NULL,
      sender_phone varchar(40) NOT NULL,
      recipient_name varchar(120) NOT NULL,
      recipient_phone varchar(40),
      origin_address varchar(300) NOT NULL,
      destination_address varchar(500) NOT NULL,
      request_details text NOT NULL,
      item_budget_ngn numeric(14,2),
      status varchar(32) NOT NULL DEFAULT 'submitted'
        CHECK (status IN ('submitted','forensic_review','quoted','ticket_issued','requester_accepted','funding_confirmed','assigned','in_movement','completed','declined','cancelled')),
      forensic_user_id uuid REFERENCES users(id),
      mandate_user_id uuid REFERENCES users(id),
      assigned_agent_id uuid REFERENCES users(id),
      item_cost_ngn numeric(14,2),
      travel_cost_ngn numeric(14,2),
      agent_compensation_ngn numeric(14,2),
      other_cost_ngn numeric(14,2),
      company_profit_ngn numeric(14,2),
      quoted_total_ngn numeric(14,2),
      forensic_note varchar(1500),
      approval_ticket varchar(40),
      ticket_issued_at timestamptz,
      requester_accepted_at timestamptz,
      funding_reference varchar(160),
      movement_started_at timestamptz,
      completed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `)
  await getPool().query('CREATE INDEX IF NOT EXISTS weave_reach_delivery_status_created_idx ON weave_reach_delivery_requests(status, created_at DESC)')
}

const hashCode = (value: string) => createHash('sha256').update(value).digest('hex')
const money = (value: unknown) => {
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0 || number > 100000000) return null
  return Math.round(number * 100) / 100
}
const publicView = (row: Record<string, any>) => ({
  reference: row.public_reference, kind: row.request_kind, status: row.status,
  recipientName: row.recipient_name, destinationAddress: row.destination_address,
  itemCostNgn: row.item_cost_ngn, travelCostNgn: row.travel_cost_ngn,
  agentCompensationNgn: row.agent_compensation_ngn, otherCostNgn: row.other_cost_ngn,
  companyProfitNgn: row.company_profit_ngn, quotedTotalNgn: row.quoted_total_ngn,
  forensicNote: row.forensic_note, approvalTicket: row.approval_ticket,
  ticketIssuedAt: row.ticket_issued_at, createdAt: row.created_at,
})

export async function POST(request: NextRequest) {
  try {
    await ensureSchema()
    const body = await request.json().catch(() => ({}))
    const action = typeof body.action === 'string' ? body.action : 'submit'

    if (action === 'submit') {
      const kind = body.kind as RequestKind
      const senderName = typeof body.senderName === 'string' ? body.senderName.trim() : ''
      const senderPhone = typeof body.senderPhone === 'string' ? body.senderPhone.trim() : ''
      const recipientName = typeof body.recipientName === 'string' ? body.recipientName.trim() : ''
      const recipientPhone = typeof body.recipientPhone === 'string' ? body.recipientPhone.trim() : ''
      const originAddress = typeof body.originAddress === 'string' ? body.originAddress.trim() : ''
      const destinationAddress = typeof body.destinationAddress === 'string' ? body.destinationAddress.trim() : ''
      const requestDetails = typeof body.requestDetails === 'string' ? body.requestDetails.trim() : ''
      const itemBudget = body.itemBudgetNgn == null ? null : money(body.itemBudgetNgn)
      if (!validKinds.includes(kind) || senderName.length < 2 || senderName.length > 120 || senderPhone.length < 7 || senderPhone.length > 40 ||
        recipientName.length < 2 || recipientName.length > 120 || recipientPhone.length > 40 ||
        originAddress.length < 4 || originAddress.length > 300 || destinationAddress.length < 4 || destinationAddress.length > 500 ||
        requestDetails.length < 5 || requestDetails.length > 3000 || body.consentConfirmed !== true ||
        (kind === 'item' && (itemBudget === null || itemBudget <= 0))) {
        return NextResponse.json({ success: false, error: 'Complete each required field, confirm the lawful-request declaration, and provide a valid item budget when applicable.' }, { status: 400 })
      }
      const rawCode = randomBytes(24).toString('base64url')
      const reference = 'WR-' + randomBytes(5).toString('hex').toUpperCase()
      const result = await getPool().query(`
        INSERT INTO weave_reach_delivery_requests
          (public_reference,tracking_code_hash,request_kind,sender_name,sender_phone,recipient_name,recipient_phone,
           origin_address,destination_address,request_details,item_budget_ngn,status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'submitted')
        RETURNING public_reference
      `, [reference, hashCode(rawCode), kind, senderName, senderPhone, recipientName, recipientPhone,
        originAddress, destinationAddress, requestDetails, itemBudget])
      return NextResponse.json({ success: true, trackingCode: reference + '.' + rawCode, reference: result.rows[0].public_reference, status: 'submitted' }, { status: 201 })
    }

    // Requesters use the private tracking code returned at submission. Only a quote
    // already issued by the Mandate can be accepted; accepting does not claim payment.
    if (action === 'status' || action === 'accept') {
      const trackingCode = typeof body.trackingCode === 'string' ? body.trackingCode : ''
      const separator = trackingCode.indexOf('.')
      if (separator < 1 || trackingCode.length > 120) return NextResponse.json({ success: false, error: 'A valid tracking code is required.' }, { status: 400 })
      const reference = trackingCode.slice(0, separator)
      const secret = trackingCode.slice(separator + 1)
      const found = await getPool().query('SELECT * FROM weave_reach_delivery_requests WHERE public_reference=$1 AND tracking_code_hash=$2', [reference, hashCode(secret)])
      const row = found.rows[0]
      if (!row) return NextResponse.json({ success: false, error: 'Request not found for this tracking code.' }, { status: 404 })
      if (action === 'accept') {
        if (row.status !== 'ticket_issued') return NextResponse.json({ success: false, error: 'The Mandate has not issued an approval ticket, or this request is no longer awaiting acceptance.' }, { status: 409 })
        await getPool().query(`UPDATE weave_reach_delivery_requests SET status='requester_accepted',requester_accepted_at=NOW(),updated_at=NOW() WHERE id=$1::uuid AND status='ticket_issued'`, [row.id])
        return NextResponse.json({ success: true, status: 'requester_accepted', message: 'Quote accepted. Required funding and Agent assignment must be confirmed before movement begins.' })
      }
      return NextResponse.json({ success: true, request: publicView(row), canAccept: row.status === 'ticket_issued' })
    }

    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Sign in with an authorized Weave position.' }, { status: 401 })
    const departments = await getGuidanceStaffDepartments(user)
    const isForensic = departments.includes('forensic')
    const isMandate = departments.includes('mandate')
    const requestId = typeof body.requestId === 'string' ? body.requestId : ''
    if (!requestId) return NextResponse.json({ success: false, error: 'Request ID is required.' }, { status: 400 })
    const found = await getPool().query('SELECT * FROM weave_reach_delivery_requests WHERE id=$1::uuid', [requestId])
    const row = found.rows[0]
    if (!row) return NextResponse.json({ success: false, error: 'Request not found.' }, { status: 404 })

    if (action === 'quote') {
      if (!isForensic) return NextResponse.json({ success: false, error: 'Only appointed Forensics staff may calculate and record a quote.' }, { status: 403 })
      if (!['submitted','forensic_review'].includes(row.status)) return NextResponse.json({ success: false, error: 'This request is not awaiting Forensic costing.' }, { status: 409 })
      const itemCost = money(body.itemCostNgn)
      const travelCost = money(body.travelCostNgn)
      const agentCompensation = money(body.agentCompensationNgn)
      const otherCost = money(body.otherCostNgn)
      const companyProfit = money(body.companyProfitNgn)
      const note = typeof body.forensicNote === 'string' ? body.forensicNote.trim() : ''
      if ([itemCost,travelCost,agentCompensation,otherCost,companyProfit].some(value => value === null) || note.length > 1500 ||
        (row.request_kind === 'item' && itemCost! > Number(row.item_budget_ngn))) {
        return NextResponse.json({ success: false, error: 'Provide valid non-negative cost lines; item cost cannot exceed the sender’s stated item budget.' }, { status: 400 })
      }
      const item = row.request_kind === 'item' ? itemCost! : 0
      const total = Math.round((item + travelCost! + agentCompensation! + otherCost! + companyProfit!) * 100) / 100
      await getPool().query(`
        UPDATE weave_reach_delivery_requests SET status='quoted',forensic_user_id=$2::uuid,
          item_cost_ngn=$3,travel_cost_ngn=$4,agent_compensation_ngn=$5,other_cost_ngn=$6,
          company_profit_ngn=$7,quoted_total_ngn=$8,forensic_note=$9,updated_at=NOW()
        WHERE id=$1::uuid
      `, [row.id,user.id,item,travelCost,agentCompensation,otherCost,companyProfit,total,note || null])
      return NextResponse.json({ success: true, status: 'quoted', quotedTotalNgn: total, message: 'Cost breakdown recorded. Mandate must issue the approval ticket to the requester.' })
    }

    if (action === 'issue_ticket') {
      if (!isMandate) return NextResponse.json({ success: false, error: 'Only appointed Mandate staff may issue the approval ticket.' }, { status: 403 })
      if (row.status !== 'quoted' || !row.quoted_total_ngn) return NextResponse.json({ success: false, error: 'Forensics must record a valid quote before Mandate can issue a ticket.' }, { status: 409 })
      const ticket = 'WRT-' + randomBytes(6).toString('hex').toUpperCase()
      await getPool().query(`
        UPDATE weave_reach_delivery_requests SET status='ticket_issued',mandate_user_id=$2::uuid,
          approval_ticket=$3,ticket_issued_at=NOW(),updated_at=NOW()
        WHERE id=$1::uuid AND status='quoted'
      `, [row.id,user.id,ticket])
      return NextResponse.json({ success: true, status: 'ticket_issued', approvalTicket: ticket, quotedTotalNgn: Number(row.quoted_total_ngn), message: 'Approval ticket issued. The requester must accept the quote before funding and assignment.' })
    }

    if (action === 'confirm_funding') {
      if (!isMandate) return NextResponse.json({ success: false, error: 'Only appointed Mandate staff may confirm recorded funding.' }, { status: 403 })
      if (row.status !== 'requester_accepted') return NextResponse.json({ success: false, error: 'Requester acceptance is required before funding can be recorded.' }, { status: 409 })
      const fundingReference = typeof body.fundingReference === 'string' ? body.fundingReference.trim() : ''
      if (fundingReference.length < 4 || fundingReference.length > 160) return NextResponse.json({ success: false, error: 'A verifiable funding reference is required.' }, { status: 400 })
      await getPool().query(`UPDATE weave_reach_delivery_requests SET status='funding_confirmed',funding_reference=$2,updated_at=NOW() WHERE id=$1::uuid AND status='requester_accepted'`, [row.id,fundingReference])
      return NextResponse.json({ success: true, status: 'funding_confirmed', message: 'Funding reference recorded. Assign an available Agent before movement can begin.' })
    }

    if (action === 'assign_agent') {
      if (!isMandate) return NextResponse.json({ success: false, error: 'Only appointed Mandate staff may assign an Agent.' }, { status: 403 })
      if (row.status !== 'funding_confirmed') return NextResponse.json({ success: false, error: 'Requester acceptance and confirmed funding are required before Agent assignment.' }, { status: 409 })
      const agentId = typeof body.agentId === 'string' ? body.agentId : ''
      const agent = await getPool().query(`SELECT id FROM users WHERE id=$1::uuid AND role='agent' AND COALESCE(is_active,true)=true`, [agentId])
      if (!agent.rows[0]) return NextResponse.json({ success: false, error: 'Choose an active Agent account.' }, { status: 400 })
      await getPool().query(`UPDATE weave_reach_delivery_requests SET status='assigned',assigned_agent_id=$2::uuid,updated_at=NOW() WHERE id=$1::uuid AND status='funding_confirmed'`, [row.id,agentId])
      return NextResponse.json({ success: true, status: 'assigned', message: 'Agent assigned. The Agent must explicitly accept the assignment before movement.' })
    }

    if (action === 'start_movement') {
      if (user.role !== 'agent' || row.assigned_agent_id !== user.id) return NextResponse.json({ success: false, error: 'Only the Agent assigned to this request may start movement.' }, { status: 403 })
      if (row.status !== 'assigned') return NextResponse.json({ success: false, error: 'The request must be accepted, funded and assigned before movement begins.' }, { status: 409 })
      await getPool().query(`UPDATE weave_reach_delivery_requests SET status='in_movement',movement_started_at=NOW(),updated_at=NOW() WHERE id=$1::uuid AND assigned_agent_id=$2::uuid AND status='assigned'`, [row.id,user.id])
      return NextResponse.json({ success: true, status: 'in_movement', message: 'Movement recorded.' })
    }

    if (action === 'complete') {
      if (user.role !== 'agent' || row.assigned_agent_id !== user.id) return NextResponse.json({ success: false, error: 'Only the Agent assigned to this request may record completion.' }, { status: 403 })
      if (row.status !== 'in_movement') return NextResponse.json({ success: false, error: 'Movement must be recorded before completion.' }, { status: 409 })
      await getPool().query(`UPDATE weave_reach_delivery_requests SET status='completed',completed_at=NOW(),updated_at=NOW() WHERE id=$1::uuid AND assigned_agent_id=$2::uuid AND status='in_movement'`, [row.id,user.id])
      return NextResponse.json({ success: true, status: 'completed' })
    }

    return NextResponse.json({ success: false, error: 'Unsupported request action.' }, { status: 400 })
  } catch (error) {
    console.error('[Weave Reach and Delivery]', error)
    return NextResponse.json({ success: false, error: 'Reach and Delivery is temporarily unavailable. Please try again.' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureSchema()
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Sign in required.' }, { status: 401 })
    const departments = await getGuidanceStaffDepartments(user)
    const url = new URL(request.url)
    const requestedView = url.searchParams.get('view') || 'forensic'
    if (requestedView === 'forensic' && !departments.includes('forensic')) return NextResponse.json({ success: false, error: 'Appointed Forensics access required.' }, { status: 403 })
    if (requestedView === 'mandate' && !departments.includes('mandate')) return NextResponse.json({ success: false, error: 'Appointed Mandate access required.' }, { status: 403 })
    if (requestedView === 'agent' && user.role !== 'agent') return NextResponse.json({ success: false, error: 'Agent account required.' }, { status: 403 })
    const conditions = requestedView === 'forensic'
      ? `status IN ('submitted','forensic_review')`
      : requestedView === 'mandate'
        ? `status IN ('quoted','requester_accepted','funding_confirmed')`
        : `assigned_agent_id=$1::uuid AND status IN ('assigned','in_movement')`
    const values = requestedView === 'agent' ? [user.id] : []
    const result = await getPool().query(`SELECT id,public_reference,request_kind,sender_name,recipient_name,origin_address,destination_address,request_details,item_budget_ngn,status,item_cost_ngn,travel_cost_ngn,agent_compensation_ngn,other_cost_ngn,company_profit_ngn,quoted_total_ngn,forensic_note,approval_ticket,assigned_agent_id,created_at FROM weave_reach_delivery_requests WHERE ${conditions} ORDER BY created_at ASC LIMIT 100`, values)
    return NextResponse.json({ success: true, requests: result.rows }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[Weave Reach and Delivery] GET', error)
    return NextResponse.json({ success: false, error: 'Unable to load Reach and Delivery requests.' }, { status: 500 })
  }
}
