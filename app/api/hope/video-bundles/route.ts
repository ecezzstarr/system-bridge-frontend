import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getPool} from '@/lib/db'
import {HOPE_STUDIO_BUNDLES,quoteHopeStudioBundle} from '@/lib/hope-video-studio-bundles'
import {HOPE_VIDEO_FILTERS} from '@/lib/hope-video-filter-catalog'
import {ownedHopeStudioBundles} from '@/lib/hope-video-studio-purchase'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store'}

export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||user.role!=='bridger')return NextResponse.json({error:'Hope Bridger access required'},{status:403,headers})
  try{
    const [bundles,wallet]=await Promise.all([
      ownedHopeStudioBundles(user.id),
      getPool().query('SELECT balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true LIMIT 1',[user.id]),
    ])
    const ownedIds=HOPE_VIDEO_FILTERS.map(filter=>filter.id)
    const purchased=new Set(bundles.map(row=>row.bundle_id))
    return NextResponse.json({
      success:true,packages:HOPE_STUDIO_BUNDLES.map(bundle=>({
        ...bundle,priceSystemSwitch:0,quote:quoteHopeStudioBundle(bundle,ownedIds),alreadyPurchased:purchased.has(bundle.id),
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
  const bundle=HOPE_STUDIO_BUNDLES.find(item=>item.id===body.bundleId)
  if(!bundle)return NextResponse.json({success:false,reason:'invalid_bundle'},{status:400,headers})
  return NextResponse.json({success:true,alreadyOwned:true,bundleId:bundle.id,chargedSystemSwitch:0},{headers})
}
