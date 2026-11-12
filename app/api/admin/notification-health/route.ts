import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getPool} from '@/lib/db'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store'}
async function authorize(request:NextRequest){
 const user=await getAuthUser(request)
 return user?.role==='admin'?user:null
}

/** Counts only. No candidate identity, tokens, wallet secrets or private messages. */
export async function GET(request:NextRequest){
 const admin=await authorize(request)
 if(!admin)return NextResponse.json({error:'Administrations access required'},{status:403,headers})
 try{
  const db=getPool()
  const [recipients,notifications,tables,types]=await Promise.all([
   db.query("SELECT count(*)::int AS count FROM users WHERE role='admin' AND COALESCE(is_active,true)=true"),
   db.query(`SELECT count(*)::int AS total,
     count(*) FILTER(WHERE user_id=$1::uuid AND is_read=false)::int AS my_unread,
     count(*) FILTER(WHERE created_at>=now()-interval '24 hours')::int AS last_24h,
     max(created_at) AS latest_at
     FROM notifications WHERE user_id IN (
       SELECT id FROM users WHERE role='admin'
     )`,[admin.id]),
   db.query("SELECT to_regclass('public.weave_push_subscriptions') AS subscriptions, to_regclass('public.weave_push_queue') AS queue"),
   db.query(`SELECT type,count(*)::int AS total
     FROM notifications WHERE user_id=$1::uuid AND created_at>=now()-interval '24 hours'
     GROUP BY type ORDER BY total DESC LIMIT 30`,[admin.id]),
  ])
  const found=tables.rows[0]
  const pushSubscribers=found?.subscriptions?await db.query(`SELECT count(*)::int AS count,
    count(*) FILTER(WHERE user_id=$1::uuid)::int AS mine
    FROM weave_push_subscriptions WHERE user_id IN (
      SELECT id FROM users WHERE role='admin'
    )`,[admin.id]):null
  const pushQueue=found?.queue?await db.query(`SELECT count(*)::int AS pending,
    count(*) FILTER(WHERE q.available_at<now()-interval '10 minutes')::int AS delayed,
    count(*) FILTER(WHERE s.user_id=$1::uuid)::int AS mine
    FROM weave_push_queue q JOIN weave_push_subscriptions s USING(endpoint)
    WHERE s.user_id IN (SELECT id FROM users WHERE role='admin')`,[admin.id]):null
  return NextResponse.json({success:true,
   activeAdministrations:Number(recipients.rows[0]?.count||0),
   inbox:{total:Number(notifications.rows[0]?.total||0),
    myUnread:Number(notifications.rows[0]?.my_unread||0),
    last24h:Number(notifications.rows[0]?.last_24h||0),
    latestAt:notifications.rows[0]?.latest_at||null},
   events:types.rows,
   push:{initialized:Boolean(found?.subscriptions&&found?.queue),
    subscribedAdministrationsDevices:Number(pushSubscribers?.rows[0]?.count||0),
    myDevices:Number(pushSubscribers?.rows[0]?.mine||0),
    queued:Number(pushQueue?.rows[0]?.pending||0),
    delayed:Number(pushQueue?.rows[0]?.delayed||0),
    myQueued:Number(pushQueue?.rows[0]?.mine||0)},
  },{headers})
 }catch(error){
  console.error('[administrations notification health] unavailable',error)
  return NextResponse.json({error:'Unable to inspect notification delivery records'},{status:503,headers})
 }
}

/** Explicit self-test; no synthetic purchase, payroll or verification event. */
export async function POST(request:NextRequest){
 const admin=await authorize(request)
 if(!admin)return NextResponse.json({error:'Administrations access required'},{status:403,headers})
 try{
  const db=getPool()
  const saved=await db.query(`
   INSERT INTO notifications(user_id,type,title,content,from_user_name,link)
   SELECT $1::uuid,'company_notification_test','Administrations notification test',
     'This is a test of the WEAVE notification inbox and any enabled device push subscription. No company transaction occurred.',
     'WEAVE Notification Health','/admin/notification-health'
   WHERE NOT EXISTS (
     SELECT 1 FROM notifications WHERE user_id=$1::uuid AND type='company_notification_test'
       AND created_at>now()-interval '5 minutes'
   )
   RETURNING id`,[admin.id])
  return NextResponse.json({success:true,created:saved.rowCount===1,
    notice:saved.rowCount===1?'Test message recorded. Check the bell and subscribed phone.':'A test was already created within five minutes.'},{headers})
 }catch(error){
  console.error('[administrations notification health] test failed',error)
  return NextResponse.json({error:'Notification test could not be recorded'},{status:503,headers})
 }
}
