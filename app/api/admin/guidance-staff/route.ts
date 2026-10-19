import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { ensureGuidanceDepartmentSchema,isGuidanceDepartment } from '@/lib/weave-guidance-departments'

export const dynamic='force-dynamic'
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i

export async function GET(request:NextRequest){
  try{
    const admin=await getAuthUser(request)
    if(!admin||admin.role!=='admin')return NextResponse.json({success:false,error:'Administration only'},{status:403})
    await ensureGuidanceDepartmentSchema()
    const {rows}=await getPool().query(`
      SELECT a.id,a.user_id,a.source_role,a.department,a.application_note,
        a.status,a.review_note,a.created_at,a.reviewed_at,
        u.name,u.username,u.email,u.is_active
      FROM weave_guidance_staff_applications a
      JOIN users u ON u.id=a.user_id
      ORDER BY CASE WHEN a.status='pending' THEN 0 ELSE 1 END,a.updated_at DESC
      LIMIT 200
    `)
    return NextResponse.json({success:true,applications:rows},{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){
    console.error('[Guidance department review] GET',error)
    return NextResponse.json({success:false,error:'Unable to load department applications'},{status:500})
  }
}

export async function PATCH(request:NextRequest){
  try{
    const admin=await getAuthUser(request)
    if(!admin||admin.role!=='admin')return NextResponse.json({success:false,error:'Administration only'},{status:403})
    const body=await request.json().catch(()=>({}))
    const applicationId=typeof body.applicationId==='string'?body.applicationId:''
    const decision=body.decision
    const reviewNote=typeof body.reviewNote==='string'?body.reviewNote.trim():''
    if(!uuid.test(applicationId)||!['approved','rejected','revoked'].includes(decision)
      || reviewNote.length<15 || reviewNote.length>2000)
      return NextResponse.json({success:false,error:'Valid application, decision and 15–2000 character review note required.'},{status:400})
    await ensureGuidanceDepartmentSchema()
    const {rows}=await getPool().query(`
      UPDATE weave_guidance_staff_applications a
      SET status=$1,review_note=$2,reviewer_id=$3::uuid,
        reviewed_at=NOW(),updated_at=NOW()
      FROM users u
      WHERE a.id=$4::uuid AND u.id=a.user_id
        AND a.department IN ('mandate','forensic','lawyer')
        AND (
          ($1 IN ('approved','rejected') AND a.status='pending' AND u.is_active=true AND u.role=a.source_role)
          OR ($1='revoked' AND a.status='approved')
        )
      RETURNING a.id,a.user_id,a.department,a.status
    `,[decision,reviewNote,admin.id,applicationId])
    if(!rows.length)return NextResponse.json({success:false,error:'Application is ineligible or was already reviewed.'},{status:409})
    const reviewed=rows[0]
    if(!isGuidanceDepartment(reviewed.department))return NextResponse.json({success:false,error:'Invalid department state'},{status:500})
    await getPool().query(`
      INSERT INTO notifications(user_id,type,title,content,from_user_id,from_user_name,link)
      VALUES($1::uuid,'guidance_department_review',$2,$3,$4::uuid,$5,'/weave/lifestyles/mandate')
    `,[
      reviewed.user_id,
      decision==='approved'?'WEAVE Company Guidance appointment approved':
        decision==='rejected'?'WEAVE Company Guidance application declined':'WEAVE Company Guidance access revoked',
      reviewNote.slice(0,1000),admin.id,admin.name||'Administration',
    ]).catch(()=>{})
    return NextResponse.json({success:true,application:reviewed})
  }catch(error){
    console.error('[Guidance department review] PATCH',error)
    return NextResponse.json({success:false,error:'Unable to review department application'},{status:500})
  }
}
