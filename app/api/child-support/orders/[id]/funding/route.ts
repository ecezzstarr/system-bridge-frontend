import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { childSupportUuid } from '@/lib/child-support-orders'
import { familySupportAccess,ensureFamilySupportSchema } from '@/lib/family-support'

export const dynamic='force-dynamic'
export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({error:'Sign in required'},{status:401})
  const access=await familySupportAccess(user)
  if(!access.canSubmit)return NextResponse.json({error:'Active WEAVE position required'},{status:403})
  const {id}=await context.params
  const body=await request.json().catch(()=>({}))
  const reference=typeof body.sourceReference==='string'?body.sourceReference.trim():''
  if(!childSupportUuid.test(id)||reference.length<5||reference.length>160)
   return NextResponse.json({error:'Valid monthly order and funding reference required'},{status:400})
  try{
   await ensureFamilySupportSchema()
   const pool=getPool()
   const {rows}=await pool.query([
    "UPDATE weave_child_support_orders SET status='submitted',source_reference=$1,updated_at=NOW()",
    "WHERE id=$2::uuid AND requester_id=$3::uuid AND status='awaiting_funding'",
    'AND beneficiary_id IN (SELECT id FROM weave_family_support_beneficiaries WHERE sender_id=$3::uuid AND active=true)',
    'RETURNING id,status,period_month,amount_ngn',
   ].join('\n'),[reference,id,user.id])
   if(!rows.length)return NextResponse.json({error:'Only your pending monthly support instruction can receive new funding evidence'},{status:409})
   await pool.query([
    'INSERT INTO notifications(user_id,type,title,content,from_user_id,from_user_name,link)',
    "SELECT u.id,'family_support_order','Monthly support funding submitted',",
    "'A child or parent support instruction needs independent funding verification.',",
    "$1::uuid,$2,'/weave/child-support' FROM users u WHERE u.is_active=true AND",
    "(u.role='admin' OR EXISTS(SELECT 1 FROM weave_guidance_staff_applications a",
    "WHERE a.user_id=u.id AND a.department='forensic' AND a.status='approved' AND a.source_role=u.role))",
   ].join('\n'),[user.id,user.name||user.username||'WEAVE']).catch(()=>{})
   return NextResponse.json({success:true,order:rows[0],message:'Funding reference sent. Funds still await independent Forensics verification.'},{status:201})
  }catch(error:any){
   if(error?.code==='23505')return NextResponse.json({error:'That funding reference was already submitted'},{status:409})
   console.error('[Family monthly funding] POST',error)
   return NextResponse.json({error:'Could not submit monthly funding evidence'},{status:500})
  }
}
