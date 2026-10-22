import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'

export async function POST(request:NextRequest) {
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({success:false,error:'Unauthorized'},{status:401})
  return NextResponse.json({success:false,retired:true,error:'Bridger Continuance payment submissions are retired. Agentic-Bridger is purchased once in Lifestyle.'},{status:410})
}
