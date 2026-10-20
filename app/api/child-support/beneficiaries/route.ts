import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { childSupportUuid } from '@/lib/child-support-orders'
import { ensureFamilySupportSchema,familySupportAccess } from '@/lib/family-support'

export const dynamic='force-dynamic'
export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({error:'Sign in required'},{status:401})
  const access=await familySupportAccess(user)
  if(!access.canSubmit)return NextResponse.json({error:'An active WEAVE position is required'},{status:403})
  try{
    await ensureFamilySupportSchema()
    const {rows}=await getPool().query([
      'SELECT id,kind,display_name,bank_name,account_number,purpose,',
      'monthly_amount_ngn,recurring,active,created_at FROM weave_family_support_beneficiaries',
      'WHERE sender_id=$1::uuid ORDER BY created_at DESC LIMIT 100',
    ].join('\n'),[user.id])
    return NextResponse.json({success:true,beneficiaries:rows},{headers:{'Cache-Control':'private, no-store'}})
  }catch(e){console.error('[Family beneficiaries] GET',e);return NextResponse.json({error:'Unable to load beneficiaries'},{status:500})}
}
export async function PATCH(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({error:'Sign in required'},{status:401})
  const access=await familySupportAccess(user)
  if(!access.canSubmit)return NextResponse.json({error:'An active WEAVE position is required'},{status:403})
  const body=await request.json().catch(()=>({}))
  const id=typeof body.beneficiaryId==='string'?body.beneficiaryId:''
  const recurring=body.recurring
  if(!childSupportUuid.test(id)||typeof recurring!=='boolean')
    return NextResponse.json({error:'Choose a valid beneficiary and recurring status'},{status:400})
  try{
    await ensureFamilySupportSchema()
    const {rows}=await getPool().query([
      'UPDATE weave_family_support_beneficiaries SET recurring=$1,updated_at=NOW()',
      'WHERE id=$2::uuid AND sender_id=$3::uuid RETURNING id,recurring',
    ].join('\n'),[recurring,id,user.id])
    if(!rows.length)return NextResponse.json({error:'Beneficiary not found'},{status:404})
    return NextResponse.json({success:true,beneficiary:rows[0]})
  }catch(e){console.error('[Family beneficiaries] PATCH',e);return NextResponse.json({error:'Unable to update monthly instructions'},{status:500})}
}
