import { NextRequest, NextResponse } from 'next/server'
import { verifyAndCompleteAgilityPayment } from '@/lib/agility-payment'

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || new URL(request.url).origin
  const back = (query: string) => NextResponse.redirect(`${baseUrl}/agility?${query}`)
  const params = request.nextUrl.searchParams
  const orderId = params.get('order')
  const reference = params.get('ref')
  const transactionId = params.get('transaction_id')
  const providerStatus = params.get('status')

  if (!orderId || !reference || !transactionId || !/^[0-9]+$/.test(transactionId)) {
    return back('payment=invalid')
  }
  if (providerStatus && providerStatus !== 'successful') {
    return back(`payment=${encodeURIComponent(providerStatus)}&order=${encodeURIComponent(orderId)}`)
  }

  const result = await verifyAndCompleteAgilityPayment({
    transactionId,
    reference,
    orderId,
  })

  if (!result.success) {
    return back(`payment=${encodeURIComponent(result.error)}&order=${encodeURIComponent(orderId)}`)
  }

  return back(`payment=success&order=${encodeURIComponent(orderId)}`)
}
