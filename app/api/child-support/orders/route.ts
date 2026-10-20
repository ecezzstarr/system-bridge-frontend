import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import {
  childSupportAccess,ensureChildSupportOrdersSchema,validChildSupportMonth,
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
    const access=await childSupportAccess(user)
    if(!access.canSubmit)return NextResponse.json({error:'Active WEAVE position required'},{status:403})
    await ensureChildSupportOrdersSchema()
    const {rows}=await getPool().query([
      'SELECT o.*,u.name AS requester_name,u.username AS requester_username',
      'FROM weave_child_support_orders o JOIN users u ON u.id=o.requester_id',
      access.canReview?'':'WHERE o.requester_id=$1::uuid',
      "ORDER BY CASE o.status WHEN 'submitted' THEN 0 WHEN 'funds_verified' THEN 1 ELSE 2 END,o.created_at DESC LIMIT 200",
    ].filter(Boolean).join('\n'),access.canReview?[]:[user.id])
    return NextResponse.json({
      success:true,canReview:access.canReview,orders:rows,monthlyRule:CHILD_SUPPORT_MONTHLY_RULE,
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
    const access=await childSupportAccess(user)
    if(!access.canSubmit)return NextResponse.json({error:'Active Client, Agent, Bridger or Administration position required'},{status:403})
    const body=await request.json().catch(()=>({}))
    const amount=Number(body.amountNgn)
    const month=body.periodMonth
    const reference=str(body.sourceReference)
    const accountName=str(body.recipientAccountName)
    const bank=str(body.recipientBank)
    const accountNumber=str(body.recipientAccountNumber)
    const note=str(body.note)
    if(!Number.isSafeInteger(amount)||amount<1||amount>1000000000||!validChildSupportMonth(month)||
      !validText(reference,5,160)||!validText(accountName,2,160)||!validText(bank,2,120)||
      !/^[0-9]{10}$/.test(accountNumber)||note.length>800){
      return NextResponse.json({error:'Enter a valid month, whole-naira amount, source reference and a Nigerian 10-digit destination account.'},{status:400})
    }
    await ensureChildSupportOrdersSchema()
    const {rows}=await getPool().query([
      'INSERT INTO weave_child_support_orders',
      '(requester_id,requester_role,period_month,amount_ngn,source_reference,recipient_account_name,recipient_bank,recipient_account_number,note)',
      'VALUES ($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9)',
      'RETURNING id,status,period_month,amount_ngn,created_at',
    ].join('\n'),[user.id,user.role,month,amount,reference,accountName,bank,accountNumber,note])
    // Notify only authorized department appointees and Administration. Never place
    // bank account information, child identity or payment details in notifications.
    await getPool().query([
      'INSERT INTO notifications(user_id,type,title,content,from_user_id,from_user_name,link)',
      "SELECT u.id,'child_support_order','Child support order awaiting Forensics',",
      "'A '+$1+' submitted a child-support transfer instruction for review.',",
      "$2::uuid,$3,'/weave/child-support'",
      'FROM users u WHERE u.is_active=true AND (u.role=\'admin\' OR EXISTS (',
      'SELECT 1 FROM weave_guidance_staff_applications a',
      "WHERE a.user_id=u.id AND a.department='forensic' AND a.status='approved' AND a.source_role=u.role",
      '))',
    ].join('\n'),[user.role,user.id,user.name||user.username||'WEAVE']).catch(()=>{})
    return NextResponse.json({
      success:true,order:rows[0],
      message:'Child support instruction sent to the approved Forensics queue. Funding and transfer have not yet been confirmed.',
    },{status:201,headers:noStore})
  }catch(error:any){
    if(error?.code==='23505')return NextResponse.json({error:'This source reference was already submitted by your account.'},{status:409})
    console.error('[Child support orders] POST failed',error)
    return NextResponse.json({error:'Unable to create child support order'},{status:500})
  }
}
