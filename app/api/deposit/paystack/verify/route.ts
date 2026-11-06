import { NextRequest, NextResponse } from 'next/server'
import { settlePaystackDeposit } from '@/lib/paystack-deposits'
import { getPool } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const reference=request.nextUrl.searchParams.get('reference')||request.nextUrl.searchParams.get('trxref')||''
  if (!reference) return NextResponse.redirect(new URL('/wallet/deposit-withdraw?deposit=missing_reference',request.url))
  // If Paystack's authenticated webhook already credited this wallet, return
  // immediately instead of waiting on a second Paystack verify API call.
  // Historic manual approvals without verified_at are not treated as proof.
  if (/^[a-zA-Z0-9.=-]{1,100}$/.test(reference)) {
    const committed = await getPool().query(
      "SELECT id FROM deposits WHERE method='paystack' AND receipt_data=$1 AND status='approved' AND verified_at IS NOT NULL LIMIT 1",
      [reference],
    ).catch(() => null)
    if (committed?.rowCount === 1) {
      return NextResponse.redirect(new URL('/wallet/deposit-withdraw?deposit=verified', request.url))
    }
  }
  try {
    const result=await settlePaystackDeposit(reference)
    const target=new URL('/wallet/deposit-withdraw',request.url)
    target.searchParams.set('deposit',result.settled?'verified':'pending')
    return NextResponse.redirect(target)
  } catch(error) {
    console.error('[Paystack callback verification]',error)
    const target=new URL('/wallet/deposit-withdraw',request.url)
    target.searchParams.set('deposit','verification_pending')
    return NextResponse.redirect(target)
  }
}
