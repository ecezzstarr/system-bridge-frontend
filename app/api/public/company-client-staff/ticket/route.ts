import { NextRequest, NextResponse } from 'next/server'
import { acceptCompanyStaffOffer, readCompanyStaffOffer, submitCompanyStaffTicket } from '@/lib/company-client-staff-tickets'
import { notifyAdministrators } from '@/lib/deposit-notifications'

export const dynamic = 'force-dynamic'

/** A secret offer link is issued by Administration, never by the visitor. */
export async function GET(request: NextRequest) {
  try {
    const code = new URL(request.url).searchParams.get('code') || ''
    if (code.length < 32 || code.length > 100) return NextResponse.json({error:'Valid company offer required'}, {status:400})
    const offer = await readCompanyStaffOffer(code)
    if (!offer) return NextResponse.json({error:'Company offer not found'}, {status:404})
    return NextResponse.json({success:true,offer}, {headers:{'Cache-Control':'private, no-store'}})
  } catch(error) {
    console.error('[company staff ticket GET]',error)
    return NextResponse.json({error:'Unable to read company offer'},{status:500})
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const code = String(body.code || '').trim()
    const action = String(body.action || '')
    if (code.length < 32 || code.length > 100) return NextResponse.json({error:'Valid company offer required'},{status:400})
    const offer = await readCompanyStaffOffer(code)
    if (!offer) return NextResponse.json({error:'Company offer not found'},{status:404})
    if (action === 'accept') {
      const accepted = await acceptCompanyStaffOffer(code)
      if (!accepted) return NextResponse.json({error:'This offer cannot currently be accepted'},{status:409})
      await notifyAdministrators({
        type:'company_staff_offer_accepted',
        title:'Company Client staff offer accepted',
        content:String(offer.recipient_name)+' accepted the '+String(offer.position_title)+' offer. Their separate USDT Entry Ticket is next.',
        link:'/admin/company-client-staff',
        fromUserName:'WEAVE Company Entry'
      })
      return NextResponse.json({success:true,status:'accepted'})
    }
    if (action === 'submit_ticket') {
      const reference = String(body.paymentReference || '').trim()
      if (reference.length < 12 || reference.length > 255 || !/^[a-zA-Z0-9:_-]+$/.test(reference)) {
        return NextResponse.json({error:'Enter a valid USDT payment reference provided by your wallet'},{status:400})
      }
      const submitted = await submitCompanyStaffTicket(code,reference)
      if (!submitted) return NextResponse.json({error:'This Entry Ticket is not accepting a payment reference'},{status:409})
      await notifyAdministrators({
        type:'company_staff_ticket_submitted',
        title:'Company Client staff Entry Ticket awaiting verification',
        content:String(offer.recipient_name)+' submitted a '+Number(offer.ticket_amount_usdt)+' USDT staff Entry Ticket reference. Verify payment independently before issuing their company-provided '+String(offer.file_folder_tier)+' File Folder.',
        link:'/admin/company-client-staff',
        fromUserName:'WEAVE Company Entry'
      })
      return NextResponse.json({success:true,status:'verification_pending'})
    }
    return NextResponse.json({error:'Unknown company ticket action'},{status:400})
  } catch(error:any) {
    console.error('[company staff ticket POST]',error)
    if (error?.code === '23505') return NextResponse.json({error:'Payment reference already submitted'},{status:409})
    return NextResponse.json({error:'Unable to process company Entry Ticket'},{status:500})
  }
}
