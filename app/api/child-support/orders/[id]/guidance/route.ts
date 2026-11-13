import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { childSupportUuid } from '@/lib/child-support-orders'
import { ensureFamilySupportSchema,familySupportAccess } from '@/lib/family-support'

export const dynamic='force-dynamic'
export async function GET(request:NextRequest,context:{params:Promise<{id:string}>}){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({error:'Sign in required'},{status:401})
  const {id}=await context.params
  if(!childSupportUuid.test(id))return NextResponse.json({error:'Invalid support instruction'},{status:400})
  try{
    const access=await familySupportAccess(user)
    if(!access.canSubmit)return NextResponse.json({error:'Active WEAVE position required'},{status:403})
    await ensureFamilySupportSchema()
    const {rows:orders}=await getPool().query('SELECT requester_id FROM weave_child_support_orders WHERE id=$1::uuid',[id])
    if(!orders.length)return NextResponse.json({error:'Support instruction not found'},{status:404})
    const own=String(orders[0].requester_id)===user.id
    if(!own&&!access.canReview&&!access.canGuide.length)
      return NextResponse.json({error:'Not authorized for this support instruction'},{status:403})
    const {rows}=await getPool().query([
      'SELECT g.id,g.department,g.guidance_note,g.created_at,',
      'u.name AS author_name FROM weave_family_support_guidance g',
      'JOIN users u ON u.id=g.author_id',
      'WHERE g.order_id=$1::uuid ORDER BY g.created_at ASC LIMIT 100',
    ].join('\n'),[id])
    return NextResponse.json({success:true,guidance:rows},{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){
    console.error('[Family support guidance] GET',error)
    return NextResponse.json({error:'Unable to load support guidance'},{status:500})
  }
}
export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({error:'Sign in required'},{status:401})
  const {id}=await context.params
  if(!childSupportUuid.test(id))return NextResponse.json({error:'Invalid support instruction'},{status:400})
  const body=await request.json().catch(()=>({}))
  const department=typeof body.department==='string'?body.department:''
  const note=typeof body.note==='string'?body.note.trim():''
  if(!['mandate','lawyer'].includes(department)||note.length<15||note.length>1000)
    return NextResponse.json({error:'Mandate or Attorney and 15–1000 characters of practical support guidance required'},{status:400})
  const access=await familySupportAccess(user)
  if(!access.canGuide.includes(department))return NextResponse.json({error:'An approved Mandate or Attorney appointment is required'},{status:403})
  const pool=getPool()
  let client:Awaited<ReturnType<typeof pool.connect>>|null=null
  try{
    await ensureFamilySupportSchema()
    client=await pool.connect()
    await client.query('BEGIN')
    if(user.role!=='admin'){
      const {rows}=await client.query([
        'SELECT a.id FROM weave_guidance_staff_applications a JOIN users u ON u.id=a.user_id',
        'WHERE a.user_id=$1::uuid AND a.department=$2 AND a.status=\'approved\'',
        'AND a.source_role=$3 AND u.role=$3 AND u.is_active=true',
        "AND (u.role='agent' OR u.is_subscription_exempt=true OR",
        "(u.subscription_status='active' AND (u.subscription_expiry IS NULL OR u.subscription_expiry>NOW())))",
        'FOR SHARE OF a,u',
      ].join('\n'),[user.id,department,user.role])
      if(!rows.length){await client.query('ROLLBACK');return NextResponse.json({error:'Your guidance appointment is no longer active'},{status:403})}
    }
    const {rows:orders}=await client.query('SELECT id,requester_id FROM weave_child_support_orders WHERE id=$1::uuid FOR SHARE',[id])
    if(!orders.length){await client.query('ROLLBACK');return NextResponse.json({error:'Support instruction not found'},{status:404})}
    if(user.role!=='admin'&&String(orders[0].requester_id)===user.id){
      await client.query('ROLLBACK')
      return NextResponse.json({error:'Guidance officers cannot review their own support instructions'},{status:403})
    }
    const {rows}=await client.query([
      'INSERT INTO weave_family_support_guidance(order_id,author_id,department,guidance_note)',
      'VALUES($1::uuid,$2::uuid,$3,$4) RETURNING id,department,guidance_note,created_at',
    ].join('\n'),[id,user.id,department,note])
    await client.query('COMMIT')
    await pool.query([
      'INSERT INTO notifications(user_id,type,title,content,from_user_id,from_user_name,link)',
      "VALUES($1::uuid,'family_support_guidance','Family support guidance available',",
      "'Mandate or Attorney added a support-plan suggestion.',",
      "$2::uuid,$3,'/weave/child-support')",
    ].join('\n'),[orders[0].requester_id,user.id,user.name||user.username||'WEAVE']).catch(()=>{})
    return NextResponse.json({success:true,guidance:rows[0]},{status:201})
  }catch(error){
    if(client)await client.query('ROLLBACK').catch(()=>{})
    console.error('[Family support guidance] POST',error)
    return NextResponse.json({error:'Could not record guidance'},{status:500})
  }finally{client?.release()}
}
