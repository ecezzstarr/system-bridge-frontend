import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getAgenticBridgerPurchase, purchaseAgenticBridger, AGENTIC_BRIDGER_ONE_TIME_FLAME_COIN } from '@/lib/agentic-bridger-purchase'
import { getLifestyleAccess } from '@/lib/weave-lifestyle'

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({success:false,error:'Unauthorized'},{status:401})
  if (user.role !== 'bridger') return NextResponse.json({success:false,error:'Bridger required'},{status:403})
  const purchase = await getAgenticBridgerPurchase(user.id)
  return NextResponse.json({success:true,owned:Boolean(purchase),priceFlameCoin:AGENTIC_BRIDGER_ONE_TIME_FLAME_COIN,purchasedAt:purchase?.paid_at||null})
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({success:false,error:'Unauthorized'},{status:401})
  if (user.role !== 'bridger') return NextResponse.json({success:false,error:'Bridger required'},{status:403})
  const result = await purchaseAgenticBridger(user.id)
  if (!result.success) {
    return NextResponse.json(result,{status:result.reason==='insufficient_balance'?402:result.reason==='bridger_unavailable'?403:500})
  }
  return NextResponse.json({...result,access:await getLifestyleAccess(user.id)},{status:result.alreadyOwned?200:201})
}
