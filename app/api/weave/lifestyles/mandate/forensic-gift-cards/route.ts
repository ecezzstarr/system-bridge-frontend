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
async function isRegionalManager(user: any) {
  if (!user?.id) return false
  const { rows } = await getPool().query(`SELECT 1 FROM weave_regional_manager_appointments WHERE user_id=$1::uuid AND status='active' LIMIT 1`, [user.id])
  return Boolean(rows[0])
}
async function isForensic(user: any) {
  return Boolean(user && ['agent','bridger'].includes(user.role) && await canReplyForGuidanceDepartment(user, 'forensic'))
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ success:false, error:'Sign in is required.' }, { status:403 })
    await ensureForensicGiftCardSchema()
    const pool = getPool()
    if (await isRegionalManager(user)) {
      const [partnerships, transactions] = await Promise.all([
        pool.query(`SELECT p.*,u.name AS participant_name,trust.status AS trust_status,manager.name AS regional_manager_name FROM weave_forensic_gift_card_partnerships p JOIN users u ON u.id=p.participant_user_id LEFT JOIN weave_forensic_gift_card_trust trust ON trust.partnership_id=p.id LEFT JOIN users manager ON manager.id=trust.regional_manager_user_id WHERE EXISTS (SELECT 1 FROM weave_regional_manager_bridgers member WHERE member.bridger_user_id=p.participant_user_id AND member.regional_manager_user_id=$1::uuid AND member.status='active') ORDER BY p.submitted_at DESC LIMIT 300`,[user.id]),
        pool.query(`SELECT t.*,p.participant_user_id,p.carding_profile_reference,p.seller_name,u.name AS participant_name FROM weave_forensic_gift_card_transactions t JOIN weave_forensic_gift_card_partnerships p ON p.id=t.partnership_id JOIN users u ON u.id=p.participant_user_id ORDER BY t.recorded_at DESC LIMIT 500`)
      ])
      return NextResponse.json({success:true,mode:'regional_manager',partnerships:partnerships.rows,transactions:transactions.rows},{headers:{'Cache-Control':'private, no-store'}})
    }
    if (!['agent','bridger'].includes(user.role)) return NextResponse.json({ success:false, error:'An active Agent or Bridger account is required.' }, { status:403 })
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
    const { rows } = await pool.query(`SELECT p.*,COUNT(t.id)::int AS transaction_count,trust.status AS trust_status,manager.name AS regional_manager_name
      FROM weave_forensic_gift_card_partnerships p LEFT JOIN weave_forensic_gift_card_transactions t ON t.partnership_id=p.id
      LEFT JOIN weave_forensic_gift_card_trust trust ON trust.partnership_id=p.id LEFT JOIN users manager ON manager.id=trust.regional_manager_user_id
      WHERE p.participant_user_id=$1::uuid GROUP BY p.id,trust.status,manager.name ORDER BY p.submitted_at DESC`, [user.id])
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
    if (body.action === 'request_company_escrow' && validId(body.partnershipId)) {
      const { rows } = await pool.query(`INSERT INTO weave_forensic_gift_card_trust (partnership_id,participant_user_id,regional_manager_user_id,status,activated_at,revoked_at)
        SELECT p.id,p.participant_user_id,member.regional_manager_user_id,'pending',NOW(),NULL
        FROM weave_forensic_gift_card_partnerships p
        JOIN weave_regional_manager_bridgers member ON member.bridger_user_id=p.participant_user_id AND member.status='active'
        JOIN weave_regional_manager_appointments rm ON rm.user_id=member.regional_manager_user_id AND rm.status='active'
        WHERE p.id=$1::uuid AND p.participant_user_id=$2::uuid AND p.status='active'
        ON CONFLICT (partnership_id) DO UPDATE SET status='pending',regional_manager_user_id=EXCLUDED.regional_manager_user_id,activated_at=NOW(),revoked_at=NULL
        WHERE weave_forensic_gift_card_trust.status<>'active'
        RETURNING *`,[body.partnershipId,user.id])
      if (!rows[0]) return NextResponse.json({success:false,error:'No active Regional Manager assignment was found, or Company Escrow Trust is already active.'},{status:409})
      try { await pool.query(`INSERT INTO notifications(user_id,type,title,content,from_user_id,from_user_name,link) VALUES($1::uuid,'company_guidance','Company Escrow Trust requested',$2,$3::uuid,$4,'/weave/lifestyles/mandate/forensic-gift-cards')`,[rows[0].regional_manager_user_id,`A participant has requested Company Escrow Trust before a gift-card sale. Review the assigned profile and activate Trust if approved.`,user.id,user.name||user.username||'WEAVE participant']) } catch (notificationError) { console.error('[forensic gift card] Trust notification failed',notificationError); return NextResponse.json({success:false,error:'The Trust request was saved, but Regional Manager notification failed. Retry or contact the manager directly; Forensics must not proceed until Trust is active.'},{status:503}) }
      return NextResponse.json({success:true,trust:rows[0],message:'Your Regional Manager has been notified. Forensics must wait until Company Escrow Trust is active.'},{status:201})
    }
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
          description.length < 3 || description.length > 240 || !Number.isSafeInteger(gross) || gross <= 1500 ||
          evidence.length < 12 || evidence.length > 1000)
        return NextResponse.json({success:false,error:'Enter an approved partnership, unique transaction reference, gift description, whole-naira amount greater than ₦1,500 and a 12–1000 character evidence note.'},{status:400})
      const { rows } = await pool.query(`INSERT INTO weave_forensic_gift_card_transactions
        (partnership_id,transaction_reference,gift_card_description,gross_amount_ngn,evidence_note,recorded_by,responsible_regional_manager_user_id)
        SELECT p.id,$2,$3,$4,$5,$6::uuid,trust.regional_manager_user_id
        FROM weave_forensic_gift_card_partnerships p
        JOIN weave_forensic_gift_card_trust trust
          ON trust.partnership_id=p.id AND trust.participant_user_id=p.participant_user_id AND trust.status='active'
        JOIN weave_regional_manager_appointments rm
          ON rm.user_id=trust.regional_manager_user_id AND rm.status='active'
        JOIN weave_regional_manager_bridgers member
          ON member.bridger_user_id=p.participant_user_id
          AND member.regional_manager_user_id=trust.regional_manager_user_id AND member.status='active'
        WHERE p.id=$1::uuid AND p.status='active'
        RETURNING *`,[partnershipId,reference,description,gross,evidence,user.id])
      if (!rows[0]) return NextResponse.json({success:false,error:'Only an approved active partnership with active Regional Manager Company Escrow Trust can have transactions recorded.'},{status:409})
      return NextResponse.json({success:true,transaction:rows[0],message:'Gift-card transaction recorded. The ₦3,000 carding split belongs to the partnership setup and is not charged again for each repeat transaction.'},{status:201})
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
  if (!user) return NextResponse.json({success:false,error:'Sign in is required.'},{status:403})
  try {
    await ensureForensicGiftCardSchema()
    const body = await request.json().catch(() => ({}))
    const pool = getPool()
    if (body.action === 'activate_company_escrow' && validId(body.partnershipId)) {
      if (!(await isRegionalManager(user))) return NextResponse.json({success:false,error:'An active appointed Regional Manager must activate The participant must request Trust and notify the assigned Regional Manager before activation.'},{status:403})
      const { rows } = await pool.query(`INSERT INTO weave_forensic_gift_card_trust
        (partnership_id,participant_user_id,regional_manager_user_id,status,activated_at,revoked_at)
        SELECT p.id,p.participant_user_id,$2::uuid,'active',NOW(),NULL
        FROM weave_forensic_gift_card_partnerships p
        WHERE p.id=$1::uuid AND p.status='active'
          AND EXISTS (SELECT 1 FROM weave_forensic_gift_card_trust pending WHERE pending.partnership_id=p.id AND pending.status='pending' AND pending.regional_manager_user_id=$2::uuid)
          AND EXISTS (SELECT 1 FROM weave_regional_manager_bridgers member
            WHERE member.bridger_user_id=p.participant_user_id
              AND member.regional_manager_user_id=$2::uuid AND member.status='active')
        ON CONFLICT (partnership_id) DO UPDATE SET regional_manager_user_id=EXCLUDED.regional_manager_user_id,status='active',activated_at=NOW(),revoked_at=NULL
        RETURNING *`,[body.partnershipId,user.id])
      if (!rows[0]) return NextResponse.json({success:false,error:'Approve the partnership before activating Company Escrow.'},{status:409})
      return NextResponse.json({success:true,trust:rows[0],message:'Company Escrow Trust activated. Forensics may proceed only while Trust is active.'})
    }
    if (body.action === 'settle_company_share' && validId(body.transactionId) && ['sent','verified','held','investigation'].includes(body.status)) {
      if (!(await isForensic(user))) return NextResponse.json({success:false,error:'Approved active Forensics departmental appointment required.'},{status:403})
      const evidence = typeof body.evidenceNote === 'string' ? body.evidenceNote.trim() : ''
      const parsedAmount = Number(body.companySettlementAmountNgn)
      const amount = Number.isSafeInteger(parsedAmount) ? parsedAmount : 0
      if (['sent','verified'].includes(body.status) && (!Number.isSafeInteger(amount) || amount <= 0)) return NextResponse.json({success:false,error:'Enter the exact company amount sent in whole naira.'},{status:400})
      if (['sent','held','investigation'].includes(body.status) && evidence.length < 8) return NextResponse.json({success:false,error:'Add a settlement evidence note of at least 8 characters.'},{status:400})
      const { rows } = await pool.query(`UPDATE weave_forensic_gift_card_transactions t SET
        company_settlement_status=$2, company_settlement_amount_ngn=CASE WHEN $2 IN ('sent','verified') THEN $5::integer ELSE company_settlement_amount_ngn END, company_settlement_evidence=COALESCE(NULLIF($3,''),company_settlement_evidence),
        settlement_verified_by=CASE WHEN $2='verified' THEN $4::uuid ELSE settlement_verified_by END,
        settlement_verified_at=CASE WHEN $2='verified' THEN NOW() ELSE settlement_verified_at END,
        accountability_review_status=CASE WHEN $2 IN ('held','investigation') THEN 'pending_review' ELSE accountability_review_status END
        WHERE t.id=$1::uuid AND ($2<>'verified' OR (t.status='verified' AND $5=t.gross_amount_ngn-t.participant_agreed_share_ngn)) RETURNING *`,[body.transactionId,body.status,evidence,user.id,amount])
      if (!rows[0]) return NextResponse.json({success:false,error:'Transaction must exist and be independently verified before settlement verification.'},{status:409})
      return NextResponse.json({success:true,transaction:rows[0],message:'Company settlement status recorded. Accountability deductions require documented review.'})
    }
    if (body.action === 'review_manager_accountability' && validId(body.transactionId) && ['approved_deduction','rejected'].includes(body.status)) {
      if (user.role !== 'admin') return NextResponse.json({success:false,error:'Administration must review and authorize Regional Manager accountability deductions.'},{status:403})
      const note = typeof body.reviewNote === 'string' ? body.reviewNote.trim() : ''
      if (note.length < 20) return NextResponse.json({success:false,error:'Document the evidence and rationale in at least 20 characters.'},{status:400})
      const { rows } = await pool.query(`UPDATE weave_forensic_gift_card_transactions SET accountability_review_status=$2,accountability_review_note=$3 WHERE id=$1::uuid AND company_settlement_status IN ('held','investigation') AND accountability_review_status='pending_review' RETURNING *`,[body.transactionId,body.status,note])
      if (!rows[0]) return NextResponse.json({success:false,error:'Only a held or investigated transaction can receive an accountability decision.'},{status:409})
      return NextResponse.json({success:true,transaction:rows[0],message:'Accountability decision recorded; no wallet is automatically debited.'})
    }
    if (body.action === 'review_partnership' && validId(body.partnershipId) && ['active','paused','closed'].includes(body.status)) {
      if (!(await isForensic(user))) return NextResponse.json({success:false,error:'Approved active Forensics departmental appointment required.'},{status:403})
      const { rows } = await pool.query(`UPDATE weave_forensic_gift_card_partnerships
        SET status=$2,reviewed_at=NOW(),reviewed_by=$3::uuid
        WHERE id=$1::uuid AND status IN ('pending','active','paused') RETURNING *`,
        [body.partnershipId,body.status,user.id])
      if (!rows[0]) return NextResponse.json({success:false,error:'Partnership not found or cannot be reviewed.'},{status:409})
      return NextResponse.json({success:true,partnership:rows[0]})
    }
    if (body.action === 'carding_settlement' && validId(body.partnershipId) && ['recorded','verified','settled'].includes(body.status)) {
      if (!(await isForensic(user))) return NextResponse.json({success:false,error:'Approved active Forensics departmental appointment required.'},{status:403})
      const { rows } = await pool.query(`UPDATE weave_forensic_gift_card_partnerships
        SET carding_settlement_status=$2,reviewed_at=NOW(),reviewed_by=$3::uuid
        WHERE id=$1::uuid AND status='active'
          AND (carding_settlement_status='pending' OR
            (carding_settlement_status='recorded' AND $2 IN ('verified','settled')) OR
            (carding_settlement_status='verified' AND $2='settled'))
        RETURNING *`,[body.partnershipId,body.status,user.id])
      if (!rows[0]) return NextResponse.json({success:false,error:'Carding settlement status cannot move backwards or the partnership is not active.'},{status:409})
      return NextResponse.json({success:true,partnership:rows[0],message:'One-time carding split status updated.'})
    }
    if (body.action === 'verify_transaction' && validId(body.transactionId)) {
      if (!(await isForensic(user))) return NextResponse.json({success:false,error:'Approved active Forensics departmental appointment required.'},{status:403})
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
