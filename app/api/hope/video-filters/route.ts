import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { HOPE_VIDEO_FILTERS } from '@/lib/hope-video-filter-catalog'
import { ownedHopeVideoFilters,purchaseHopeVideoFilter } from '@/lib/hope-video-filter-purchase'

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
    return NextResponse.json({success:true,filters:HOPE_VIDEO_FILTERS,owned:owned.map(row=>row.filter_id),
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
  const result=await purchaseHopeVideoFilter(user.id,body.filterId)
  if(!result.success){
    const status=result.reason==='invalid_filter'?400:result.reason==='insufficient_balance'?402:result.reason==='bridger_unavailable'?403:503
    return NextResponse.json(result,{status,headers:noStore})
  }
  return NextResponse.json(result,{status:result.alreadyOwned?200:201,headers:noStore})
}
