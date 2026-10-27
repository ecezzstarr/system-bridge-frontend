import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { ensureFoodDistributionEmploymentSchema } from '@/lib/food-distribution-employment'
export const dynamic='force-dynamic'
export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(user?.role!=='admin')return NextResponse.json({success:false,error:'Administration access required.'},{status:403})
  try{
    await ensureFoodDistributionEmploymentSchema()
    const {rows}=await getPool().query(`
      SELECT e.user_id,e.position,e.status,e.application_note,e.manager_user_id,e.administration_note,e.created_at,
        e.reviewed_at,e.hired_at,a.name,a.email,m.name AS manager_name
      FROM weave_food_distribution_employment e JOIN users a ON a.id=e.user_id
      LEFT JOIN users m ON m.id=e.manager_user_id
      ORDER BY CASE WHEN e.status='pending' THEN 0 ELSE 1 END,e.created_at DESC LIMIT 200
    `)
    const {rows:managers}=await getPool().query(`
      SELECT e.user_id,u.name FROM weave_food_distribution_employment e JOIN users u ON u.id=e.user_id
      WHERE e.position='manager' AND e.status='approved' AND u.is_active=true ORDER BY u.name
    `)
    return NextResponse.json({success:true,applications:rows,managers},{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){console.error('[food distribution admin] read failed',error);return NextResponse.json({success:false,error:'Unable to load food distribution applications.'},{status:500})}
}
export async function POST(request:NextRequest){
  const admin=await getAuthUser(request)
  if(admin?.role!=='admin')return NextResponse.json({success:false,error:'Administration access required.'},{status:403})
  const body=await request.json().catch(()=>({}))
  const applicantId=typeof body.applicantId==='string'?body.applicantId:''
  const action=body.action
  const note=typeof body.note==='string'?body.note.trim():''
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(applicantId)||!['approve','reject'].includes(action)||note.length<10||note.length>1200)
    return NextResponse.json({success:false,error:'Provide an applicant, decision and a 10–1,200 character review note.'},{status:400})
  await ensureFoodDistributionEmploymentSchema()
  const {rows}=await getPool().query(`
    UPDATE weave_food_distribution_employment SET status=$2,administration_note=$3,reviewed_by=$4::uuid,
      reviewed_at=NOW(),hired_at=CASE WHEN $2='approved' THEN NOW() ELSE NULL END,updated_at=NOW()
    WHERE user_id=$1::uuid AND status='pending'
    RETURNING user_id,position,status,manager_user_id,reviewed_at,hired_at
  `,[applicantId,action==='approve'?'approved':'rejected',note,admin.id])
  if(!rows.length)return NextResponse.json({success:false,error:'Application is no longer pending. Refresh Administration.'},{status:409})
  try{await getPool().query(`
    INSERT INTO notifications(user_id,type,title,content,from_user_name)
    VALUES($1::uuid,'food_distribution_employment',$2,$3,'WEAVE Administration')
  `,[applicantId,action==='approve'?'Food Distribution appointment approved':'Food Distribution application reviewed',
    action==='approve'?'Administration approved your Food Distribution appointment. Open your approved workspace to coordinate verified food stock, outlets and deliveries.':`Administration did not approve this application. Review note: ${note}`])}catch(error){console.error('[food distribution admin] notification failed',error)}
  return NextResponse.json({success:true,appointment:rows[0]},{headers:{'Cache-Control':'private, no-store'}})
}
