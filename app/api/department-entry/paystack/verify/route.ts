import { NextRequest, NextResponse } from 'next/server'
import { settleDepartmentEntryPaystackTicket } from '@/lib/department-entry-paystack'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get('reference') || request.nextUrl.searchParams.get('trxref') || ''
  const target = new URL('/', request.url)
  if (!reference) { target.searchParams.set('departmentEntryPayment', 'missing_reference'); return NextResponse.redirect(target) }
  try {
    const result = await settleDepartmentEntryPaystackTicket(reference)
    target.searchParams.set('departmentEntryPayment', result.matched && result.settled ? 'verified' : 'pending')
  } catch (error) {
    console.error('[department-entry Paystack callback verification]', error)
    target.searchParams.set('departmentEntryPayment', 'verification_pending')
  }
  return NextResponse.redirect(target)
}
