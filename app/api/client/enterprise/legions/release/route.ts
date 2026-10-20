import { NextRequest,NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { resolveClientToken } from '@/lib/client-vault'
import { releaseLegionEmployment } from '@/lib/legion-employment'
import { recordSystemEvent } from '@/lib/system-events'
import {notifyAdministrators} from '@/lib/deposit-notifications'

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Ending an existing Legion's appointment is not recruiting a new Legion:
 * it remains available to the Client even if the Client monthly subscription
 * has expired or Legion Quarters are temporarily inactive.
 */
export async function POST(request:NextRequest){
  const token=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'').trim()||null
  const clientId=await resolveClientToken(token,sql)
  if(!clientId)return NextResponse.json({success:false,error:'Client login required'},{status:401})
  const body=await request.json().catch(()=>({}))
  const legionId=String(body.legionId||'')
  const reason=String(body.reason||'').trim()
  if(!uuid.test(legionId)||reason.length<5||reason.length>1200)
    return NextResponse.json({success:false,error:'Choose a valid Legion and provide a clear release reason.'},{status:400})
  const result=await releaseLegionEmployment(sql,{
    legionId,actorUserId:String(clientId),actorPosition:'client',reason,
  })
  if(!result.success)return NextResponse.json(result,{status:result.status||500})
  if(!result.alreadyReleased)await recordSystemEvent({
    eventType:'legion_employment_released',actorId:String(clientId),actorRole:'client',
    subjectType:'enterprise_legion',subjectId:legionId,source:'enterprise-legion-quarters',
    payload:{releasedBy:'client',pendingOrders:result.pendingOrders,unpaidOrders:result.unpaidOrders},
  }).catch(e=>console.error('[Legion release event]',e))
  if(!result.alreadyReleased)await notifyAdministrators({
    type:'legion_employment_released',title:'Client released an enterprise Legion',
    content:`Client released Legion ${legionId}. ${result.pendingOrders||0} unfinished orders remain assigned to the Client enterprise. Reason: ${reason.slice(0,180)}`,
    link:'/admin/legion-releases',fromUserId:String(clientId),fromUserName:'Client',
  })
  return NextResponse.json(result)
}
