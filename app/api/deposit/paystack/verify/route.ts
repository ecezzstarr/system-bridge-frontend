import { NextRequest, NextResponse } from 'next/server'
import { settlePaystackDeposit } from '@/lib/paystack-deposits'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const reference=request.nextUrl.searchParams.get('reference')||request.nextUrl.searchParams.get('trxref')||''
  if (!reference) return NextResponse.redirect(new URL('/wallet/deposit-withdraw?deposit=missing_reference',request.url))
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
