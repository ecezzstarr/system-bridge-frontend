import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { HOPE_VIDEO_FILTERS } from '@/lib/hope-video-filter-catalog'
import { ownedHopeVideoFilters } from '@/lib/hope-video-filter-purchase'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const noStore={'Cache-Control':'private, no-store'}

export async function GET(req:NextRequest){
  const user=await getAuthUser(req)
  if(!user||user.role!=='bridger')return NextResponse.json({error:'Hope Bridger access required'},{status:403})
  try{
    const [owned,wallet]=await Promise.all([
      ownedHopeVideoFilters(user.id),
      getPool().query('SELECT balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true LIMIT 1',[user.id]),
    ])
    return NextResponse.json({success:true,filters:HOPE_VIDEO_FILTERS.map(filter=>({...filter,priceSystemSwitch:0})),owned:HOPE_VIDEO_FILTERS.map(filter=>filter.id),
      purchases:owned,balanceSystemSwitch:Number(wallet.rows[0]?.balance_trx||0)},{headers:noStore})
  }catch(error){
    console.error('[hope filter] catalog unavailable',error)
    return NextResponse.json({error:'Could not load video filters'},{status:503})
  }
}

export async function POST(req:NextRequest){
  const user=await getAuthUser(req)
  if(!user||user.role!=='bridger')return NextResponse.json({error:'Hope Bridger access required'},{status:403})
  const body=await req.json().catch(()=>({}))
  const filter=HOPE_VIDEO_FILTERS.find(item=>item.id===body.filterId)
  if(!filter)return NextResponse.json({success:false,reason:'invalid_filter'},{status:400,headers:noStore})
  return NextResponse.json({success:true,alreadyOwned:true,filterId:filter.id,chargedSystemSwitch:0},{headers:noStore})
}
