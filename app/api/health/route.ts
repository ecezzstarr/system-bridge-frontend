import { NextResponse } from 'next/server'

import { passwordRecoveryEmailProvider } from '@/lib/password-recovery'

export async function GET() {
  try {
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV,
      releaseSha: process.env.WEAVE_RELEASE_SHA || null,
      passwordRecoveryProvider: passwordRecoveryEmailProvider(),
    })
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: 'Health check failed' },
      { status: 500 }
    )
  }
}
