import { NextRequest, NextResponse } from 'next/server'
import { verifyPaystackWebhookSignature } from '@/lib/paystack'
import { settlePaystackDeposit } from '@/lib/paystack-deposits'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  if (!verifyPaystackWebhookSignature(rawBody, request.headers.get('x-paystack-signature'))) {
    return NextResponse.json({error:'Invalid Paystack signature'},{status:401})
  }
  try {
    const event=JSON.parse(rawBody)
    if (event?.event === 'charge.success' && typeof event?.data?.reference === 'string') {
      // Settlement re-verifies the reference against Paystack's API; webhook JSON alone never credits a wallet.
      await settlePaystackDeposit(event.data.reference)
    }
    return NextResponse.json({received:true})
  } catch(error) {
    console.error('[Paystack webhook settlement]',error)
    return NextResponse.json({error:'Paystack event could not be processed'},{status:503})
  }
}
