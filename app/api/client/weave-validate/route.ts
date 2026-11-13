import { NextRequest, NextResponse } from 'next/server'
import { validateFileNumber } from '@/lib/fne'
import { sql } from '@/lib/db'
import { ensureCompanyClientStaffSchema, staffOfferTokenHash } from '@/lib/company-client-staff'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileNumber = searchParams.get('fileNumber')

    if (!fileNumber) {
      return NextResponse.json({ error: 'File number required' }, { status: 400 })
    }

    // A File Number alone cannot reveal a named company employee. The
    // private, approved offer invitation is required for staff validation.
    await ensureCompanyClientStaffSchema()
    const [offer] = await sql`
      SELECT token_hash,candidate_name,candidate_phone,status,client_id
      FROM company_client_staff_offers WHERE file_number=${fileNumber} LIMIT 1
    `
    const staffOffer=request.nextUrl.searchParams.get('staffOffer')||''
    if (offer && (
      offer.status!=='approved' || offer.client_id ||
      !/^[a-f0-9]{64}$/i.test(staffOffer) ||
      offer.token_hash!==staffOfferTokenHash(staffOffer)
    )) {
      return NextResponse.json({error:'A valid private company registration invitation is required.'},
        {status:403,headers:{'Cache-Control':'private, no-store'}})
    }
    const folder = await validateFileNumber(fileNumber)
    if (!folder && !offer) {
      return NextResponse.json({error:'Invalid or already registered File Number'},
        {status:404,headers:{'Cache-Control':'private, no-store'}})
    }
    // Reserved Pro staff numbers can predate an FNE row. The approved,
    // invitation-bound offer is the source of truth until registration claims it.
    if (offer && folder?.identity_data?.name &&
        String(folder.identity_data.name).trim().toLowerCase() !==
        String(offer.candidate_name).trim().toLowerCase()) {
      return NextResponse.json({error:'File Number identity requires Administrations reconciliation.'},
        {status:409,headers:{'Cache-Control':'private, no-store'}})
    }
    return NextResponse.json({
      success:true,
      identity_data: offer
        ? {name:offer.candidate_name,phone:offer.candidate_phone||''}
        : folder!.identity_data
    },{headers:{'Cache-Control':'private, no-store'}})
  } catch (error) {
    console.error('FNE validate error:', error)
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 })
  }
}
