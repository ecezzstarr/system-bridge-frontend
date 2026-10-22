import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { notifyAdministrationOfCompanyApplication } from '@/lib/employment-application-notifications'
import { getLifestyleAccess } from '@/lib/weave-lifestyle'
import {
  GUIDANCE_DEPARTMENTS,GUIDANCE_NOTE_MIN,GUIDANCE_NOTE_MAX,
  ensureGuidanceDepartmentSchema,getGuidanceStaffDepartments,isGuidanceDepartment,
} from '@/lib/weave-guidance-departments'

export const dynamic='force-dynamic'

export async function GET(request:NextRequest){
  try{
    const user=await getAuthUser(request)
    if(!user||!['agent','bridger'].includes(user.role))
      return NextResponse.json({success:false,error:'Agent or Bridger account required'}, {status:403})
    const access=await getLifestyleAccess(user.id)
    await ensureGuidanceDepartmentSchema()
    const {rows}=await getPool().query(`
      SELECT id,department,source_role,application_note,status,review_note,reviewed_at,created_at
      FROM weave_guidance_staff_applications WHERE user_id=$1::uuid
      ORDER BY created_at DESC
    `,[user.id])
    const activeDepartments=await getGuidanceStaffDepartments(user)
    return NextResponse.json({
      success:true,eligible:access.active,accessStatus:access.status,role:user.role,
      departments:GUIDANCE_DEPARTMENTS,applications:rows,activeDepartments,
    },{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){
    console.error('[Mandate Lifestyle applicant] GET',error)
    return NextResponse.json({success:false,error:'Department applications unavailable'}, {status:500})
  }
}

export async function POST(request:NextRequest){
  try{
    const user=await getAuthUser(request)
    if(!user||!['agent','bridger'].includes(user.role))
      return NextResponse.json({success:false,error:'Agent or Bridger account required'}, {status:403})
    const access=await getLifestyleAccess(user.id)
    if(!access.active)
      return NextResponse.json({success:false,error:user.role==='bridger'
        ? 'Active Bridger Continuance is required to apply.'
        : 'An active Agent position is required to apply.'}, {status:403})
    const body=await request.json().catch(()=>({}))
    const department=body.department
    const note=typeof body.note==='string'?body.note.trim():''
    if(!isGuidanceDepartment(department)||note.length<GUIDANCE_NOTE_MIN||note.length>GUIDANCE_NOTE_MAX)
      return NextResponse.json({success:false,error:'Choose a department and describe your work in 25–1500 characters.'},{status:400})
    await ensureGuidanceDepartmentSchema()
    const {rows}=await getPool().query(`
      INSERT INTO weave_guidance_staff_applications
        (user_id,source_role,department,application_note,status)
      VALUES ($1::uuid,$2,$3,$4,'pending')
      ON CONFLICT (user_id,department) DO UPDATE
        SET application_note=EXCLUDED.application_note,source_role=EXCLUDED.source_role,
            status='pending',reviewer_id=NULL,review_note=NULL,reviewed_at=NULL,updated_at=NOW()
      WHERE weave_guidance_staff_applications.status IN ('rejected','revoked')
      RETURNING id,department,status,created_at
    `,[user.id,user.role,department,note])
    if(!rows.length)return NextResponse.json({
      success:false,error:'You already have a pending or approved application for this department.'
    },{status:409})
    // Only Administration may approve. Notification opens the exact application.
    try {
      await notifyAdministrationOfCompanyApplication({
        kind:'guidance_support',applicationId:String(rows[0].id),applicantId:user.id,
        positionTitle:'Company Guidance · '+department,name:String(user.name||'Agent or Bridger'),
        applicationNote:note,
      })
    } catch(notificationError) {
      console.error('[guidance application] Administration notification failed',notificationError)
    }
        return NextResponse.json({success:true,application:rows[0],message:'Application submitted for Administration review. No departmental chat permissions have been granted.'},{status:201})
  }catch(error){
    console.error('[Mandate Lifestyle applicant] POST',error)
    return NextResponse.json({success:false,error:'Unable to submit application'}, {status:500})
  }
}
