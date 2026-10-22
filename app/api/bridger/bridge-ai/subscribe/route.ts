import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { WORLD_RULES } from '@/lib/world/constants'

// Bridge AI now charges only when a published template is opened.
export async function GET(request:NextRequest) {
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({error:'Unauthorized'},{status:401})
  return NextResponse.json({subscription:null,retired:true,templateOpenFlameCoin:WORLD_RULES.BRIDGE_AI_TEMPLATE_OPEN_FLAME_COIN})
}
export async function POST(request:NextRequest) {
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({error:'Unauthorized'},{status:401})
  return NextResponse.json({error:'Monthly Bridge AI subscriptions are retired. Open a template for 8 Flame Coin.',retired:true},{status:410})
}
