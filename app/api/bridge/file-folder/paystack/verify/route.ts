import { NextRequest, NextResponse } from 'next/server'
import { settleFileFolderPaystackPurchase } from '@/lib/file-folder-paystack'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get('reference') || request.nextUrl.searchParams.get('trxref') || ''
  const requestedReturn = request.nextUrl.searchParams.get('returnTo') || '/'
  const target = new URL('/', request.url)
  try {
    const candidate = new URL(requestedReturn, target.origin)
    if (candidate.origin === target.origin) {
      target.pathname = candidate.pathname
      target.search = candidate.search
      target.hash = ''
    }
  } catch {}
  if (!reference) {
    target.searchParams.set('fileFolderPayment', 'missing_reference')
    return NextResponse.redirect(target)
  }
  try {
    const result = await settleFileFolderPaystackPurchase(reference)
    target.searchParams.set('fileFolderPayment', result.matched && result.settled ? 'verified' : 'pending')
    if (result.purchaseId) target.searchParams.set('fileFolderPurchaseId', result.purchaseId)
  } catch (error) {
    console.error('[File Folder Paystack callback verification]', error)
    target.searchParams.set('fileFolderPayment', 'verification_pending')
  }
  return NextResponse.redirect(target)
}
