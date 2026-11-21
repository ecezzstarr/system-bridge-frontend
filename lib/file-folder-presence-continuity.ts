import {getPool} from '@/lib/db'

/**
 * A File Folder's owner can leave its operating environment without erasing
 * genuine work by employed Legions or connected systems.
 *
 * Reports are human attestations, not verified sales, wages or instructions.
 * Recognition never changes a worker's employment or business transaction.
 */
export const LEGION_WORK_KINDS=['outreach','distribution','production','service','customer_support','other'] as const
export type LegionWorkKind=typeof LEGION_WORK_KINDS[number]

let ready:Promise<void>|null=null
export function ensureFileFolderPresenceSchema():Promise<void>{
  if(ready)return ready
  ready=(async()=>{
    const db=getPool()
    await db.query([
      'CREATE TABLE IF NOT EXISTS client_file_folder_presence_movements (',
      'id uuid PRIMARY KEY DEFAULT gen_random_uuid(),',
      'client_id uuid NOT NULL, file_number varchar(120) NOT NULL,',
      'legion_id uuid NOT NULL, actor_user_id uuid NOT NULL,',
      'request_id uuid NOT NULL, kind varchar(32) NOT NULL,',
      'description varchar(280) NOT NULL,',
      "record_status varchar(32) NOT NULL DEFAULT 'self_reported',",
      'created_at timestamptz NOT NULL DEFAULT NOW(),',
      'UNIQUE(actor_user_id,request_id),',
      "CHECK(kind IN ('outreach','distribution','production','service','customer_support','other'))",
      ')'
    ].join(' '))
    await db.query('CREATE INDEX IF NOT EXISTS idx_client_presence_movements_owner ON client_file_folder_presence_movements(client_id,file_number,created_at DESC)')
    await db.query('CREATE INDEX IF NOT EXISTS idx_client_presence_movements_worker ON client_file_folder_presence_movements(actor_user_id,created_at DESC)')
    await db.query([
      'CREATE TABLE IF NOT EXISTS client_file_folder_presence_reviews (',
      'client_id uuid PRIMARY KEY, file_number varchar(120) NOT NULL,',
      'reviewed_at timestamptz NOT NULL, updated_at timestamptz NOT NULL DEFAULT NOW())'
    ].join(' '))
  })().catch(error=>{ready=null;throw error})
  return ready
}

export type PresenceMovement={
  id:string
  kind:'legion_report'|'order'|'settlement'|'system'
  title:string
  detail:string
  at:string
  verified:boolean
}

export async function getOwnerPresenceSnapshot(clientId:string,fileNumber:string){
  await ensureFileFolderPresenceSchema()
  const db=getPool()
  const [clock]= (await db.query('SELECT NOW() AS through')).rows
  const through=new Date(clock.through).toISOString()
  const last=(await db.query(
    'SELECT reviewed_at FROM client_file_folder_presence_reviews WHERE client_id=$1::uuid AND file_number=$2',
    [clientId,fileNumber]
  )).rows[0]
  const reviewedAt=last?.reviewed_at?new Date(last.reviewed_at).toISOString():null
  const since=reviewedAt||new Date(Date.parse(through)-30*86400000).toISOString()
  const [legions,systems,builds,orders,settlements,reports]=await Promise.all([
    db.query("SELECT COUNT(*)::int AS count FROM enterprise_legions WHERE client_id=$1::uuid AND file_number=$2 AND active=true AND employment_status='active' AND source_user_id IS NOT NULL",[clientId,fileNumber]),
    db.query("SELECT id,title,activated_at FROM client_built_systems WHERE client_id=$1::uuid AND file_number=$2 AND status='active' AND activated_at>$3::timestamptz AND activated_at<=$4::timestamptz ORDER BY activated_at DESC LIMIT 25",[clientId,fileNumber,since,through]),
    db.query("SELECT COUNT(*)::int AS count FROM client_file_folder_builds WHERE client_id=$1::uuid AND file_number=$2 AND status='building'",[clientId,fileNumber]),
    db.query([
      'SELECT o.id,o.created_at,o.payment_status,o.legion_id,',
      'CASE WHEN o.legion_id IS NOT NULL THEN l.name ELSE NULL END AS legion_name',
      'FROM client_store_orders o',
      'JOIN client_business_stores s ON s.id=o.store_id',
      'LEFT JOIN enterprise_legions l ON l.id=o.legion_id AND l.client_id=s.client_id',
      'WHERE s.client_id=$1::uuid AND s.file_number=$2',
      'AND o.created_at>$3::timestamptz AND o.created_at<=$4::timestamptz',
      'ORDER BY o.created_at DESC LIMIT 25'
    ].join(' '),[clientId,fileNumber,since,through]),
    db.query([
      'SELECT p.id,p.created_at,p.receipt_number,p.credited_flame_coin',
      'FROM client_customer_door_settlements p',
      'JOIN client_business_stores s ON s.id=p.store_id AND s.client_id=p.client_id',
      'WHERE p.client_id=$1::uuid AND s.file_number=$2',
      'AND p.created_at>$3::timestamptz AND p.created_at<=$4::timestamptz',
      'ORDER BY p.created_at DESC LIMIT 25'
    ].join(' '),[clientId,fileNumber,since,through]),
    db.query([
      'SELECT m.id,m.kind,m.description,m.created_at,l.name AS legion_name',
      'FROM client_file_folder_presence_movements m',
      'JOIN enterprise_legions l ON l.id=m.legion_id AND l.client_id=m.client_id',
      'WHERE m.client_id=$1::uuid AND m.file_number=$2',
      'AND m.created_at>$3::timestamptz AND m.created_at<=$4::timestamptz',
      'ORDER BY m.created_at DESC LIMIT 25'
    ].join(' '),[clientId,fileNumber,since,through]),
  ])
  const events:PresenceMovement[]=[
    ...reports.rows.map(row=>({
      id:String(row.id),kind:'legion_report' as const,
      title:'Legion reported '+String(row.kind).replaceAll('_',' '),
      detail:String(row.legion_name||'Employed Legion')+': '+String(row.description),
      at:new Date(row.created_at).toISOString(),verified:false,
    })),
    ...orders.rows.map(row=>({
      id:String(row.id),kind:'order' as const,title:'Customer Door order recorded',
      detail:row.legion_name?'Attributed to '+String(row.legion_name)+'; payment status: '+String(row.payment_status):'Payment status: '+String(row.payment_status),
      at:new Date(row.created_at).toISOString(),verified:false,
    })),
    ...settlements.rows.map(row=>({
      id:String(row.id),kind:'settlement' as const,title:'Customer Door funds settled',
      detail:String(row.credited_flame_coin)+' System Switch · receipt '+String(row.receipt_number),
      at:new Date(row.created_at).toISOString(),verified:true,
    })),
    ...systems.rows.map(row=>({
      id:String(row.id),kind:'system' as const,title:'Operating system commissioned',
      detail:String(row.title),at:new Date(row.activated_at).toISOString(),verified:true,
    })),
  ].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,18)
  return {
    reviewedAt,through,windowStart:since,firstReview:!reviewedAt,
    activeLegions:Number(legions.rows[0]?.count||0),
    buildsUnderConstruction:Number(builds.rows[0]?.count||0),
    movements:events,
    // Movement is activity evidence only; employment does not imply work.
    note:'Legion notes are self-reported. Customer orders are not receipts; only independently funded settlements are confirmed payment. Recognition does not approve, pay, or direct anyone.'
  }
}

export async function recognizeOwnerPresence(clientId:string,fileNumber:string,through:string){
  await ensureFileFolderPresenceSchema()
  const db=getPool()
  const date=new Date(through)
  if(!Number.isFinite(date.getTime()))throw Error('Valid snapshot time required')
  const [clock]=(await db.query('SELECT NOW() AS now')).rows
  const serverNow=new Date(clock.now).getTime()
  if(date.getTime()>serverNow||date.getTime()<serverNow-24*3600000)
    throw Error('Refresh your File Folder movement before recognizing it')
  const res=await db.query([
    'INSERT INTO client_file_folder_presence_reviews (client_id,file_number,reviewed_at)',
    'VALUES ($1::uuid,$2,$3::timestamptz)',
    'ON CONFLICT (client_id) DO UPDATE SET',
    'file_number=EXCLUDED.file_number,',
    'reviewed_at=GREATEST(client_file_folder_presence_reviews.reviewed_at,EXCLUDED.reviewed_at),',
    'updated_at=NOW()',
    'RETURNING reviewed_at'
  ].join(' '),[clientId,fileNumber,date.toISOString()])
  return new Date(res.rows[0].reviewed_at).toISOString()
}
