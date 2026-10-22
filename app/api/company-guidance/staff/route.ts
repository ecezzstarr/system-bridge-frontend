import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { ensureAgenticBridgerPurchaseTable } from '@/lib/agentic-bridger-purchase'
import {
  getGuidanceStaffDepartments,isGuidanceDepartment,GUIDANCE_DEPARTMENT_NAMES,
} from '@/lib/weave-guidance-departments'
export const dynamic='force-dynamic'
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const privateRoom=(first:string,second:string)=>[first,second].sort().join('-')
async function companyAdmin(client:any){
  const {rows}=await client.query("SELECT id FROM users WHERE role='admin' AND is_active=true ORDER BY created_at ASC NULLS LAST,id ASC LIMIT 1")
  return rows[0]||null
}
async function checkThread(client:any,adminId:string,requesterId:string,department:string){
  if(!uuid.test(requesterId))return null
  const roomId=privateRoom(adminId,requesterId)
  // A staff member cannot manufacture a requester thread or inspect someone
  // simply by knowing their user ID. The requester must have opened this
  // exact Company Guidance position with their own message.
  const {rows}=await client.query(`
    SELECT u.id,u.name,u.username,u.role
    FROM users u
    WHERE u.id=$1::uuid AND u.role IN ('agent','bridger') AND u.is_active=true
      AND EXISTS (
        SELECT 1 FROM lounge_messages lm
        WHERE lm.room_type='private' AND lm.room_id=$2
          AND lm.message_type=$3 AND lm.user_id=u.id
      )
    LIMIT 1
  `,[requesterId,roomId,'cg:'+department])
  return rows[0]||null
}

export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||!['agent','bridger'].includes(user.role))
    return NextResponse.json({success:false,error:'An active approved department appointment is required.'},{status:403})
  const department=request.nextUrl.searchParams.get('department')
  if(!isGuidanceDepartment(department))
    return NextResponse.json({success:false,error:'Select a Company Guidance department.'},{status:400})
  try{
    const allowed=await getGuidanceStaffDepartments(user)
    if(!allowed.includes(department))return NextResponse.json({success:false,error:'You are not approved for this guidance department.'},{status:403})
    const client=await getPool().connect()
    try{
      const admin=await companyAdmin(client)
      if(!admin)return NextResponse.json({success:false,error:'Administration currently unavailable.'},{status:503})
      const requesterId=request.nextUrl.searchParams.get('requesterId')
      if(requesterId){
        const person=await checkThread(client,String(admin.id),requesterId,department)
        if(!person)return NextResponse.json({success:false,error:'No authorized requester thread found.'},{status:404})
        const {rows}=await client.query(`
          SELECT id,user_id AS "userId",sender_name AS sender,sender_role AS "senderRole",
                 content,is_read AS "isRead",created_at AS "createdAt"
          FROM lounge_messages
          WHERE room_type='private' AND room_id=$1 AND message_type=$2
          ORDER BY created_at ASC LIMIT 500
        `,[privateRoom(String(admin.id),requesterId),'cg:'+department])
        return NextResponse.json({success:true,department,requester:person,messages:rows},
          {headers:{'Cache-Control':'private, no-store'}})
      }
      const {rows}=await client.query(`
        WITH requesters AS (
          SELECT u.id,u.name,u.username,u.role,
            MIN(lm.created_at) AS first_request_at
          FROM lounge_messages lm
          JOIN users u ON u.id=lm.user_id
          WHERE lm.room_type='private' AND lm.message_type=$1
            AND u.role IN ('agent','bridger') AND u.is_active=true
            AND lm.room_id=LEAST($2::text,u.id::text)||'-'||GREATEST($2::text,u.id::text)
          GROUP BY u.id,u.name,u.username,u.role
        )
        SELECT r.id AS "requesterId",r.name,r.username,r.role,
               MAX(m.created_at) AS "lastMessageAt",
               COUNT(*)::int AS "messageCount"
        FROM requesters r
        JOIN lounge_messages m ON m.room_type='private'
          AND m.message_type=$1
          AND m.room_id=LEAST($2::text,r.id::text)||'-'||GREATEST($2::text,r.id::text)
        GROUP BY r.id,r.name,r.username,r.role
        ORDER BY "lastMessageAt" DESC LIMIT 100
      `,['cg:'+department,String(admin.id)])
      return NextResponse.json({success:true,department,threads:rows},
        {headers:{'Cache-Control':'private, no-store'}})
    }finally{client.release()}
  }catch(error){
    console.error('[Company Guidance staff] GET',error)
    return NextResponse.json({success:false,error:'Department inbox unavailable'},{status:500})
  }
}

export async function POST(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||!['agent','bridger'].includes(user.role))
    return NextResponse.json({success:false,error:'Approved Agent or Bridger support position required.'},{status:403})
  const body=await request.json().catch(()=>({}))
  const department=body.department
  const requesterId=typeof body.requesterId==='string'?body.requesterId:''
  const content=typeof body.content==='string'?body.content.trim():''
  if(!isGuidanceDepartment(department)||!uuid.test(requesterId)||content.length<1||content.length>10000)
    return NextResponse.json({success:false,error:'Valid department, requester and message of 1–10000 characters required.'},{status:400})
  try{
    const allowed=await getGuidanceStaffDepartments(user)
    if(!allowed.includes(department))return NextResponse.json({success:false,error:'Your department appointment is not active.'},{status:403})
    await ensureAgenticBridgerPurchaseTable()
    const client=await getPool().connect()
    try{
      await client.query('BEGIN')
      // Lock the assignment and active position through message commit. Revocation
      // waits for an already-authorized reply; later replies cannot use stale approval.
      const appointment=await client.query(`
        SELECT a.id FROM weave_guidance_staff_applications a JOIN users u ON u.id=a.user_id
        WHERE a.user_id=$1::uuid AND a.department=$2 AND a.source_role=$3 AND a.status='approved'
          AND u.role=$3 AND COALESCE(u.is_active,true)=true
          AND (u.role='agent' OR EXISTS (
            SELECT 1 FROM bridger_agentic_purchases ap WHERE ap.user_id=u.id
          ))
        FOR SHARE OF a,u
      `,[user.id,department,user.role])
      if(!appointment.rows.length){await client.query('ROLLBACK');return NextResponse.json({success:false,error:'Your department appointment is no longer active.'},{status:403})}
      const admin=await companyAdmin(client)
      if(!admin){await client.query('ROLLBACK');return NextResponse.json({success:false,error:'Administration currently unavailable.'},{status:503})}
      const person=await checkThread(client,String(admin.id),requesterId,department)
      if(!person){await client.query('ROLLBACK');return NextResponse.json({success:false,error:'No authorized requester thread found.'},{status:404})}
      const roomId=privateRoom(String(admin.id),requesterId)
      const senderName=(user.name||user.username||'WEAVE Support')+' · '+GUIDANCE_DEPARTMENT_NAMES[department]
      const {rows}=await client.query(`
        INSERT INTO lounge_messages
          (room_type,room_id,user_id,sender_name,sender_avatar,sender_role,content,message_type,media_url)
        VALUES('private',$1,$2::uuid,$3,'👤',$4,$5,$6,NULL)
        RETURNING id,user_id AS "userId",sender_name AS sender,sender_role AS "senderRole",
                 content,created_at AS "createdAt"
      `,[roomId,user.id,senderName,user.role,content,'cg:'+department])
      await client.query('COMMIT')
      await client.query(`
        INSERT INTO notifications(user_id,type,title,content,from_user_id,from_user_name,link)
        VALUES($1::uuid,'company_guidance',$2,$3,$4::uuid,$5,$6)
      `,[
        requesterId,GUIDANCE_DEPARTMENT_NAMES[department]+' support replied',
        content.slice(0,140),user.id,senderName,'/company-chat/'+department,
      ]).catch(()=>{})
      return NextResponse.json({success:true,message:rows[0]},{status:201})
    }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
  }catch(error){
    console.error('[Company Guidance staff] POST',error)
    return NextResponse.json({success:false,error:'Unable to send a departmental reply'},{status:500})
  }
}
