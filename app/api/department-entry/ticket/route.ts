import { NextRequest, NextResponse } from 'next/server'
import {
  createDepartmentEntryTicket,
  getDepartmentEntryTicket,
  submitDepartmentEntryPayment,
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

export async function PATCH(request: NextRequest) {
  try {
    const accessToken = readAccessToken(request)
    if (!accessToken) {
      return NextResponse.json({ error: 'Ticket access token required' }, { status: 401 })
    }

    const body = await request.json()
    const payerName = String(body.payerName || '').trim().slice(0, 255)
    const payerEmail = String(body.payerEmail || '').trim().slice(0, 255)
    const payerPhone = String(body.payerPhone || '').trim().slice(0, 80)
    const paymentReference = String(body.paymentReference || '').trim().slice(0, 255)

    if (!payerName || !paymentReference || (!payerEmail && !payerPhone)) {
      return NextResponse.json(
        { error: 'Name, payment reference, and either email or phone are required.' },
        { status: 400 }
      )
    }

    const ticket = await submitDepartmentEntryPayment(accessToken, {
      payerName,
      payerEmail: payerEmail || undefined,
      payerPhone: payerPhone || undefined,
      paymentReference,
    })

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket is unavailable, expired, or already completed.' },
        { status: 409 }
      )
    }

    return NextResponse.json({
      success: true,
      ticket: safeTicket(ticket),
      message: 'Payment submitted. Administration has been notified for verification.',
    })
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'That payment reference has already been used.' },
        { status: 409 }
      )
    }
    console.error('[department-entry] submit payment error:', error)
    return NextResponse.json(
      { error: error?.message || 'Unable to submit payment' },
      { status: 500 }
    )
  }
}
