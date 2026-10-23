import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { ensureCompanyClientStaffSchema, getCompanyStaffOfferByToken, staffOfferTokenHash } from '@/lib/company-client-staff'

export const dynamic='force-dynamic'
const privateHeaders={ 'Cache-Control':'private, no-store' }

export async function GET(request:NextRequest) {
  try {
    const token=request.nextUrl.searchParams.get('offerToken') || ''
    const offer=await getCompanyStaffOfferByToken(token)
    if (!offer) return NextResponse.json({error:'Company offer not found'}, {status:404,headers:privateHeaders})
    // This is a recipient-only bearer invitation. No public list or guessing endpoint.
    return NextResponse.json({success:true,offer:{
      candidateName:offer.candidate_name,recipientEmail:offer.candidate_email,
      positionTitle:offer.position_title,monthlySalaryUSDT:Number(offer.monthly_salary_usdt),
      ticketAmountUSDT:Number(offer.ticket_amount_usdt),
      grantedTier:offer.status==='approved'?offer.folder_tier:null,
      status:offer.status, fileNumber:offer.status==='approved'?offer.file_number:null,
      rejectionReason:offer.status==='rejected'?offer.rejection_reason:null,
      registerUrl:offer.status==='approved'&&offer.file_number
        ?'/client/register?fileNumber='+encodeURIComponent(offer.file_number):null,
    }},{headers:privateHeaders})
  } catch(error) {
    console.error('[client staff ticket] read',error)
    return NextResponse.json({error:'Unable to read company offer'},{status:500})
  }
}

export async function POST(request:NextRequest) {
  try {
    const body=await request.json().catch(()=>({}))
    const token=String(body.offerToken||'')
    if(!/^[a-f0-9]{64}$/i.test(token))
      return NextResponse.json({error:'Valid private offer link required'},{status:400})
    const action=String(body.action||'')
    const email=String(body.email||'').trim().toLowerCase()
    await ensureCompanyClientStaffSchema()
    const offer=await getCompanyStaffOfferByToken(token)
    if(!offer)return NextResponse.json({error:'Offer not found'},{status:404})
    if(email!==String(offer.candidate_email).toLowerCase())
      return NextResponse.json({error:'This offer is issued to a different email address'},{status:403})

    if(action==='accept') {
      const phone=String(body.phone||'').trim()
      if(phone.length<7||phone.length>80)
        return NextResponse.json({error:'Enter your contact phone number'},{status:400})
      const [accepted]=await sql`
        UPDATE company_client_staff_offers
        SET status='accepted',candidate_phone=${phone},accepted_at=now(),updated_at=now()
        WHERE token_hash=${staffOfferTokenHash(token)} AND status='offered'
        RETURNING id,status
      `
      return accepted?NextResponse.json({success:true,status:'accepted'},{headers:privateHeaders})
        :NextResponse.json({error:'Offer is not awaiting acceptance'},{status:409})
    }

    if(action==='submit_payment') {
      const reference=String(body.paymentReference||'').trim()
      const network=String(body.paymentNetwork||'').trim()
      if(reference.length<6||reference.length>255||network.length<2||network.length>80)
        return NextResponse.json({error:'Enter the network and your actual USDT transaction reference'},{status:400})
      const [submitted]=await sql`
        UPDATE company_client_staff_offers
        SET payment_reference=${reference},payment_network=${network},
          status='pending_verification',submitted_at=now(),updated_at=now()
        WHERE token_hash=${staffOfferTokenHash(token)} AND status='accepted'
        RETURNING id,status
      `
      return submitted?NextResponse.json({success:true,status:'pending_verification'},{headers:privateHeaders})
        :NextResponse.json({error:'Accept the offer before submitting a ticket payment reference'},{status:409})
    }
    return NextResponse.json({error:'Unknown offer action'},{status:400})
  } catch(error){
    console.error('[client staff ticket] action',error)
    return NextResponse.json({error:'Could not update offer acceptance or ticket reference'},{status:500})
  }
}
