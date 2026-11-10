import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getWeaveSearchDirectory,isWeaveSearchRole,searchWeaveActions,weaveRoleName} from '@/lib/weave-action-search'

// The authenticated role is determined server-side on each query. The browser
// cannot request another position's Administration or private Client index.
// In exclusive Legion employment the runtime role is 'legion', not its source role.
export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({error:'Sign in to search your WEAVE operating position.'},{status:401,headers:{'Cache-Control':'private, no-store'}})
  if(!isWeaveSearchRole(user.role))return NextResponse.json({error:'This position does not have a search directory.'},{status:403,headers:{'Cache-Control':'private, no-store'}})
  const query=(request.nextUrl.searchParams.get('q')||'').trim().slice(0,160)
  const results=searchWeaveActions(user.role,query)
  return NextResponse.json({
    role:user.role,
    roleName:weaveRoleName(user.role),
    query,
    count:results.length,
    indexedCount:getWeaveSearchDirectory(user.role).length,
    results,
    guidance:'Results describe existing company functions. A search result does not grant access, approve employment, make a payment, confirm delivery or guarantee earnings.',
  },{headers:{'Cache-Control':'private, no-store','Vary':'Authorization, Cookie'}})
}
