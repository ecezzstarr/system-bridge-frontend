import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { settleDepartmentEntryPaystackTicket } from '@/lib/department-entry-paystack'
import { getAuthUser } from '@/lib/auth-api'
import { ensureEntryLoanSupportSchema } from '@/lib/department-entry-loan-support'
import {
  approveDepartmentEntryTicket,
  listDepartmentEntryTickets,
  rejectDepartmentEntryTicket,
} from '@/lib/department-entry-tickets'

async function requireAdmin(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (user.role !== 'admin') return { response: NextResponse.json({ error: 'Admin only' }, { status: 403 }) }
  return { user }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.response) return auth.response

  try {
    await ensureEntryLoanSupportSchema()
    const reference = (request.nextUrl.searchParams.get('reference') || '').trim().slice(0, 255)
    const tickets = await listDepartmentEntryTickets(reference)
    return NextResponse.json({ success: true, tickets })
  } catch (error: any) {
    console.error('[admin department-entry] list error:', error)
    return NextResponse.json({ error: error?.message || 'Unable to list tickets' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.response) return auth.response

  try {
    const body = await request.json()
    const ticketId = String(body.ticketId || '')
    const action = String(body.action || '').toLowerCase()

    if (!ticketId || !['approve', 'reject', 'check_payment'].includes(action)) {
      return NextResponse.json(
        { error: 'ticketId and action (approve|reject|check_payment) are required' },
        { status: 400 }
      )
    }

    if (action === 'check_payment') {
      const [ticket] = await sql`
        SELECT payment_reference, verified_by, verified_at FROM departmental_entry_tickets
        WHERE id=${ticketId}::uuid AND status='VERIFYING'
      `
      if (!ticket?.payment_reference || ticket.verified_by || ticket.verified_at) {
        return NextResponse.json({ error: 'No Paystack payment is waiting for verification.' }, { status:409 })
      }
      const result = await settleDepartmentEntryPaystackTicket(ticket.payment_reference)
      if (!result.settled) return NextResponse.json({ error: 'Paystack has not confirmed payment.' }, { status:409 })
      return NextResponse.json({ success:true, message:'Payment confirmed. Issue the registration code from this ticket.' })
    }

    if (action === 'approve') {
      const result = await approveDepartmentEntryTicket(ticketId, auth.user!.id)
      if (!result) {
        return NextResponse.json(
          { error: 'Ticket payment is not pending verification.' },
          { status: 409 }
        )
      }

      return NextResponse.json({
        success: true,
        ticket: result.ticket,
        departmentalCode: result.code,
        message: 'Payment verified. Departmental code issued.',
      })
    }

    const rejected = await rejectDepartmentEntryTicket(
      ticketId,
      auth.user!.id,
      typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : undefined
    )

    if (!rejected) {
      return NextResponse.json(
        { error: 'Ticket could not be rejected.' },
        { status: 409 }
      )
    }

    return NextResponse.json({ success: true, ticket: rejected, message: 'Ticket rejected.' })
  } catch (error: any) {
    console.error('[admin department-entry] verify error:', error)
    return NextResponse.json({ error: error?.message || 'Unable to verify ticket' }, { status: 500 })
  }
}
