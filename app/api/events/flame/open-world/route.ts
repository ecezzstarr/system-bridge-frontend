import {NextRequest,NextResponse} from 'next/server'
import {getBusinessDb,ensureClientBusinessStoreSchema} from '@/lib/client-business-store'
import {ensureClientFileFolderSchema} from '@/lib/client-file-folder'
import {ensureFileFolderWorldSchema} from '@/lib/client-file-folder-world'
import {matureElapsedCustomerDoors} from '@/lib/customer-door-maturity'
import {getPublicBurningRiverWorld,reconcileExistingWorldDomains} from '@/lib/weave-open-world-store'
import {FLAME_EVENT,resolveEventStatus} from '@/lib/weave-event'
import {getFlameEvent} from '@/lib/weave-event-store'

export const dynamic='force-dynamic'

// Read requests arrive from many phones every 15 seconds. Run catalog
// initialization once per warm server instance rather than re-seeding it on
// every poll. On failure, clear the promise so a later request can recover.
let initialization:Promise<void>|null=null
let lastReconciliation=0
let reconciliation:Promise<void>|null=null

async function readyWorldStorage(sql:any){
  if(!initialization){
    initialization=(async()=>{
      await ensureClientFileFolderSchema(sql)
      await ensureFileFolderWorldSchema(sql)
      await ensureClientBusinessStoreSchema(sql)
    })().catch(error=>{initialization=null;throw error})
  }
  await initialization
  // Verified new purchases provision their own domain immediately. Older
  // active Client folders are reconciled periodically, not on every GET.
  if(Date.now()-lastReconciliation>120000){
    if(!reconciliation){
      reconciliation=reconcileExistingWorldDomains(sql)
        .then(()=>{lastReconciliation=Date.now()})
        .finally(()=>{reconciliation=null})
    }
    await reconciliation
  }
}

/**
 * Public world map: purchased domains are visible from the first construction
 * stage. No Client File Number, owner ID, private blueprint, unpublished system,
 * private correspondence or personal address is returned.
 * Actual Customer Door links are emitted only after public commissioning.
 */
export async function GET(request:NextRequest){
  try{
    const sql=getBusinessDb()
    await readyWorldStorage(sql)
    await matureElapsedCustomerDoors(sql)
    const pageRaw=Number(request.nextUrl.searchParams.get('page')||0)
    if(!Number.isInteger(pageRaw)||pageRaw<0||pageRaw>1000)
      return NextResponse.json({error:'Invalid map page'},{status:400})
    const [world,event]=await Promise.all([getPublicBurningRiverWorld(sql,pageRaw),getFlameEvent()])
    return NextResponse.json({
      success:true,
      event:{key:FLAME_EVENT.key,label:'Company Loop 1 — Flame Event: Burning River',
        status:event.effectiveStatus||resolveEventStatus(event),worldMode:'systems_and_business_expansion',
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
