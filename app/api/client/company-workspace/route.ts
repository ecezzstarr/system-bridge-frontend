import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { ensureCompanyStaffTicketSchema } from '@/lib/company-client-staff-tickets'
import { notifyAdministrators } from '@/lib/deposit-notifications'

export const dynamic='force-dynamic'

async function workspaceEmployee(request: NextRequest) {
  const user=await getAuthUser(request)
  if (!user || user.role!=='client') return null
  await ensureCompanyStaffTicketSchema()
  const res=await getPool().query(
    "SELECT o.id,o.recipient_name,o.position_title,o.region,o.salary_usdt,o.ticket_amount_usdt,o.file_folder_tier,o.file_number,o.status,o.verified_at FROM company_client_staff_offers o JOIN users u ON u.id=$1::uuid WHERE o.status='active' AND (o.client_id=u.id OR (o.client_id IS NULL AND o.file_number=u.file_number AND lower(o.recipient_email)=lower(u.email))) ORDER BY o.verified_at DESC LIMIT 1",
    [user.id]
  )
  if(!res.rows[0])return null
  await getPool().query(
    "UPDATE company_client_staff_offers SET client_id=$2::uuid WHERE id=$1::uuid AND client_id IS NULL",
    [res.rows[0].id,user.id]
  )
  return {user,offer:res.rows[0]}
}

export async function GET(request:NextRequest) {
  try {
    const employee=await workspaceEmployee(request)
    if(!employee)return NextResponse.json({error:'Active company employee Client offer required'},{status:403})
    const msgs=await getPool().query(
      'SELECT id,sender_role,message,created_at FROM company_client_staff_messages WHERE offer_id=$1::uuid ORDER BY created_at ASC LIMIT 150',
      [employee.offer.id]
    )
    return NextResponse.json({success:true,offer:employee.offer,messages:msgs.rows},{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){console.error('[client company workspace GET]',error);return NextResponse.json({error:'Workspace unavailable'},{status:500})}
}

export async function POST(request:NextRequest) {
  try {
    const employee=await workspaceEmployee(request)
    if(!employee)return NextResponse.json({error:'Active company employee Client offer required'},{status:403})
    const body=await request.json()
    const message=String(body.message||'').trim()
    if(message.length<2||message.length>3000)return NextResponse.json({error:'Enter a message of 2–3000 characters'},{status:400})
    await getPool().query(
      "INSERT INTO company_client_staff_messages(offer_id,sender_id,sender_role,message) VALUES ($1::uuid,$2::uuid,'client',$3)",
      [employee.offer.id,employee.user.id,message]
    )
    await notifyAdministrators({
      type:'company_staff_message',title:'Company employee message: '+employee.offer.position_title,
      content:employee.offer.recipient_name+': '+message.slice(0,500),
      link:'/admin/company-client-staff?offer='+encodeURIComponent(String(employee.offer.id)),
      fromUserId:employee.user.id,fromUserName:employee.user.name
    })
    return NextResponse.json({success:true})
  }catch(error){console.error('[client company workspace POST]',error);return NextResponse.json({error:'Unable to send company message'},{status:500})}
}
