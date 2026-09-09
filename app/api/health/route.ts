import { NextRequest, NextResponse } from 'next/server'
import { getVersionInfo } from '@/lib/version'

/**
 * Health check endpoint
 * 
 * Returns application status and version information.
 * Used by Cloud Run health checks and monitoring systems.
 */
export async function GET(_request: NextRequest) {
  try {
    const versionInfo = getVersionInfo()
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'system-bridge-frontend',
      version: {
        app: versionInfo.appVersion,
        commit: versionInfo.commitSha,
        branch: versionInfo.branch,
        buildTime: versionInfo.buildTime,
        environment: versionInfo.isProduction ? 'production' : 'development',
      },
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    )
  }
}