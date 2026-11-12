import {getPool} from '@/lib/db'

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
type Activity={
  event:string
  eventId:string
  title:string
  content:string
  adminPath:string
  actorId?:string|null
  actorName?:string|null
}

/**
 * One real, committed business activity becomes one inbox/push notification
 * per active Administrations account. Retries cannot multiply an event.
 * This function is server-only and must never be callable by a browser.
 */
export async function notifyAdministrationsActivity(input:Activity):Promise<boolean>{
  const event=String(input.event||'').trim().toLowerCase()
  const eventId=String(input.eventId||'').trim()
  if(!/^[a-z][a-z0-9_]{2,60}$/.test(event)||!eventId||eventId.length>160){
    console.error('[administrations activity] Invalid event identity',event)
    return false
  }
  const type='company_activity_'+event
  const path=input.adminPath.startsWith('/admin/')?input.adminPath:'/admin/control-center'
  const separator=path.includes('?')?'&':'?'
  const link=path+separator+'activity='+encodeURIComponent(eventId)
  const title=String(input.title||'Company activity').slice(0,200)
  const content=String(input.content||'Open the company workspace for details.').slice(0,1600)
  const actorId=input.actorId&&uuid.test(input.actorId)?input.actorId:null
  const actorName=String(input.actorName||'WEAVE Company of Time').slice(0,160)

  let db
  try{
    db=await getPool().connect()
    await db.query('BEGIN')
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[type+':'+eventId])
    const inserted=await db.query(`
      INSERT INTO notifications (user_id,type,title,content,from_user_id,from_user_name,link)
      SELECT u.id,$1,$2,$3,$4::uuid,$5,$6
      FROM users u
      WHERE u.role='admin' AND COALESCE(u.is_active,true)=true
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.user_id=u.id AND n.type=$1 AND n.link=$6
        )
      RETURNING user_id`,[type,title,content,actorId,actorName,link])
    const count=await db.query("SELECT count(*)::int AS recipients FROM users WHERE role='admin' AND COALESCE(is_active,true)=true")
    await db.query('COMMIT')
    if(Number(count.rows[0]?.recipients||0)===0){
      console.error('[administrations activity] No active Administrations recipients',event,eventId)
      return false
    }
    return true // Zero new rows also means the same event was already delivered.
  }catch(error){
    if(db)await db.query('ROLLBACK').catch(()=>{})
    console.error('[administrations activity] Notification persistence failed',{event,eventId,error})
    return false
  }finally{
    db?.release()
  }
}
