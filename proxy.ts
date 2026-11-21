import { NextRequest, NextResponse } from 'next/server'
import { getWeaveDomainRole } from '@/lib/weave-domains'
import { getDivineShieldState } from '@/lib/weave-infrastructure'
import { getAuthUser } from '@/lib/auth-api'

/** Authentication and verified payment callbacks must remain reachable during a release.
 * Those handlers retain their own identity, permission and signature checks.
 */
function isContinuityRoute(pathname:string){
  return pathname==='/api/auth/login' ||
    pathname==='/api/client/weave-login' ||
    pathname==='/api/auth/logout' ||
    pathname==='/api/divine-shield/evacuate' ||
    pathname==='/api/deposit/paystack/webhook' ||
    pathname==='/api/auth/forgot-password' ||
    pathname==='/api/auth/reset-password' ||
    pathname.startsWith('/api/auth/callback/') ||
    pathname.startsWith('/api/auth/signin/') ||
    pathname==='/api/auth/csrf' ||
    pathname==='/api/auth/session'
}

/** Guard state-changing API requests, including Client routes that resolve
 * their own File Number token. The Shield does not revoke any session.
 * Administrative calls are authenticated against server-side role evidence.
 */
export async function proxy(request:NextRequest){
  const pathname=request.nextUrl.pathname
  if(pathname==='/'){
    const domain=getWeaveDomainRole(request.headers.get('host'))
    if(domain&&domain.role!=='main'){
      return NextResponse.redirect(new URL(domain.entryPath,request.url))
    }
    return NextResponse.next()
  }

  const unsafe=!['GET','HEAD','OPTIONS'].includes(request.method)
  if(!pathname.startsWith('/api/')||!unsafe||isContinuityRoute(pathname))return NextResponse.next()
  try{
    const shield=await getDivineShieldState()
    if(!shield.active)return NextResponse.next()
    const user=await getAuthUser(request)
    if(user?.role==='admin')return NextResponse.next()
    return NextResponse.json({
      code:'DIVINE_SHIELD_ACTIVE',
      error:'Divine Shield is raised. Your session is preserved while Administrations verifies the release.',
    },{status:423,headers:{'Cache-Control':'no-store','Retry-After':'15'}})
  }catch(error){
    console.error('[Divine Shield] mutation boundary unavailable:',error)
    return NextResponse.json({
      code:'DIVINE_SHIELD_UNAVAILABLE',
      error:'WEAVE is verifying its operating boundary. No work or payment action was accepted.',
    },{status:503,headers:{'Cache-Control':'no-store','Retry-After':'15'}})
  }
}

export const config={matcher:['/','/api/:path*']}
