import { randomBytes, randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool, sql } from '@/lib/db'
import { createRandomFileNumberCandidate, ensureFneTables } from '@/lib/fne'
import { ensureCompanyClientStaffSchema, staffOfferTokenHash, tierFromStaffTicketUSDT } from '@/lib/company-client-staff'

export const dynamic = 'force-dynamic'

async function requireAdmin(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || user.role !== 'admin') return null
  return user
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Administration access required' }, { status: 403 })
  try {
    await ensureCompanyClientStaffSchema()
    const offers = await sql`
      SELECT id,candidate_name,candidate_email,candidate_phone,position_title,monthly_salary_usdt,
        ticket_amount_usdt,folder_tier,status,payment_reference,payment_network,file_number,
        client_id,receipt_number,rejection_reason,created_at,accepted_at,submitted_at,verified_at
      FROM company_client_staff_offers ORDER BY created_at DESC LIMIT 200
    `
    return NextResponse.json({ success: true, offers }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[company client staff] list', error)
    return NextResponse.json({ error: 'Unable to load company offers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Administration access required' }, { status: 403 })
  try {
    const body = await request.json()
    const candidateName = String(body.candidateName || '').trim()
    const candidateEmail = String(body.candidateEmail || '').trim().toLowerCase()
    const positionTitle = String(body.positionTitle || '').trim()
    const salaryUSDT = Number(body.monthlySalaryUSDT)
    const ticketUSDT = Number(body.ticketAmountUSDT)
    const tier = tierFromStaffTicketUSDT(ticketUSDT)
    if (!candidateName || candidateName.length > 255 ||
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(candidateEmail) || candidateEmail.length > 255 ||
      !positionTitle || positionTitle.length > 160 || !tier ||
      !Number.isFinite(salaryUSDT) || salaryUSDT < 0 || salaryUSDT > 100000 ||
      Math.round(salaryUSDT * 100) !== salaryUSDT * 100 || ticketUSDT > 1000000) {
      return NextResponse.json({ error: 'Enter a valid name, recipient email, position, monthly USDT salary and USDT ticket amount' }, { status: 400 })
    }
    await ensureCompanyClientStaffSchema()
    const offerToken = randomBytes(32).toString('hex')
    const [offer] = await sql`
      INSERT INTO company_client_staff_offers
        (token_hash,candidate_name,candidate_email,position_title,monthly_salary_usdt,
         ticket_amount_usdt,folder_tier,created_by)
      VALUES
        (${staffOfferTokenHash(offerToken)},${candidateName},${candidateEmail},${positionTitle},
         ${salaryUSDT},${ticketUSDT},${tier},${admin.id}::uuid)
      RETURNING id,candidate_name,candidate_email,position_title,monthly_salary_usdt,
        ticket_amount_usdt,folder_tier,status
    `
    return NextResponse.json({
      success: true, offer,
      invitationPath: '/file-folder?staffOffer=' + encodeURIComponent(offerToken),
      message: 'Private invitation created. Share the invitation only with its named recipient.',
    }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[company client staff] create', error)
    return NextResponse.json({ error: 'Unable to create employee offer' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Administration access required' }, { status: 403 })
  const body = await request.json().catch(() => ({}))
  const offerId = String(body.offerId || '')
  const action = String(body.action || '')
  if (!/^[0-9a-f-]{36}$/i.test(offerId) || !['approve','reject'].includes(action)) {
    return NextResponse.json({ error: 'Valid offer and approve or reject action required' }, { status: 400 })
  }

  try {
    await ensureCompanyClientStaffSchema()
    if (action === 'reject') {
      const reason = String(body.reason || 'Payment could not be verified').trim().slice(0, 500)
      const [offer] = await sql`
        UPDATE company_client_staff_offers
        SET status='rejected', rejection_reason=${reason},verified_by=${admin.id}::uuid,updated_at=now()
        WHERE id=${offerId}::uuid AND status='pending_verification'
        RETURNING id,status
      `
      return offer ? NextResponse.json({ success: true, offer })
        : NextResponse.json({ error: 'Only a pending ticket can be rejected' }, { status: 409 })
    }

    // Payment is NOT checked automatically. Administration must independently verify
    // the chain/reference, currency and amount before invoking this action.
    if (body.paymentChecked !== true) {
      return NextResponse.json({ error: 'Confirm independent USDT payment verification first' }, { status: 400 })
    }

    await ensureFneTables()
    const connection = await getPool().connect()
    try {
      await connection.query('BEGIN')
      const locked = await connection.query(
        'SELECT * FROM company_client_staff_offers WHERE id=$1::uuid FOR UPDATE', [offerId])
      const offer = locked.rows[0]
      if (!offer || offer.status !== 'pending_verification' || !offer.payment_reference) {
        await connection.query('ROLLBACK')
        return NextResponse.json({ error: 'A submitted, unverified employment ticket is required' }, { status: 409 })
      }
      const tier = tierFromStaffTicketUSDT(offer.ticket_amount_usdt)
      if (!tier || tier !== offer.folder_tier) throw new Error('Ticket tier does not match offer')
      let fileNumber = ''
      for (let attempt=0; attempt<12; attempt++) {
        const candidate = createRandomFileNumberCandidate()
        await connection.query('SAVEPOINT file_number_attempt')
        try {
          await connection.query(
            `INSERT INTO file_folders(file_number,bridger_id,identity_data,status)
             VALUES ($1,NULL,$2::jsonb,'pending')`,
            [candidate, JSON.stringify({
              name:offer.candidate_name, phone:offer.candidate_phone || '',
              origin:'company_granted_employee', offerId:offer.id,
            })])
          await connection.query('RELEASE SAVEPOINT file_number_attempt')
          fileNumber=candidate
          break
        } catch (error:any) {
          await connection.query('ROLLBACK TO SAVEPOINT file_number_attempt')
          if (error?.code !== '23505') throw error
        }
      }
      if (!fileNumber) throw new Error('Unable to issue a unique File Number')
      const receiptNumber='WEAVE-STAFF-'+randomUUID().slice(0,8).toUpperCase()
      const result = await connection.query(
        `UPDATE company_client_staff_offers SET
         status='approved',file_number=$1,verified_by=$2::uuid,receipt_number=$4,
         verified_at=now(),updated_at=now(),rejection_reason=NULL
         WHERE id=$3::uuid AND status='pending_verification'
         RETURNING id,status,file_number,folder_tier,ticket_amount_usdt,position_title,receipt_number`,
        [fileNumber,admin.id,offerId,receiptNumber])
      await connection.query('COMMIT')
      return NextResponse.json({ success:true,offer:result.rows[0],
        verification:'manual_USDT_reference',receiptReference:receiptNumber }, {
        headers:{'Cache-Control':'private, no-store'},
      })
    } catch (error) {
      await connection.query('ROLLBACK').catch(()=>{})
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('[company client staff] verification',error)
    return NextResponse.json({ error:'Employee ticket could not be verified or its File Number issued' },{status:500})
  }
}
