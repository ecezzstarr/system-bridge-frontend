import {NextRequest,NextResponse} from 'next/server'
import {getBusinessDb,ensureClientBusinessStoreSchema} from '@/lib/client-business-store'
import {ensureClientFileFolderSchema} from '@/lib/client-file-folder'
import {ensureFileFolderWorldSchema} from '@/lib/client-file-folder-world'
import {matureElapsedCustomerDoors} from '@/lib/customer-door-maturity'
import {getPublicBurningRiverWorld,reconcileExistingWorldDomains} from '@/lib/weave-open-world-store'
import {FLAME_EVENT,resolveEventStatus} from '@/lib/weave-event'

export const dynamic='force-dynamic'

/**
 * Public world map: purchased domains are visible from the first construction
 * stage. No Client File Number, owner ID, private blueprint, unpublished system,
 * private correspondence or personal address is returned.
 * Actual Customer Door links are emitted only after public commissioning.
 */
export async function GET(request:NextRequest){
  try{
    const sql=getBusinessDb()
    await ensureClientFileFolderSchema(sql)
    await ensureFileFolderWorldSchema(sql)
    await ensureClientBusinessStoreSchema(sql)
    await reconcileExistingWorldDomains(sql)
    await matureElapsedCustomerDoors(sql)
    const pageRaw=Number(request.nextUrl.searchParams.get('page')||0)
    if(!Number.isInteger(pageRaw)||pageRaw<0||pageRaw>1000)
      return NextResponse.json({error:'Invalid map page'},{status:400})
    const world=await getPublicBurningRiverWorld(sql,pageRaw)
    return NextResponse.json({
      success:true,
      event:{key:FLAME_EVENT.key,label:'Company Loop 1 — Flame Event: Burning River',
        status:resolveEventStatus(FLAME_EVENT),worldMode:'systems_and_business_expansion',
        combat:false},
      ...world,
      updatedAt:new Date().toISOString(),
    },{headers:{'Cache-Control':'no-store','Vary':'Authorization'}})
  }catch(error){
    console.error('[flame open world public domains]',error)
    return NextResponse.json({success:false,error:'Burning River map is temporarily unavailable.'},
      {status:503,headers:{'Cache-Control':'no-store'}})
  }
}
