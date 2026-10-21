import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { canReplyForGuidanceDepartment } from '@/lib/weave-guidance-departments'
import { getLifestyleAccess } from '@/lib/weave-lifestyle'
import { ensureFoodPreparationManagerSchema,validUuid } from '@/lib/food-preparation-manager'
import { isFoodForensicBeneficiary } from '@/lib/food-forensic-settlement'
export const dynamic='force-dynamic'

async function authorized(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||!['agent','bridger'].includes(user.role))return null
  return await canReplyForGuidanceDepartment(user,'forensic')?user:null
}

export async function GET(request:NextRequest){
  try{
    const forensic=await authorized(request)
    if(!forensic)return NextResponse.json({success:false,error:'Approved active Forensics department appointment required.'},{status:403})
    await ensureFoodPreparationManagerSchema()
    const [entries,lead]=await Promise.all([
      getPool().query(`
        SELECT s.id AS split_id,s.product,s.source_order_id,s.package_count,
          s.received_ngn,s.agent_expected_margin_ngn,s.administration_ngn,
          s.family_support_ngn,s.lead_preparation_ngn,
          s.unit_cost_ngn,s.retail_unit_price_ngn,s.created_at,
          u.name AS purchasing_agent_name,
          p.id AS payout_id,p.beneficiary,p.amount_ngn,p.status,
          p.transfer_reference,p.recorded_at,p.bank_name,
          p.destination_account_last4
        FROM weave_food_forensic_stock_splits s
        JOIN users u ON u.id=s.purchasing_agent_id
        JOIN weave_food_forensic_payouts p ON p.split_id=s.id
        ORDER BY s.created_at DESC,p.beneficiary ASC LIMIT 450
      `),
      getPool().query(`
        SELECT m.id,m.agent_id,u.name,u.username
        FROM weave_food_preparation_managers m
        JOIN users u ON u.id=m.agent_id
        WHERE m.position='manager' AND m.status='approved' AND u.is_active=true AND u.role='agent'
        ORDER BY m.reviewed_at DESC LIMIT 1
      `),
    ])
    const manager=lead.rows[0]||null
    const leadEligible=manager?Boolean((await getLifestyleAccess(String(manager.agent_id))).active):false
    return NextResponse.json({
      success:true,payouts:entries.rows,leadManager:manager?{
        name:manager.name||manager.username,active:leadEligible,
      }:null,
      method:'manual_external_bank_transfer_recording',
      note:'Forensics must independently verify and send each transfer using the actual bank. WEAVE only records the stated bank reference and does not initiate or verify transfers automatically.',
    },{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){console.error('[food forensics] GET',error)
    return NextResponse.json({success:false,error:'Unable to load the food Forensics payout queue.'},{status:500})}
}

export async function PATCH(request:NextRequest){
  const forensic=await authorized(request)
  if(!forensic)return NextResponse.json({success:false,error:'Approved active Forensics appointment required.'},{status:403})
  try{
    const body=await request.json().catch(()=>({}))
    const payoutId=body.payoutId
    const beneficiary=body.beneficiary
    const transferReference=typeof body.transferReference==='string'?body.transferReference.trim():''
    const bankName=typeof body.bankName==='string'?body.bankName.trim():''
    const last4=typeof body.accountLast4==='string'?body.accountLast4.trim():''
    const transferNote=typeof body.note==='string'?body.note.trim():''
    if(body.action!=='report_external_transfer'||!validUuid(payoutId)||!isFoodForensicBeneficiary(beneficiary)||
       transferReference.length<6||transferReference.length>180||bankName.length<2||bankName.length>120||
       !/^\d{4}$/.test(last4)||transferNote.length<12||transferNote.length>800)
      return NextResponse.json({success:false,error:'Choose the correct payout and enter a bank transfer reference, bank name, account last four digits and a 12–800 character settlement note.'},{status:400})
    await ensureFoodPreparationManagerSchema()
    const client=await getPool().connect()
    try{
      await client.query('BEGIN')
      const {rows}=await client.query(`
        SELECT p.id,p.status,p.amount_ngn,p.beneficiary,s.source_order_id,s.product
        FROM weave_food_forensic_payouts p
        JOIN weave_food_forensic_stock_splits s ON s.id=p.split_id
        WHERE p.id=$1::uuid AND p.beneficiary=$2 FOR UPDATE OF p
      `,[payoutId,beneficiary])
      const payout=rows[0]
      if(!payout||payout.status!=='pending'){
        await client.query('ROLLBACK')
        return NextResponse.json({success:false,error:'This payout is missing or already has a transfer recorded.'},{status:409})
      }
      if(beneficiary==='lead_manager'){
        const {rows:managers}=await client.query(`
          SELECT m.agent_id FROM weave_food_preparation_managers m
          JOIN users u ON u.id=m.agent_id
          WHERE m.position='manager' AND m.status='approved' AND u.role='agent' AND u.is_active=true
          LIMIT 1
        `)
        if(!managers[0]||!(await getLifestyleAccess(String(managers[0].agent_id))).active)
          throw new Error('No approved active Stability Lead Manager can receive this preparation payment.')
      }
      const {rows:updated}=await client.query(`
        UPDATE weave_food_forensic_payouts
        SET status='transfer_reported',transfer_reference=$1,bank_name=$2,
            destination_account_last4=$3,transfer_note=$4,
            recorded_by=$5::uuid,recorded_at=NOW()
        WHERE id=$6::uuid AND status='pending'
        RETURNING id,beneficiary,amount_ngn,status,transfer_reference,recorded_at
      `,[transferReference,bankName,last4,transferNote,forensic.id,payoutId])
      await client.query('COMMIT')
      return NextResponse.json({success:true,payout:updated[0],
        message:'External transfer details recorded. Verify the transaction against bank statements; the application has not initiated a payment.'})
    }catch(error){
      await client.query('ROLLBACK').catch(()=>{})
      if((error as {code?:string})?.code==='23505')
        return NextResponse.json({success:false,error:'The bank transfer reference is already used in another payout.'},{status:409})
      throw error
    }finally{client.release()}
  }catch(error){console.error('[food forensics] PATCH',error)
    return NextResponse.json({success:false,error:'Unable to record this Forensics transfer. Verify the beneficiary and payment proof.'},{status:500})}
}
