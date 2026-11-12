import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getPool} from '@/lib/db'
import {HOPE_STUDIO_BUNDLES,quoteHopeStudioBundle} from '@/lib/hope-video-studio-bundles'
import {ownedHopeVideoFilters} from '@/lib/hope-video-filter-purchase'
import {ownedHopeStudioBundles,purchaseHopeStudioBundle} from '@/lib/hope-video-studio-purchase'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store'}

export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||user.role!=='bridger')return NextResponse.json({error:'Hope Bridger access required'},{status:403,headers})
  try{
    const [owned,bundles,wallet]=await Promise.all([
      ownedHopeVideoFilters(user.id),
      ownedHopeStudioBundles(user.id),
      getPool().query('SELECT balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true LIMIT 1',[user.id]),
    ])
    const ownedIds=owned.map(row=>String(row.filter_id))
    const purchased=new Set(bundles.map(row=>row.bundle_id))
    return NextResponse.json({
      success:true,packages:HOPE_STUDIO_BUNDLES.map(bundle=>({
        ...bundle,quote:quoteHopeStudioBundle(bundle,ownedIds),alreadyPurchased:purchased.has(bundle.id),
      })),
      ownedFilterIds:ownedIds,balanceSystemSwitch:Number(wallet.rows[0]?.balance_trx||0),
    },{headers})
  }catch(error){
    console.error('[hope video packages] catalog failed',error)
    return NextResponse.json({error:'Could not retrieve studio packages'},{status:503,headers})
  }
}

export async function POST(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||user.role!=='bridger')return NextResponse.json({error:'Hope Bridger access required'},{status:403,headers})
  const body=await request.json().catch(()=>({}))
  const result=await purchaseHopeStudioBundle(user.id,body.bundleId)
  if(!result.success){
    const status=result.reason==='invalid_bundle'?400:result.reason==='insufficient_balance'?402:result.reason==='bridger_unavailable'?403:503
    return NextResponse.json(result,{status,headers})
  }
  return NextResponse.json(result,{status:result.alreadyOwned?200:201,headers})
}
