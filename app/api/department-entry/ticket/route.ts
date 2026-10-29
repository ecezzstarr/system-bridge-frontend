import { NextRequest, NextResponse } from 'next/server'
import {
  createDepartmentEntryTicket,
  getDepartmentEntryTicket,
} from '@/lib/department-entry-tickets'
import type { Department } from '@/lib/departmental-codes'

function safeTicket(ticket: any) {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticket_number,
    department: ticket.department,
    status: ticket.status,
    priceFlameCoin: Number(ticket.price_flame_coin),
    trxNgnRate: Number(ticket.trx_ngn_rate),
    amountNgn: Number(ticket.amount_ngn),
    opayAccountNumber: ticket.opay_account_number,
    payerName: ticket.payer_name || null,
    payerEmail: ticket.payer_email || null,
    payerPhone: ticket.payer_phone || null,
    paymentReference: ticket.payment_reference || null,
    paymentSubmittedAt: ticket.payment_submitted_at || null,
    verifiedAt: ticket.verified_at || null,
    rejectedReason: ticket.rejected_reason || null,
    expiresAt: ticket.expires_at,
    departmentalCode:
      ticket.status === 'CODE_ISSUED' ? ticket.departmental_code || null : null,
  }
}

function readAccessToken(request: NextRequest) {
  return request.headers.get('x-entry-ticket-token')?.trim() || ''
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const department = String(body.department || '').toUpperCase()

    if (!['AGENT', 'BRIDGER'].includes(department)) {
      return NextResponse.json({ error: 'Choose Agent or Bridger.' }, { status: 400 })
    }

    const result = await createDepartmentEntryTicket(department as Department)

    return NextResponse.json({
      success: true,
      ticket: safeTicket(result.ticket),
      accessToken: result.accessToken,
      rateSource: result.rateSource,
      peg: '1 Flame Coin = 1 TRX',
    }, { status: 201 })
  } catch (error: any) {
    console.error('[department-entry] create ticket error:', error)
    return NextResponse.json(
      { error: error?.message || 'Unable to present entry ticket' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = readAccessToken(request)
    if (!accessToken) {
      return NextResponse.json({ error: 'Ticket access token required' }, { status: 401 })
    }

    const ticket = await getDepartmentEntryTicket(accessToken)
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, ticket: safeTicket(ticket) })
  } catch (error: any) {
    console.error('[department-entry] ticket status error:', error)
    return NextResponse.json(
      { error: error?.message || 'Unable to read ticket' },
      { status: 500 }
    )
  }
}

export async function PATCH() {
  return NextResponse.json(
    { error: 'Manual payment-reference submission is disabled. Use the Paystack checkout for Department Entry.' },
    { status: 410 }
  )
}
