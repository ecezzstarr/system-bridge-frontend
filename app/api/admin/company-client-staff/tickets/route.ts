import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { createCompanyStaffOffer, decideCompanyStaffTicket, ensureCompanyStaffTicketSchema } from '@/lib/company-client-staff-tickets'
import { notifyUser } from '@/lib/deposit-notifications'

export const dynamic='force-dynamic'

async function requireAdmin(request: NextRequest) {
  const user = await getAuthUser(request)
  return user?.role === 'admin' ? user : null
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({error:'Administration access required'}, {status:403})
  try {
    await ensureCompanyStaffTicketSchema()
    const offerId = new URL(request.url).searchParams.get('offerId')
    if (offerId) {
      if (!/^[0-9a-f-]{36}$/i.test(offerId)) return NextResponse.json({error:'Invalid offer'}, {status:400})
      const messages = await getPool().query(
        'SELECT id,offer_id,sender_id,sender_role,message,created_at FROM company_client_staff_messages WHERE offer_id=$1::uuid ORDER BY created_at ASC LIMIT 150',
        [offerId]
      )
      return NextResponse.json({success:true,messages:messages.rows})
    }
    const result = await getPool().query(
      'SELECT id,access_code,recipient_name,recipient_email,recipient_phone,position_title,region,salary_usdt,ticket_amount_usdt,file_folder_tier,status,payment_reference,client_id,file_number,created_at,verified_at FROM company_client_staff_offers ORDER BY created_at DESC LIMIT 150'
    )
    return NextResponse.json({success:true,offers:result.rows}, {headers:{'Cache-Control':'private, no-store'}})
  } catch(error) {
    console.error('[company staff Admin GET]',error)
    return NextResponse.json({error:'Unable to read company staff offers'},{status:500})
  }
}

export async function POST(request: NextRequest) {
  const admin=await requireAdmin(request)
  if (!admin) return NextResponse.json({error:'Administration access required'},{status:403})
  try {
    const body=await request.json()
    if (body.action === 'reply') {
      await ensureCompanyStaffTicketSchema()
      const offerId=String(body.offerId || '')
      const message=String(body.message || '').trim()
      if (!/^[0-9a-f-]{36}$/i.test(offerId) || message.length < 2 || message.length > 3000) {
        return NextResponse.json({error:'Valid offer and reply required'},{status:400})
      }
      const offered=await getPool().query("SELECT id,client_id FROM company_client_staff_offers WHERE id=$1::uuid AND status='active'",[offerId])
      if (!offered.rows[0]?.client_id) return NextResponse.json({error:'Employee Client account is not active yet'}, {status:409})
      await getPool().query(
        "INSERT INTO company_client_staff_messages(offer_id,sender_id,sender_role,message) VALUES($1::uuid,$2::uuid,'admin',$3)",
        [offerId,admin.id,message]
      )
      await notifyUser(String(offered.rows[0].client_id),{
        type:'company_staff_message',title:'Message from Weave Administration',
        content:message.slice(0,500),link:'/client/company-workspace',
        fromUserId:admin.id,fromUserName:'WEAVE Administration'
      })
      return NextResponse.json({success:true})
    }
    const name=String(body.name||'').trim()
    const email=String(body.email||'').trim().toLowerCase()
    const phone=String(body.phone||'').trim()
    const positionTitle=String(body.positionTitle||'').trim()
    const region=String(body.region||'').trim()
    const salaryUsdt=Number(body.salaryUsdt)
    const ticketAmountUsdt=Number(body.ticketAmountUsdt)
    if (!name || name.length>255 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
        phone.length < 5 || phone.length > 80 || !positionTitle || positionTitle.length>160 ||
        region.length>160 || !Number.isFinite(salaryUsdt) || salaryUsdt<0) {
      return NextResponse.json({error:'Complete the employee identity, contact, position and valid salary terms'},{status:400})
    }
    const offer=await createCompanyStaffOffer({
      adminId:admin.id,name,email,phone,positionTitle,region,salaryUsdt,ticketAmountUsdt
    })
    return NextResponse.json({
      success:true,offer,
      ticketUrl:'/file-folder/company-ticket?code='+encodeURIComponent(offer.access_code),
      note:'Share this private offer link only with the named candidate. Entry Ticket payments do not purchase File Folders.'
    },{status:201})
  } catch(error:any) {
    console.error('[company staff Admin POST]',error)
    return NextResponse.json({error:error?.message || 'Unable to issue company staff offer'},{status:500})
  }
}

export async function PATCH(request: NextRequest) {
  const admin=await requireAdmin(request)
  if (!admin) return NextResponse.json({error:'Administration access required'},{status:403})
  try {
    const body=await request.json()
    const offerId=String(body.offerId||'')
    if (!/^[0-9a-f-]{36}$/i.test(offerId) || !['verify','reject'].includes(body.action)) {
      return NextResponse.json({error:'Valid offer and verification decision required'},{status:400})
    }
    const result=await decideCompanyStaffTicket(offerId,admin.id,body.action==='verify')
    return NextResponse.json({success:true,...result})
  } catch(error:any) {
    console.error('[company staff Admin PATCH]',error)
    return NextResponse.json({error:error?.message || 'Unable to verify ticket'},{status:409})
  }
}
