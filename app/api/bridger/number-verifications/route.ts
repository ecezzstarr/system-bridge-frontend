import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getSql } from '@/lib/db'
import { ensureBridgerNumberEngineSchema } from '@/lib/bridger-number-engine'

export const dynamic='force-dynamic'

export async function GET(request:NextRequest){
 const user=await getAuthUser(request)
 if(!user)return NextResponse.json({error:'Unauthorized'},{status:401})
 const sql=getSql();await ensureBridgerNumberEngineSchema(sql)
 if(user.role==='admin'){
  const requests=await sql`
   SELECT r.*,n.phone_e164,n.country,u.name AS bridger_name,u.email AS bridger_email
   FROM bridger_number_verification_requests r
   JOIN bridger_whatsapp_numbers n ON n.id=r.number_id
   JOIN users u ON u.id=r.bridger_id
   ORDER BY CASE WHEN r.status='requested' THEN 0 WHEN r.status='pending' THEN 1 ELSE 2 END,r.deadline_at ASC
   LIMIT 300
  `
  return NextResponse.json({success:true,requests},{headers:{'Cache-Control':'private, no-store'}})
 }
 if(user.role!=='bridger')return NextResponse.json({error:'Forbidden'},{status:403})
 const requests=await sql`
  SELECT r.*,n.phone_e164,n.country
  FROM bridger_number_verification_requests r
  JOIN bridger_whatsapp_numbers n ON n.id=r.number_id
  WHERE r.bridger_id=${user.id}::uuid
  ORDER BY r.requested_at DESC LIMIT 100
 `
 return NextResponse.json({success:true,requests},{headers:{'Cache-Control':'private, no-store'}})
}

export async function POST(request:NextRequest){
 const user=await getAuthUser(request)
 if(!user)return NextResponse.json({error:'Unauthorized'},{status:401})
 if(user.role!=='bridger')return NextResponse.json({error:'Only Bridgers can request a code'},{status:403})
 const body=await request.json();const numberId=String(body.numberId||'');const method=body.method==='call'?'call':'sms'
 const sql=getSql();await ensureBridgerNumberEngineSchema(sql)
 const [number]=await sql`SELECT id FROM bridger_whatsapp_numbers WHERE id=${numberId}::uuid AND assigned_to=${user.id}::uuid AND status='assigned'`
 if(!number)return NextResponse.json({error:'Assigned number not found'},{status:404})
 const [open]=await sql`SELECT id,status,deadline_at FROM bridger_number_verification_requests WHERE number_id=${numberId}::uuid AND bridger_id=${user.id}::uuid AND status IN ('requested','pending','code_ready') ORDER BY requested_at DESC LIMIT 1`
 if(open)return NextResponse.json({error:'This number already has an active verification request',request:open},{status:409})
 const [requestRow]=await sql`
  INSERT INTO bridger_number_verification_requests(number_id,bridger_id,method)
  VALUES(${numberId}::uuid,${user.id}::uuid,${method})
  RETURNING *
 `
 return NextResponse.json({success:true,request:requestRow})
}

export async function PATCH(request:NextRequest){
 const user=await getAuthUser(request)
 if(!user)return NextResponse.json({error:'Unauthorized'},{status:401})
 const body=await request.json();const id=String(body.id||'')
 const sql=getSql();await ensureBridgerNumberEngineSchema(sql)
 if(user.role==='admin'){
  const status=String(body.status||'')
  if(!['pending','code_ready','failed'].includes(status))return NextResponse.json({error:'Invalid Administration action'},{status:400})
  const message=String(body.message||'').trim().slice(0,1000)
  const code=String(body.code||'').trim().slice(0,120)
  if(status==='pending'&&!message)return NextResponse.json({error:'Explain why the code is pending'},{status:400})
  if(status==='code_ready'&&!code)return NextResponse.json({error:'Enter the code received from Aphone'},{status:400})
  const [row]=await sql`
   UPDATE bridger_number_verification_requests
   SET status=${status},admin_message=${message||null},verification_code=${status==='code_ready'?code:null},
       responded_at=NOW(),updated_at=NOW()
   WHERE id=${id}::uuid AND status IN ('requested','pending')
   RETURNING *
  `
  if(!row)return NextResponse.json({error:'Request is no longer awaiting Administration'},{status:409})
  return NextResponse.json({success:true,request:row})
 }
 if(user.role==='bridger'){
  const [row]=await sql`
   UPDATE bridger_number_verification_requests
   SET status='verified',verified_at=NOW(),verification_code=NULL,updated_at=NOW()
   WHERE id=${id}::uuid AND bridger_id=${user.id}::uuid AND status='code_ready'
   RETURNING id,status,verified_at
  `
  if(!row)return NextResponse.json({error:'No delivered code is awaiting verification'},{status:409})
  return NextResponse.json({success:true,request:row})
 }
 return NextResponse.json({error:'Forbidden'},{status:403})
}
