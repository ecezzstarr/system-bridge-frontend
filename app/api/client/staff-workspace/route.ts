import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { ensureCompanyClientStaffSchema } from '@/lib/company-client-staff'
import {getCjSiblingsEvent} from '@/lib/client-siblings-event'
import {isProRegionalManagerPosition,proRegionalManagerDepartment} from '@/lib/pro-regional-manager-policy'
export const dynamic='force-dynamic'

async function access(request:NextRequest) {
  const user=await getAuthUser(request)
  if(!user||user.role!=='client')return null
  await ensureCompanyClientStaffSchema()
  const [offer]=await sql`
    SELECT id,position_title,monthly_salary_usdt,ticket_amount_usdt,applicant_contribution_usdt,
      proposed_personal_loan_usdt,personal_loan_terms,folder_tier,
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
    // This is a Client/Dream Lovely employment scope. Do not attach the
    // Agent/Stability or Bridger/Hope Regional Manager hierarchy to it.
    const clientRegionalEligible=grant.user.role==='client'&&
      String(grant.offer.folder_tier)==='pro'&&
      isProRegionalManagerPosition(grant.offer.position_title,grant.offer.file_number)
    let clientRegional:null|{positionType:'pro_regional_manager';department:'Dream Lovely';scope:'client_business_expansion';
      country:string|null;region:string|null;city:string|null;locationStatus:string}=null
    if(clientRegionalEligible){
      let country:string|null=String(grant.offer.file_number)==='WEAVE-2026-0907-0001'?'Spain':null
      let region:string|null=null,city:string|null=null,locationStatus='awaiting_location_verification'
      const [locationsTable]=await sql`SELECT to_regclass('public.pro_file_number_verifications') AS name`
      if(locationsTable?.name){
        const [location]=await sql`SELECT operating_country,operating_region,operating_city
           FROM pro_file_number_verifications
           WHERE file_number=${grant.offer.file_number}
             AND identity_verified_at IS NOT NULL
             AND status IN ('payment_required','pending_forensics','paid_pending_account','active')
           ORDER BY identity_verified_at DESC LIMIT 1`
        if(location){
          country=String(location.operating_country||country||'')||null
          region=String(location.operating_region||'')||null
          city=String(location.operating_city||'')||null
          locationStatus='identity_verified_territory_pending_company_confirmation'
        }
      }
      clientRegional={positionType:'pro_regional_manager',
        department:proRegionalManagerDepartment('client')!.department,
        scope:'client_business_expansion',
        country,region,city,locationStatus}
    }
    const siblingsEvent=await getCjSiblingsEvent(String(grant.user.id),String(grant.offer.file_number||''))
    return NextResponse.json({success:true,employed:true,position:grant.offer,activity,siblingsEvent,clientRegional},{
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
