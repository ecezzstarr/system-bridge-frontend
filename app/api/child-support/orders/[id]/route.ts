import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { childSupportUuid } from '@/lib/child-support-orders'
import { familySupportAccess,ensureFamilySupportSchema } from '@/lib/family-support'

export const dynamic='force-dynamic'
const noStore={'Cache-Control':'private, no-store'}
const str=(value:unknown)=>typeof value==='string'?value.trim():''

// This endpoint records human-reviewed external bank evidence. It NEVER sends money.
export async function PATCH(request:NextRequest,context:{params:Promise<{id:string}>}){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({error:'Sign in required'},{status:401})
  const access=await familySupportAccess(user)
  if(!access.canReview)return NextResponse.json({error:'Administration or approved Forensics appointment required'},{status:403})
  const {id}=await context.params
  if(!childSupportUuid.test(id))return NextResponse.json({error:'Invalid order reference'},{status:400})
  const body=await request.json().catch(()=>({}))
  const action=str(body.action)
  const evidence=str(body.reference)
  const note=str(body.note)
  if(!['verify_funds','record_transfer','reject'].includes(action)||note.length>800||
    (action!=='reject'&&(evidence.length<8||evidence.length>160))||
    (action==='reject'&&(note.length<10||note.length>800)))
    return NextResponse.json({error:'Supply a valid action, independent transaction/verification reference and review note.'},{status:400})
  const pool=getPool()
  let client:Awaited<ReturnType<typeof pool.connect>>|null=null
  try{
    await ensureFamilySupportSchema()
    client=await pool.connect()
    await client.query('BEGIN')
    if(user.role!=='admin'){
      // Approval and account standing are rechecked under lock so revocation
      // cannot race an already-in-flight financial status update.
      const {rows}=await client.query([
        'SELECT a.id FROM weave_guidance_staff_applications a JOIN users u ON u.id=a.user_id',
        "WHERE a.user_id=$1::uuid AND a.department='forensic' AND a.status='approved'",
        "AND a.source_role=$2 AND u.role=$2 AND u.is_active=true",
        "AND (u.role='agent' OR u.is_subscription_exempt=true OR",
        "(u.subscription_status='active' AND (u.subscription_expiry IS NULL OR u.subscription_expiry>NOW())))",
        'FOR SHARE OF a,u',
      ].join('\n'),[user.id,user.role])
      if(!rows.length){await client.query('ROLLBACK');return NextResponse.json({error:'Forensics appointment no longer active'},{status:403})}
    }
    const {rows:current}=await client.query('SELECT requester_id,status FROM weave_child_support_orders WHERE id=$1::uuid FOR UPDATE',[id])
    const order=current[0]
    if(!order){await client.query('ROLLBACK');return NextResponse.json({error:'Order not found'},{status:404})}
    if(user.role!=='admin'&&String(order.requester_id)===user.id){
      await client.query('ROLLBACK')
      return NextResponse.json({error:'You cannot verify your own financial order'},{status:403})
    }
    const next=action==='verify_funds'?'funds_verified':action==='record_transfer'?'transferred':'rejected'
    if((next==='funds_verified'&&order.status!=='submitted')||
       (next==='transferred'&&order.status!=='funds_verified')||
       (next==='rejected'&&!['submitted','funds_verified'].includes(order.status))){
      await client.query('ROLLBACK')
      return NextResponse.json({error:'Order is not in the required previous stage'},{status:409})
    }
    const {rows}=await client.query([
      'UPDATE weave_child_support_orders SET',
      'status=$1,review_note=$2,',
      "verification_reference=CASE WHEN $1='funds_verified' THEN $3 ELSE verification_reference END,",
      "transfer_reference=CASE WHEN $1='transferred' THEN $3 ELSE transfer_reference END,",
      "verified_by=CASE WHEN $1='funds_verified' THEN $4::uuid ELSE verified_by END,",
      "verified_at=CASE WHEN $1='funds_verified' THEN NOW() ELSE verified_at END,",
      "transferred_by=CASE WHEN $1='transferred' THEN $4::uuid ELSE transferred_by END,",
      "transferred_at=CASE WHEN $1='transferred' THEN NOW() ELSE transferred_at END,",
      'updated_at=NOW() WHERE id=$5::uuid RETURNING id,requester_id,status,period_month,amount_ngn,updated_at',
    ].join('\n'),[next,note,evidence||null,user.id,id])
    await client.query('COMMIT')
    await pool.query([
      'INSERT INTO notifications(user_id,type,title,content,from_user_id,from_user_name,link)',
      "VALUES($1::uuid,'child_support_order',$2,$3,$4::uuid,$5,'/weave/child-support')",
    ].join('\n'),[
      rows[0].requester_id,'Child support order · '+next.replaceAll('_',' '),
      next==='transferred'?'Forensics recorded an external transfer reference. Review the order receipt.':
        next==='funds_verified'?'Forensics recorded verified funding; transfer remains pending.':
        'Forensics rejected the instruction. Review the notes.',
      user.id,user.name||user.username||'Forensics',
    ]).catch(()=>{})
    return NextResponse.json({success:true,order:rows[0],
      message:next==='transferred'?'Transfer reference recorded; external settlement must be reconciled.':'Order status updated.',
    },{headers:noStore})
  }catch(error){
    if(client)await client.query('ROLLBACK').catch(()=>{})
    console.error('[Child support orders] PATCH failed',error)
    return NextResponse.json({error:'Unable to update child support order'},{status:500})
  }finally{client?.release()}
}
