import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple middleware - Cloud Run backend handles authentication via Clerk
// This middleware just passes requests through

export function middleware(request: NextRequest) {
  // Allow all requests - authentication is handled by Cloud Run backend
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
}
