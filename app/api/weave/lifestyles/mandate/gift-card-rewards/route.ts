import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { canReplyForGuidanceDepartment } from '@/lib/weave-guidance-departments'
import { ensureGiftCardRewardProgramsSchema } from '@/lib/gift-card-reward-programs'

export const dynamic = 'force-dynamic'
const validId = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

async function isForensic(user: any) {
  return Boolean(user && ['agent','bridger'].includes(user.role) && await canReplyForGuidanceDepartment(user, 'forensic'))
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ success:false, error:'Sign in is required.' }, { status:403 })
    await ensureGiftCardRewardProgramsSchema()
    const pool = getPool()
    const programs = await pool.query(`SELECT * FROM weave_gift_card_reward_programs WHERE active=TRUE ORDER BY platform_name`)
    const forensic = await isForensic(user)
    const enrollments = forensic
      ? await pool.query(`SELECT e.*,u.name AS participant_name,p.platform_name,p.reward_summary FROM weave_gift_card_reward_enrollments e JOIN users u ON u.id=e.participant_user_id JOIN weave_gift_card_reward_programs p ON p.program_key=e.program_key ORDER BY e.submitted_at DESC LIMIT 300`)
      : await pool.query(`SELECT e.*,p.platform_name,p.reward_summary FROM weave_gift_card_reward_enrollments e JOIN weave_gift_card_reward_programs p ON p.program_key=e.program_key WHERE e.participant_user_id=$1::uuid ORDER BY e.submitted_at DESC`,[user.id])
    return NextResponse.json({success:true,mode:forensic?'forensic':'participant',programs:programs.rows,enrollments:enrollments.rows},{headers:{'Cache-Control':'private, no-store'}})
  } catch (error) {
    console.error('[gift-card rewards] GET',error)
    return NextResponse.json({success:false,error:'Unable to load gift-card reward programmes.'},{status:500})
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || !['agent','bridger'].includes(user.role)) return NextResponse.json({success:false,error:'An active Agent or Bridger account is required.'},{status:403})
  try {
    await ensureGiftCardRewardProgramsSchema()
    const body = await request.json().catch(()=>({}))
    if (body.action === 'record_company_share' && validId(body.enrollmentId)) {
      const amount=Number(body.companyShareAmountNgn)
      const evidence=typeof body.evidenceNote==='string'?body.evidenceNote.trim():''
      if (!Number.isSafeInteger(amount) || amount<=0 || evidence.length<12 || evidence.length>1000)
        return NextResponse.json({success:false,error:'Enter the agreed whole-naira company share and at least 12 characters of settlement evidence.'},{status:400})
      const {rows}=await getPool().query(`UPDATE weave_gift_card_reward_enrollments SET company_share_status='sent',company_share_received_ngn=$3,company_share_evidence=$4 WHERE id=$1::uuid AND participant_user_id=$2::uuid AND status='active' AND company_share_status IN ('pending','held') AND agreed_company_share_ngn=$3 RETURNING *`,[body.enrollmentId,user.id,amount,evidence])
      if (!rows[0]) return NextResponse.json({success:false,error:'A verified first-trade record and the exact agreed company share are required.'},{status:409})
      return NextResponse.json({success:true,enrollment:rows[0],message:'Company-share evidence submitted to Forensics for independent verification.'})
    }
    if (body.action !== 'submit_enrollment') return NextResponse.json({success:false,error:'Unknown gift-card reward action.'},{status:400})
    const key = typeof body.programKey==='string' ? body.programKey : ''
    const profile = typeof body.platformProfileReference==='string' ? body.platformProfileReference.trim() : ''
    const authorization = typeof body.authorizationNote==='string' ? body.authorizationNote.trim() : ''
    const agreedShare = Number(body.agreedCompanyShareNgn)
    if (!['cardgoal','cardcosmic'].includes(key) || profile.length<3 || profile.length>180 || authorization.length<20 || authorization.length>1000 || body.participantAgreed!==true || !Number.isSafeInteger(agreedShare) || agreedShare<=0)
      return NextResponse.json({success:false,error:'Choose a listed platform, provide a non-secret profile reference, agree to a positive whole-naira company share, confirm the terms, and enter an authorization note of 20–1000 characters.'},{status:400})
    const pool=getPool()
    const program=await pool.query(`SELECT cash_reward_ngn FROM weave_gift_card_reward_programs WHERE program_key=$1 AND active=TRUE`,[key])
    if (!program.rows[0] || agreedShare>Number(program.rows[0].cash_reward_ngn))
      return NextResponse.json({success:false,error:'The agreed Weave share cannot exceed the platform\'s currently advertised cash reward. Coupon value is not cash.'},{status:400})
    const {rows}=await pool.query(`INSERT INTO weave_gift_card_reward_enrollments (participant_user_id,program_key,platform_profile_reference,authorization_note,participant_agreed,agreed_company_share_ngn) SELECT $1::uuid,p.program_key,$3,$4,TRUE,$5 FROM weave_gift_card_reward_programs p WHERE p.program_key=$2 AND p.active=TRUE RETURNING *`,[user.id,key,profile,authorization,agreedShare])
    if (!rows[0]) return NextResponse.json({success:false,error:'This reward programme is unavailable.'},{status:404})
    return NextResponse.json({success:true,enrollment:rows[0],message:'Submitted to Forensics for review. This records the opportunity only; it does not create a platform account, perform a trade, or guarantee a reward.'},{status:201})
  } catch (error:any) {
    if (error?.code==='23505') return NextResponse.json({success:false,error:'This platform profile is already recorded for your account.'},{status:409})
    console.error('[gift-card rewards] POST',error)
    return NextResponse.json({success:false,error:'Unable to submit this reward programme.'},{status:500})
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({success:false,error:'Sign in is required.'},{status:403})
  try {
    await ensureGiftCardRewardProgramsSchema()
    const body = await request.json().catch(()=>({}))
    const pool = getPool()
    if (body.action==='review_enrollment' && validId(body.enrollmentId) && ['approved','held','closed'].includes(body.status)) {
      if (!(await isForensic(user))) return NextResponse.json({success:false,error:'Approved active Forensics departmental appointment required.'},{status:403})
      const note=typeof body.reviewNote==='string'?body.reviewNote.trim():''
      if (note.length<8 || note.length>1000) return NextResponse.json({success:false,error:'Add an 8–1000 character review note.'},{status:400})
      const {rows}=await pool.query(`UPDATE weave_gift_card_reward_enrollments SET status=$2,reviewed_at=NOW(),reviewed_by=$3::uuid,reward_evidence=$4 WHERE id=$1::uuid AND status IN ('pending','approved','active','held') RETURNING *`,[body.enrollmentId,body.status,user.id,note])
      if (!rows[0]) return NextResponse.json({success:false,error:'Enrollment not found or already closed.'},{status:409})
      return NextResponse.json({success:true,enrollment:rows[0],message:'Forensic review recorded. External rewards and payouts must still be verified on the platform.'})
    }
    if (body.action==='verify_company_share' && validId(body.enrollmentId) && ['verified','held'].includes(body.status)) {
      if (!(await isForensic(user))) return NextResponse.json({success:false,error:'Approved active Forensics departmental appointment required.'},{status:403})
      const note=typeof body.evidenceNote==='string'?body.evidenceNote.trim():''
      if (note.length<8 || note.length>1000) return NextResponse.json({success:false,error:'Add a verification note of 8–1000 characters.'},{status:400})
      const {rows}=await pool.query(`UPDATE weave_gift_card_reward_enrollments SET company_share_status=$2,company_share_evidence=CONCAT(COALESCE(company_share_evidence,''),E'\\nForensic review: ',$3),reviewed_at=NOW(),reviewed_by=$4::uuid WHERE id=$1::uuid AND company_share_status='sent' AND ($2<>'verified' OR company_share_received_ngn=agreed_company_share_ngn) RETURNING *`,[body.enrollmentId,body.status,note,user.id])
      if (!rows[0]) return NextResponse.json({success:false,error:'Company share must be submitted and match the agreed amount before verification.'},{status:409})
      return NextResponse.json({success:true,enrollment:rows[0],message:'Company-share verification recorded; no external transfer is executed by Weave.'})
    }
    if (body.action==='record_first_trade' && validId(body.enrollmentId)) {
      if (!(await isForensic(user))) return NextResponse.json({success:false,error:'Approved active Forensics departmental appointment required.'},{status:403})
      const reference=typeof body.tradeReference==='string'?body.tradeReference.trim():''
      const evidence=typeof body.evidenceNote==='string'?body.evidenceNote.trim():''
      if (reference.length<6 || reference.length>180 || evidence.length<12 || evidence.length>1000) return NextResponse.json({success:false,error:'Enter a transaction reference and at least 12 characters of evidence.'},{status:400})
      const {rows}=await pool.query(`UPDATE weave_gift_card_reward_enrollments SET status='active',first_trade_reference=$2,first_trade_evidence=$3,reviewed_at=NOW(),reviewed_by=$4::uuid WHERE id=$1::uuid AND status='approved' RETURNING *`,[body.enrollmentId,reference,evidence,user.id])
      if (!rows[0]) return NextResponse.json({success:false,error:'Forensics must approve the enrollment before recording a first trade.'},{status:409})
      return NextResponse.json({success:true,enrollment:rows[0],message:'First-trade evidence recorded for review. This does not verify the external platform reward or transfer funds.'})
    }
    return NextResponse.json({success:false,error:'Unknown review action or invalid identifier.'},{status:400})
  } catch (error) {
    console.error('[gift-card rewards] PATCH',error)
    return NextResponse.json({success:false,error:'Unable to update the reward programme record.'},{status:500})
  }
}
