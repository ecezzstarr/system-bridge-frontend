import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {configureContinuity,continuityState,continuityRequestStatus,decideContinuityRequest,
  ContinuityError,finishAdminContinuity,limitContinuityAttempt,
  rotateContinuityCodes,startContinuityRequest} from '@/lib/admin-continuity'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}

export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({error:'Sign in to your existing WEAVE account.'},{status:401,headers})
  try{return NextResponse.json(await continuityState(user.id),{headers})}
  catch{return NextResponse.json({error:'This desk is available only to Administration and appointed helpers.'},{status:403,headers})}
}

export async function POST(request:NextRequest){
  if(!request.headers.get('content-type')?.includes('application/json'))return NextResponse.json({error:'JSON required.'},{status:415,headers})
  // No cross-site cookie-authenticated configuration or recovery submissions.
  const origin=request.headers.get('origin')
  if(origin&&origin!==request.nextUrl.origin&&origin!==process.env.WEAVE_PUBLIC_ORIGIN)
    return NextResponse.json({error:'Invalid request origin.'},{status:403,headers})
  try{
    const raw=await request.text()
    if(raw.length>8192)return NextResponse.json({error:'Request too large.'},{status:413,headers})
    const body=JSON.parse(raw)
    const network=request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim().slice(0,128)||'unknown'
    await limitContinuityAttempt(network)
    const action=String(body.action||'')
    if(action==='request')return NextResponse.json(await startContinuityRequest(String(body.note||''),network),{status:202,headers})
    if(action==='status')return NextResponse.json(await continuityRequestStatus(String(body.token||'')),{headers})
    if(action==='recover')return NextResponse.json(await finishAdminContinuity({
      code:typeof body.code==='string'?body.code.trim().toLowerCase():undefined,
      token:typeof body.token==='string'?body.token:undefined,password:String(body.password||''),
    }),{headers})
    if(action==='approve'&&typeof body.helperEmail==='string')return NextResponse.json(await decideContinuityRequest(
      null,String(body.requestId||''),true,String(body.reason||''),String(body.currentPassword||''),body.helperEmail),{headers})
    const user=await getAuthUser(request)
    if(!user)return NextResponse.json({error:'Sign in to your existing WEAVE account.'},{status:401,headers})
    // Re-entering the password protects helpers and the owner from a stolen
    // unlocked session. No helper receives a recovery secret or an admin role.
    const currentPassword=String(body.currentPassword||'')
    if(action==='approve'||action==='cancel')return NextResponse.json(await decideContinuityRequest(user.id,String(body.requestId||''),action==='approve',String(body.reason||''),currentPassword),{headers})
    if(user.role!=='admin')return NextResponse.json({error:'Administration only.'},{status:403,headers})
    if(action==='helpers'){
      if(!Array.isArray(body.emails)||body.emails.some((e:unknown)=>typeof e!=='string'))throw new Error('Enter registered helper emails.')
      return NextResponse.json(await configureContinuity(user.id,body.emails,currentPassword),{headers})
    }
    if(action==='codes')return NextResponse.json({codes:await rotateContinuityCodes(user.id,currentPassword)},{headers})
    return NextResponse.json({error:'Unsupported recovery action.'},{status:400,headers})
  }catch(e){return NextResponse.json({error:e instanceof ContinuityError?e.message:'Recovery unavailable.'},{status:400,headers})}
}
