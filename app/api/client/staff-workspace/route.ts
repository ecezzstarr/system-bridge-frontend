import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { ensureCompanyClientStaffSchema } from '@/lib/company-client-staff'
export const dynamic='force-dynamic'

async function access(request:NextRequest) {
  const user=await getAuthUser(request)
  if(!user||user.role!=='client')return null
  await ensureCompanyClientStaffSchema()
  const [offer]=await sql`
    SELECT id,position_title,monthly_salary_usdt,ticket_amount_usdt,folder_tier,
      file_number,receipt_number,status,verified_at
    FROM company_client_staff_offers
    WHERE client_id=${user.id}::uuid AND status='approved'
    LIMIT 1
  `
  return offer ? {user,offer}:null
}

export async function GET(request:NextRequest) {
  try {
    const grant=await access(request)
    if(!grant)return NextResponse.json({success:true,employed:false},{headers:{'Cache-Control':'private, no-store'}})
    const activity=await sql`
      SELECT id,prospect_name,organization,stage,next_action,created_at,updated_at
      FROM company_client_staff_work
      WHERE client_id=${grant.user.id}::uuid AND offer_id=${grant.offer.id}::uuid
      ORDER BY created_at DESC LIMIT 100
    `
    return NextResponse.json({success:true,employed:true,position:grant.offer,activity},{
      headers:{'Cache-Control':'private, no-store'},
    })
  } catch(error) {
    console.error('[client staff workspace] read',error)
    return NextResponse.json({error:'Unable to open private position workspace'},{status:500})
  }
}

export async function POST(request:NextRequest) {
  try {
    const grant=await access(request)
    if(!grant)return NextResponse.json({error:'Approved Client staff position required'},{status:403})
    const body=await request.json().catch(()=>({}))
    const name=String(body.prospectName||'').trim()
    const organization=String(body.organization||'').trim()
    const nextAction=String(body.nextAction||'').trim()
    const stage=String(body.stage||'introduced')
    if(!name||name.length>160||organization.length>200||nextAction.length>1200||
      !['introduced','conversation','follow_up','proposal','completed'].includes(stage)){
      return NextResponse.json({error:'Enter a valid business contact, organization, stage and next action'},{status:400})
    }
    const [item]=await sql`
      INSERT INTO company_client_staff_work (offer_id,client_id,prospect_name,organization,stage,next_action)
      VALUES (${grant.offer.id}::uuid,${grant.user.id}::uuid,${name},${organization||null},${stage},${nextAction||null})
      RETURNING id,prospect_name,organization,stage,next_action,created_at
    `
    return NextResponse.json({success:true,item},{status:201})
  } catch(error){
    console.error('[client staff workspace] add',error)
    return NextResponse.json({error:'Unable to record this work movement'},{status:500})
  }
}

export async function PATCH(request:NextRequest) {
  try {
    const grant=await access(request)
    if(!grant)return NextResponse.json({error:'Approved Client staff position required'},{status:403})
    const body=await request.json().catch(()=>({}))
    const id=String(body.id||'')
    const stage=String(body.stage||'')
    const nextAction=String(body.nextAction||'').trim()
    if(!/^[0-9a-f-]{36}$/i.test(id)||!['introduced','conversation','follow_up','proposal','completed'].includes(stage)||nextAction.length>1200)
      return NextResponse.json({error:'Invalid work item, stage, or next action'},{status:400})
    const [item]=await sql`
      UPDATE company_client_staff_work SET stage=${stage},next_action=${nextAction||null},updated_at=now()
      WHERE id=${id}::uuid AND offer_id=${grant.offer.id}::uuid AND client_id=${grant.user.id}::uuid
      RETURNING id,stage,next_action,updated_at
    `
    return item?NextResponse.json({success:true,item})
      :NextResponse.json({error:'Work item not found'},{status:404})
  }catch(error){
    console.error('[client staff workspace] update',error)
    return NextResponse.json({error:'Unable to update work item'},{status:500})
  }
}
