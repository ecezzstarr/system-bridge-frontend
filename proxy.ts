import { NextRequest, NextResponse } from 'next/server'
import { getWeaveDomainRole } from '@/lib/weave-domains'

export function proxy(request: NextRequest) {
  const domain = getWeaveDomainRole(request.headers.get('host'))
  if (!domain) return NextResponse.next()

  const pathname = request.nextUrl.pathname
  if (pathname !== '/') return NextResponse.next()

  if (domain.role === 'main') return NextResponse.next()

  const target = new URL(domain.entryPath, request.url)
  return NextResponse.redirect(target)
}

export const config = {
  matcher: ['/'],
}
