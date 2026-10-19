import { getPool } from './db'

type OrderAlert={
  /** Immutable ID of a committed, real order; not a client-provided reference. */
  orderId:string
  event:'placed'|'payment_submitted'|'paid'|'cancelled'|'fulfilled'|'allocated'
  department:'agent'|'bridger'|'client'|'visitor'
  subject:string
  detail:string
  adminPath:string
  actorId?:string|null
  actorName?:string|null
}

const validUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Persist one Admin-bell event per administrator, order and event.
 * Locking and NOT EXISTS make retries idempotent without adding a migration.
 * All callers invoke this only AFTER the order database commit succeeds.
 *
 * Notifications are operational alerts, not a record of verified payment.
 * Payment-submitted and paid are intentionally distinct.
 */
export async function notifyAdminOrder(input:OrderAlert):Promise<boolean>{
  const orderId=String(input.orderId||'').trim()
  if(!validUuid.test(orderId)){
    console.error('[admin order alert] Invalid committed order id',input.department,input.event)
    return false
  }
  const type='order_'+input.event
  const path=input.adminPath.startsWith('/admin/')?input.adminPath:'/admin/control-center'
  const sep=path.includes('?')?'&':'?'
  const link=path+sep+'order='+encodeURIComponent(orderId)
  const title=(input.subject+' · '+input.event.replaceAll('_',' ')).slice(0,200)
  const content=('['+input.department.toUpperCase()+'] '+input.detail+' · Order '+orderId).slice(0,1600)
  const actorId=input.actorId&&validUuid.test(input.actorId)?input.actorId:null
  const actorName=(input.actorName||input.department).slice(0,160)
  const db=await getPool().connect().catch(error=>{
    console.error('[admin order alert] Connection failed',error)
    return null
  })
  if(!db)return false
  try{
    await db.query('BEGIN')
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',['weave:admin-order:'+type+':'+orderId])
    const result=await db.query(
      `INSERT INTO notifications (user_id,type,title,content,from_user_id,from_user_name,link)
       SELECT u.id,$1,$2,$3,$4::uuid,$5,$6
       FROM users u
       WHERE u.role='admin' AND COALESCE(u.is_active,true)=true
         AND NOT EXISTS(
           SELECT 1 FROM notifications n
           WHERE n.user_id=u.id AND n.type=$1 AND n.link=$6
         )
       RETURNING user_id`,
      [type,title,content,actorId,actorName,link]
    )
    await db.query('COMMIT')
    if(!result.rowCount){
      // Zero may mean this event was already delivered to every active Admin.
      // Do not imply that any fresh Admin received it.
      return true
    }
    return true
  }catch(error){
    await db.query('ROLLBACK').catch(()=>{})
    console.error('[admin order alert] Notification persistence failed',{
      department:input.department,event:input.event,orderId,error,
    })
    return false
  }finally{
    db.release()
  }
}
