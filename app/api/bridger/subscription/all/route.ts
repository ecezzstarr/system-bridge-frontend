import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'

// The former recurring Continuance + Bridge AI + Echo bundle is no longer sold.
export async function GET(request:NextRequest) {
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({success:false,error:'Unauthorized'},{status:401})
  return NextResponse.json({success:true,retired:true,totalDueFlameCoin:0,services:[],message:'Bridger monthly bundles have ended. Echo is free, Bridge AI templates cost 8 each, Agentic-Bridger costs 20 once.'})
}
export async function POST(request:NextRequest) {
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({success:false,error:'Unauthorized'},{status:401})
  return NextResponse.json({success:false,retired:true,error:'Monthly Bridger bundles are no longer available.'},{status:410})
}
