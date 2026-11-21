import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {sql,getPool} from '@/lib/db'
import {trustedMutationOrigin} from '@/lib/request-origin'
import {getActiveLegionEmployment,ensureLegionEmploymentSchema} from '@/lib/legion-employment'
import {LEGION_WORK_KINDS,ensureFileFolderPresenceSchema} from '@/lib/file-folder-presence-continuity'
import {notifyUser} from '@/lib/deposit-notifications'

export const dynamic='force-dynamic'
const privateHeaders={'Cache-Control':'private, no-store'}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function activeWorker(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||user.role!=='legion'||!['agent','bridger'].includes(String(user.baseRole||'')))
    return {user:null,employment:null}
  await ensureLegionEmploymentSchema(sql)
  const employment=await getActiveLegionEmployment(sql,user.id)
  return {user,employment:employment.active?employment:null}
}

export async function GET(request:NextRequest){
  try{
    const {user,employment}=await activeWorker(request)
    if(!user||!employment?.legionId)return NextResponse.json({error:'Active Legion position required'},{status:403,headers:privateHeaders})
    await ensureFileFolderPresenceSchema()
    const res=await getPool().query([
      'SELECT id,kind,description,record_status,created_at',
      'FROM client_file_folder_presence_movements',
      'WHERE actor_user_id=$1::uuid AND legion_id=$2::uuid',
      'ORDER BY created_at DESC LIMIT 12'
    ].join(' '),[user.id,employment.legionId])
    return NextResponse.json({success:true,movements:res.rows},{headers:privateHeaders})
  }catch(error){
    console.error('[Legion presence GET]',error)
    return NextResponse.json({error:'Unable to read your reported work'},{status:503,headers:privateHeaders})
  }
}

export async function POST(request:NextRequest){
  if(!trustedMutationOrigin(request))
    return NextResponse.json({error:'Cross-origin work reports are not allowed'},{status:403,headers:privateHeaders})
  try{
    const {user,employment}=await activeWorker(request)
    if(!user||!employment?.legionId||!employment.clientId)
      return NextResponse.json({error:'Active Client Legion employment required'},{status:403,headers:privateHeaders})
    const body=await request.json().catch(()=>({}))
    const kind=String(body?.kind||'')
    const description=typeof body?.description==='string'?body.description.trim():''
    const requestId=String(body?.requestId||'')
    if(!LEGION_WORK_KINDS.includes(kind as typeof LEGION_WORK_KINDS[number])||description.length<12||description.length>280||!uuid.test(requestId))
      return NextResponse.json({error:'Choose work type, describe the actual activity (12–280 characters), and use a unique request ID'},{status:422,headers:privateHeaders})
    await ensureFileFolderPresenceSchema()
    const db=getPool()
    const existing=await db.query(
      'SELECT id,kind,description,created_at FROM client_file_folder_presence_movements WHERE actor_user_id=$1::uuid AND request_id=$2::uuid',
      [user.id,requestId]
    )
    if(existing.rows[0]){
      const row=existing.rows[0]
      if(row.kind!==kind||row.description!==description)return NextResponse.json({error:'This work report ID already belongs to different activity'},{status:409,headers:privateHeaders})
      return NextResponse.json({success:true,alreadyRecorded:true,movement:row},{headers:privateHeaders})
    }
    const volume=await db.query(
      "SELECT COUNT(*)::int AS count FROM client_file_folder_presence_movements WHERE actor_user_id=$1::uuid AND created_at>NOW()-INTERVAL '1 hour'",
      [user.id]
    )
    if(Number(volume.rows[0]?.count||0)>=8)
      return NextResponse.json({error:'Hourly work report limit reached. Continue your assigned work and return later.'},{status:429,headers:privateHeaders})
    const result=await db.query([
      'INSERT INTO client_file_folder_presence_movements',
      '(client_id,file_number,legion_id,actor_user_id,request_id,kind,description)',
      'SELECT l.client_id,l.file_number,l.id,l.source_user_id,$3::uuid,$4,$5',
      'FROM enterprise_legions l',
      'JOIN client_file_folders f ON f.client_id=l.client_id AND f.file_number=l.file_number AND f.status=\'active\'',
      'WHERE l.id=$1::uuid AND l.source_user_id=$2::uuid',
      "AND l.active=true AND l.employment_status='active'",
      'ON CONFLICT(actor_user_id,request_id) DO NOTHING',
      'RETURNING id,kind,description,record_status,created_at'
    ].join(' '),[employment.legionId,user.id,requestId,kind,description])
    if(!result.rows[0]){
      const repeated=await db.query(
        'SELECT id,kind,description,created_at FROM client_file_folder_presence_movements WHERE actor_user_id=$1::uuid AND request_id=$2::uuid',
        [user.id,requestId]
      )
      if(repeated.rows[0]&&repeated.rows[0].kind===kind&&repeated.rows[0].description===description)
        return NextResponse.json({success:true,alreadyRecorded:true,movement:repeated.rows[0]},{headers:privateHeaders})
      return NextResponse.json({error:'Legion employment changed or work request was already used'},{status:409,headers:privateHeaders})
    }
    await notifyUser(String(employment.clientId),{
      type:'client_legion_presence',
      title:'Your File Folder · Legion work reported',
      content:String(user.name||'Legion')+' reported '+kind.replaceAll('_',' ')+'. Review the activity in your File Folder. The report is not a verified sale.',
      fromUserId:user.id,fromUserName:user.name||'Legion',
      link:'/client/system-switch',
    }).catch(error=>console.error('[Legion report notification]',error))
    return NextResponse.json({success:true,movement:result.rows[0]},{status:201,headers:privateHeaders})
  }catch(error){
    console.error('[Legion presence POST]',error)
    return NextResponse.json({error:'Unable to record work at this time'},{status:503,headers:privateHeaders})
  }
}
