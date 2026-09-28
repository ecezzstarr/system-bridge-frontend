import { NextResponse } from 'next/server'

/**
 * OPay deposits in WEAVE use the proof + Administration verification flow.
 * This legacy callback previously called Flutterwave verification while presenting
 * itself as OPay, which could create an incorrect trust boundary. It is deliberately
 * closed until a native OPay callback signature verifier is configured.
 */
export async function GET(){
 return NextResponse.json({
  error:'Direct OPay callback is not enabled. Use the WEAVE OPay deposit submission and Administration verification flow.',
  code:'opay_manual_verification_required',
 },{status:410,headers:{'Cache-Control':'no-store'}})
}
