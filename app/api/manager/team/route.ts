import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { readDistributionTeam,postDistributionTeamUpdate,type DistributionTeamUpdateKind } from '@/lib/distribution-team-updates'
export const dynamic='force-dynamic'
export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({success:false,error:'Unauthorized'},{status:401})
  if(!['agent','bridger'].includes(user.role))return NextResponse.json({success:false,error:'Verified staff role required'},{status:403})
  try{
    const team=await readDistributionTeam(user.id)
    if(!team)return NextResponse.json({success:false,error:'Verified active Distribution team employment required'},{status:403})
    return NextResponse.json({success:true,team},{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){console.error('[distribution team] load failed',error)
    return NextResponse.json({success:false,error:'Unable to open team workspace'},{status:500})}
}
export async function POST(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({success:false,error:'Unauthorized'},{status:401})
  if(!['agent','bridger'].includes(user.role))return NextResponse.json({success:false,error:'Only verified team members can post'},{status:403})
  const body=await request.json().catch(()=>({}))
  const kind=body?.kind
  if(!['message','plan','progress','handoff'].includes(kind)||typeof body.content!=='string')
    return NextResponse.json({success:false,error:'Choose a valid update type and message'},{status:400})
  try{
    const result=await postDistributionTeamUpdate(user.id,kind as DistributionTeamUpdateKind,body.content)
    if(!result.success)return NextResponse.json({success:false,error:result.reason==='not_employed'?'Administration verification or an approved assistant appointment is required':result.reason==='position_inactive'?'Underlying Agent or Bridger position is inactive':'Message must be 2–2000 characters'},{status:403})
    return NextResponse.json(result,{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){console.error('[distribution team] post failed',error)
    return NextResponse.json({success:false,error:'Unable to post team update'},{status:500})}
}
