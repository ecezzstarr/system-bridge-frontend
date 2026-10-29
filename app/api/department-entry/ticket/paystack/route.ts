import { NextRequest, NextResponse } from 'next/server'
import { initializeDepartmentEntryPaystackTicket } from '@/lib/department-entry-paystack'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const accessToken = request.headers.get('x-entry-ticket-token')?.trim() || ''
  if (!accessToken) return NextResponse.json({ error: 'Ticket access token required.' }, { status: 401 })
  try {
    const body = await request.json()
    const payerName = String(body.payerName || '').trim().slice(0, 255)
    const payerEmail = String(body.payerEmail || '').trim().slice(0, 255).toLowerCase()
    const payerPhone = String(body.payerPhone || '').trim().slice(0, 80)
    if (!payerName || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(payerEmail)) return NextResponse.json({ error: 'Enter your name and a valid email for Paystack checkout.' }, { status: 400 })
    const checkout = await initializeDepartmentEntryPaystackTicket({ accessToken, payerName, payerEmail, payerPhone: payerPhone || undefined })
    return NextResponse.json({ success: true, ...checkout })
  } catch (error) {
    console.error('[department-entry Paystack initialization]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to start Paystack checkout.' }, { status: 409 })
  }
}
