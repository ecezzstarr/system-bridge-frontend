import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getLifestyleAccess } from '@/lib/weave-lifestyle'

// Legacy endpoint. Bridgers do not have a monthly Continuance requirement.
export async function GET(request:NextRequest) {
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({success:false,error:'Unauthorized'},{status:401})
  if(user.role!=='bridger')return NextResponse.json({success:false,error:'Bridger required'},{status:403})
  return NextResponse.json({
    success:true, subscription:{status:'not_required',is_exempt:true,expiry:null},
    monthlyCharge:0,agenticAccess:await getLifestyleAccess(user.id)
  })
}
export async function POST(request:NextRequest) {
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({success:false,error:'Unauthorized'},{status:401})
  return NextResponse.json({success:false,error:'Bridger monthly Continuance has been retired. Use the one-time Agentic-Bridger purchase in Lifestyle.',retired:true},{status:410})
}
