import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { canReplyForGuidanceDepartment } from '@/lib/weave-guidance-departments'
import { ensureForensicGiftCardSchema } from '@/lib/forensic-gift-card-partnership'

export const dynamic = 'force-dynamic'
const validId = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

async function getUser(request: NextRequest) {
  return getAuthUser(request)
}
async function isForensic(user: any) {
  return Boolean(user && ['agent','bridger'].includes(user.role) && await canReplyForGuidanceDepartment(user, 'forensic'))
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user || !['agent','bridger'].includes(user.role)) return NextResponse.json({ success:false, error:'An active Agent or Bridger account is required.' }, { status:403 })
    await ensureForensicGiftCardSchema()
    const pool = getPool()
    if (await isForensic(user)) {
      const [partnerships, transactions] = await Promise.all([
        pool.query(`SELECT p.*,u.name AS participant_name,u.username AS participant_username
          FROM weave_forensic_gift_card_partnerships p JOIN users u ON u.id=p.participant_user_id
          ORDER BY CASE p.status WHEN 'pending' THEN 0 ELSE 1 END,p.submitted_at DESC LIMIT 300`),
        pool.query(`SELECT t.*,p.participant_user_id,p.carding_profile_reference,p.seller_name,p.seller_business_name,u.name AS participant_name
          FROM weave_forensic_gift_card_transactions t JOIN weave_forensic_gift_card_partnerships p ON p.id=t.partnership_id
          JOIN users u ON u.id=p.participant_user_id ORDER BY t.recorded_at DESC LIMIT 500`)
      ])
      return NextResponse.json({ success:true, mode:'forensic', partnerships:partnerships.rows, transactions:transactions.rows }, { headers:{'Cache-Control':'private, no-store'} })
    }
    const { rows } = await pool.query(`SELECT p.*,COUNT(t.id)::int AS transaction_count
      FROM weave_forensic_gift_card_partnerships p LEFT JOIN weave_forensic_gift_card_transactions t ON t.partnership_id=p.id
      WHERE p.participant_user_id=$1::uuid GROUP BY p.id ORDER BY p.submitted_at DESC`, [user.id])
    return NextResponse.json({ success:true, mode:'participant', partnerships:rows }, { headers:{'Cache-Control':'private, no-store'} })
  } catch (error) {
    console.error('[forensic gift card] GET', error)
    return NextResponse.json({ success:false,error:'Unable to load the Forensic gift-card workflow.' }, { status:500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await getUser(request)
  if (!user || !['agent','bridger'].includes(user.role)) return NextResponse.json({ success:false,error:'An active Agent or Bridger account is required.' }, { status:403 })
  try {
    await ensureForensicGiftCardSchema()
    const body = await request.json().catch(() => ({}))
    const pool = getPool()
    if (body.action === 'submit_partnership') {
      const sellerName = typeof body.sellerName === 'string' ? body.sellerName.trim() : ''
      const businessName = typeof body.businessName === 'string' ? body.businessName.trim() : ''
      const profile = typeof body.cardingProfileReference === 'string' ? body.cardingProfileReference.trim() : ''
      const authorization = typeof body.authorizationNote === 'string' ? body.authorizationNote.trim() : ''
      if (sellerName.length < 2 || sellerName.length > 180 || businessName.length > 180 ||
          profile.length < 3 || profile.length > 180 || authorization.length < 20 || authorization.length > 1000)
        return NextResponse.json({success:false,error:'Enter the seller name, carding profile reference, and a 20–1000 character authorization confirming permission for Weave to be the first gift-card seller through this profile.'},{status:400})
      const { rows } = await pool.query(`INSERT INTO weave_forensic_gift_card_partnerships
        (participant_user_id,seller_name,seller_business_name,carding_profile_reference,authorization_note)
        VALUES($1::uuid,$2,$3,$4,$5) RETURNING *`,
        [user.id,sellerName,businessName || null,profile,authorization])
      return NextResponse.json({success:true,partnership:rows[0],message:'Partnership submitted to Forensics for review. It is not active until approved.'},{status:201})
    }
    if (body.action === 'record_transaction') {
      if (!(await isForensic(user))) return NextResponse.json({success:false,error:'Approved active Forensics departmental appointment required.'},{status:403})
      const partnershipId = body.partnershipId
      const reference = typeof body.transactionReference === 'string' ? body.transactionReference.trim() : ''
      const description = typeof body.giftCardDescription === 'string' ? body.giftCardDescription.trim() : ''
      const gross = Number(body.grossAmountNgn)
      const evidence = typeof body.evidenceNote === 'string' ? body.evidenceNote.trim() : ''
      if (!validId(partnershipId) || reference.length < 6 || reference.length > 180 ||
          description.length < 3 || description.length > 240 || !Number.isSafeInteger(gross) || gross <= 0 ||
          evidence.length < 12 || evidence.length > 1000)
        return NextResponse.json({success:false,error:'Enter an approved partnership, unique transaction reference, gift description, positive whole-naira amount and a 12–1000 character evidence note.'},{status:400})
      const { rows } = await pool.query(`INSERT INTO weave_forensic_gift_card_transactions
        (partnership_id,transaction_reference,gift_card_description,gross_amount_ngn,evidence_note,recorded_by)
        SELECT p.id,$2,$3,$4,$5,$6::uuid FROM weave_forensic_gift_card_partnerships p
        WHERE p.id=$1::uuid AND p.status='active'
        RETURNING *`,[partnershipId,reference,description,gross,evidence,user.id])
      if (!rows[0]) return NextResponse.json({success:false,error:'Only an approved active partnership can have transactions recorded.'},{status:409})
      return NextResponse.json({success:true,transaction:rows[0],message:'Transaction recorded with the fixed ₦3,000 carding allocation: ₦1,500 participant share and ₦1,500 Weave share. Additional transactions may be recorded independently.'},{status:201})
    }
    return NextResponse.json({success:false,error:'Unknown Forensic gift-card action.'},{status:400})
  } catch (error:any) {
    if (error?.code === '23505') return NextResponse.json({success:false,error:'This profile or transaction reference has already been recorded.'},{status:409})
    console.error('[forensic gift card] POST', error)
    return NextResponse.json({success:false,error:'Unable to record this Forensic gift-card action.'},{status:500})
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getUser(request)
  if (!(await isForensic(user))) return NextResponse.json({success:false,error:'Approved active Forensics departmental appointment required.'},{status:403})
  try {
    await ensureForensicGiftCardSchema()
    const body = await request.json().catch(() => ({}))
    const pool = getPool()
    if (body.action === 'review_partnership' && validId(body.partnershipId) && ['active','paused','closed'].includes(body.status)) {
      const { rows } = await pool.query(`UPDATE weave_forensic_gift_card_partnerships
        SET status=$2,reviewed_at=NOW(),reviewed_by=$3::uuid
        WHERE id=$1::uuid AND status IN ('pending','active','paused') RETURNING *`,
        [body.partnershipId,body.status,user.id])
      if (!rows[0]) return NextResponse.json({success:false,error:'Partnership not found or cannot be reviewed.'},{status:409})
      return NextResponse.json({success:true,partnership:rows[0]})
    }
    if (body.action === 'verify_transaction' && validId(body.transactionId)) {
      const { rows } = await pool.query(`UPDATE weave_forensic_gift_card_transactions
        SET status='verified',verified_by=$2::uuid,verified_at=NOW()
        WHERE id=$1::uuid AND status='recorded' RETURNING *`,[body.transactionId,user.id])
      if (!rows[0]) return NextResponse.json({success:false,error:'Transaction not found or not in a verifiable state.'},{status:409})
      return NextResponse.json({success:true,transaction:rows[0]})
    }
    return NextResponse.json({success:false,error:'Unknown review action or invalid identifier.'},{status:400})
  } catch (error) {
    console.error('[forensic gift card] PATCH', error)
    return NextResponse.json({success:false,error:'Unable to update the Forensic gift-card record.'},{status:500})
  }
}
