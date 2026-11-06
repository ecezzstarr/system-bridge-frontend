import {NextRequest,NextResponse} from 'next/server'
import {checkoutCjLoan,verifyCjLoanForGrant} from '@/lib/cj-dorado-loan'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store'}
export async function POST(request:NextRequest){
 try{
  const body=await request.json().catch(()=>({}))
  const checkout=await checkoutCjLoan(String(body.grant||''))
  return NextResponse.json({success:true,...checkout},{headers})
 }catch(error){
  console.error('[CJ loan Paystack checkout]',error)
  return NextResponse.json({error:error instanceof Error?error.message:'Checkout unavailable'},{status:409,headers})
 }
}
export async function GET(request:NextRequest){
 try{
  const reference=request.nextUrl.searchParams.get('reference')||''
  const grant=request.headers.get('x-cj-checkout-grant')||''
  const result=await verifyCjLoanForGrant(reference,grant)
  return NextResponse.json({success:true,settled:result.settled},{headers})
 }catch(error){
  console.error('[CJ loan Paystack verification]',error)
  return NextResponse.json({error:error instanceof Error?error.message:'Verification unavailable'},{status:409,headers})
 }
}
