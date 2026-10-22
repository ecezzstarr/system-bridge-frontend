import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { exitWeaveEmployment,getEmploymentCorrespondence,isWeaveEmploymentPosition,
  replyToEmployment,validEmploymentUserId } from '@/lib/weave-employment-lifecycle'
export const dynamic='force-dynamic'
async function actor(request:NextRequest){
  const user=await getAuthUser(request)
  return user&&['admin','agent','bridger'].includes(user.role)?user:null
}
export async function GET(request:NextRequest){
  const user=await actor(request)
  if(!user)return NextResponse.json({success:false,error:'Unauthorized'},{status:401})
  const position=request.nextUrl.searchParams.get('position')
  if(!isWeaveEmploymentPosition(position))return NextResponse.json({success:false,error:'Unknown employment position'},{status:400})
  const target=user.role==='admin'?request.nextUrl.searchParams.get('employeeId'):user.id
  if(!validEmploymentUserId(target))return NextResponse.json({success:false,error:'Valid employee required'},{status:400})
  try{
    const thread=await getEmploymentCorrespondence(position,target)
    if(!thread)return NextResponse.json({success:false,error:'Employment record not found'},{status:404})
    return NextResponse.json({success:true,thread},
      {headers:{'Cache-Control':'private, no-store'}})
  }catch(error){console.error('[employment desk] GET',error)
    return NextResponse.json({success:false,error:'Employment correspondence unavailable'},{status:500})}
}
export async function POST(request:NextRequest){
  const user=await actor(request)
  if(!user)return NextResponse.json({success:false,error:'Unauthorized'},{status:401})
  const body=await request.json().catch(()=>({}))
  if(!isWeaveEmploymentPosition(body?.position))return NextResponse.json({success:false,error:'Unknown employment position'},{status:400})
  const target=user.role==='admin'?body?.employeeId:user.id
  if(!validEmploymentUserId(target))return NextResponse.json({success:false,error:'Valid employee required'},{status:400})
  const action=body?.action
  const content=typeof body?.message==='string'?body.message:''
  try{
    let result
    if(action==='reply'){
      result=await replyToEmployment(body.position,target,{id:user.id,role:user.role},content)
    }else if(action==='resign'||action==='fire'){
      result=await exitWeaveEmployment(body.position,target,{id:user.id,role:user.role},action,content)
    }else return NextResponse.json({success:false,error:'Unknown employment action'},{status:400})
    if(!result.success){
      const code=result.reason==='forbidden'?403:result.reason==='not_active'||result.reason==='not_appointed'?409:
        result.reason==='not_found'?404:result.reason==='error'?500:400
      return NextResponse.json({success:false,error:
        result.reason==='forbidden'?'Not authorized to perform this employment action.':
        result.reason==='not_active'?'This application or employment has already ended.':
        result.reason==='not_appointed'?'Only an active appointed employee may be dismissed.':
        result.reason==='not_found'?'Employment record not found.':
        result.reason==='invalid_reason'?'Enter a reason of 10–2000 characters.':
        result.reason==='invalid_message'?'Reply must contain 2–2000 characters.':'Employment action could not be recorded.'},{status:code})
    }
    return NextResponse.json({success:true,result},
      {headers:{'Cache-Control':'private, no-store'}})
  }catch(error){console.error('[employment desk] POST',error)
    return NextResponse.json({success:false,error:'Employment action unavailable'},{status:500})}
}
