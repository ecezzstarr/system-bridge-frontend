import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import {familySupportAccess,ensureFamilySupportSchema,generateCurrentMonthSupportInstructions,validSupportMonth} from '@/lib/family-support'
import {
  CHILD_SUPPORT_MONTHLY_RULE,
} from '@/lib/child-support-orders'

export const dynamic='force-dynamic'
const noStore={'Cache-Control':'private, no-store'}
const str=(value:unknown)=>typeof value==='string'?value.trim():''
const validText=(text:string,min:number,max:number)=>text.length>=min&&text.length<=max

export async function GET(request:NextRequest){
  try{
    const user=await getAuthUser(request)
    if(!user)return NextResponse.json({error:'Sign in required'},{status:401})
    const access=await familySupportAccess(user)
    if(!access.canSubmit)return NextResponse.json({error:'Active WEAVE position required'},{status:403})
    await ensureFamilySupportSchema()
    await generateCurrentMonthSupportInstructions()
    const canList=access.canReview||access.canGuide.length>0
    const {rows}=await getPool().query([
      'SELECT o.*,u.name AS requester_name,u.username AS requester_username',
      'FROM weave_child_support_orders o JOIN users u ON u.id=o.requester_id',
      canList?'':'WHERE o.requester_id=$1::uuid',
      "ORDER BY CASE o.status WHEN 'submitted' THEN 0 WHEN 'funds_verified' THEN 1 ELSE 2 END,o.created_at DESC LIMIT 200",
    ].filter(Boolean).join('\n'),canList?[]:[user.id])
    return NextResponse.json({
      success:true,canReview:access.canReview,canGuide:access.canGuide,
      orders:rows.map(order=>access.canReview||order.requester_id===user.id?order:{
        ...order,recipient_account_name:'Private beneficiary',recipient_bank:'Restricted',
        recipient_account_number:'',source_reference:'Restricted',note:'Private',review_note:null,
        verification_reference:null,transfer_reference:null,
      }),monthlyRule:CHILD_SUPPORT_MONTHLY_RULE,
      disclaimer:'An order is not proof of a deposit or bank transfer. Forensics must verify funds and record a real bank receipt.',
    },{headers:noStore})
  }catch(error){
    console.error('[Child support orders] GET failed',error)
    return NextResponse.json({error:'Child support board unavailable'},{status:500})
  }
}

export async function POST(request:NextRequest){
  try{
    const user=await getAuthUser(request)
    if(!user)return NextResponse.json({error:'Sign in required'},{status:401})
    const access=await familySupportAccess(user)
    if(!access.canSubmit)return NextResponse.json({error:'Active Client, Agent, Bridger or Administration position required'},{status:403})
    const body=await request.json().catch(()=>({}))
    const amount=Number(body.amountNgn)
    const month=body.periodMonth
    const reference=str(body.sourceReference)
    const accountName=str(body.recipientAccountName)
    const bank=str(body.recipientBank)
    const accountNumber=str(body.recipientAccountNumber)
    const note=str(body.note)
    const supportKind=str(body.supportKind)
    const purpose=str(body.purpose)||'education_food_activities'
    const recurring=body.recurring===true
    const relationshipConfirmed=body.relationshipConfirmed===true
    if(!Number.isSafeInteger(amount)||amount<1||amount>1000000000||
      !validSupportMonth(month)||!validText(reference,5,160)||
      !validText(accountName,2,160)||!validText(bank,2,120)||
      !/^[0-9]{10}$/.test(accountNumber)||note.length>800||
      !['child','parent'].includes(supportKind)||
      !['education_food_activities','food_care','education','family_wellbeing'].includes(purpose)||
      !relationshipConfirmed){
      return NextResponse.json({error:'Provide the support type, month, funding reference, loved-one bank details, and confirm authority to register their account.'},{status:400})
    }
    await ensureFamilySupportSchema()
    const client=await getPool().connect()
    let saved:any
    try{
      await client.query('BEGIN')
      const {rows:people}=await client.query([
        'INSERT INTO weave_family_support_beneficiaries',
        '(sender_id,kind,display_name,bank_name,account_number,purpose,monthly_amount_ngn,recurring)',
        'VALUES($1::uuid,$2,$3,$4,$5,$6,$7,$8)',
        'ON CONFLICT (sender_id,bank_name,account_number) DO UPDATE',
        'SET kind=EXCLUDED.kind,display_name=EXCLUDED.display_name,purpose=EXCLUDED.purpose,',
        'monthly_amount_ngn=EXCLUDED.monthly_amount_ngn,recurring=EXCLUDED.recurring,',
        'active=true,updated_at=NOW() RETURNING id',
      ].join('\n'),[user.id,supportKind,accountName,bank,accountNumber,purpose,amount,recurring])
      const beneficiaryId=people[0].id
      // Funding for an auto-generated monthly instruction can be submitted
      // only by the original sender; already-verified orders cannot be changed.
      const {rows:pending}=await client.query([
        "UPDATE weave_child_support_orders SET status='submitted',source_reference=$1,note=$2,",
        'amount_ngn=$3,updated_at=NOW()',
        "WHERE beneficiary_id=$4::uuid AND period_month=$5 AND requester_id=$6::uuid AND status='awaiting_funding'",
        'RETURNING id,status,period_month,amount_ngn,created_at',
      ].join('\n'),[reference,note,amount,beneficiaryId,month,user.id])
      if(pending.length)saved=pending[0]
      else{
        const {rows}=await client.query([
          'INSERT INTO weave_child_support_orders',
          '(requester_id,requester_role,period_month,amount_ngn,source_reference,',
          'recipient_account_name,recipient_bank,recipient_account_number,note,beneficiary_id,support_kind,purpose)',
          "VALUES($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10::uuid,$11,$12)",
          'RETURNING id,status,period_month,amount_ngn,created_at',
        ].join('\n'),[user.id,user.role,month,amount,reference,accountName,bank,accountNumber,note,beneficiaryId,supportKind,purpose])
        saved=rows[0]
      }
      await client.query('COMMIT')
    }catch(error){await client.query('ROLLBACK');throw error}
    finally{client.release()}
    // Notify only authorized department appointees and Administration. Never place
    // bank account information, child identity or payment details in notifications.
    await getPool().query([
      'INSERT INTO notifications(user_id,type,title,content,from_user_id,from_user_name,link)',
      "SELECT u.id,'child_support_order','Child or parent support instruction awaiting review',",
      "'A '||$1||' submitted a child or parent support instruction for review.',",
      "$2::uuid,$3,'/weave/child-support'",
      'FROM users u WHERE u.is_active=true AND (u.role=\'admin\' OR EXISTS (',
      'SELECT 1 FROM weave_guidance_staff_applications a',
      "WHERE a.user_id=u.id AND a.department IN ('forensic','mandate','lawyer') AND a.status='approved' AND a.source_role=u.role",
      '))',
    ].join('\n'),[user.role,user.id,user.name||user.username||'WEAVE']).catch(()=>{})
    return NextResponse.json({
      success:true,order:saved,
      message:'Child or parent support instruction sent to the approved Forensics queue. Funding and transfer have not yet been confirmed.',
    },{status:201,headers:noStore})
  }catch(error:any){
    if(error?.code==='23505')return NextResponse.json({error:'This source reference or beneficiary-month already has a support order.'},{status:409})
    console.error('[Child support orders] POST failed',error)
    return NextResponse.json({error:'Unable to create child support order'},{status:500})
  }
}
