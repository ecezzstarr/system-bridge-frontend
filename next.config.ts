import type { NextConfig } from 'next'
import { execSync } from 'child_process'

/**
 * Get version information for the build
 */
function getVersionInfo() {
  try {
    const commitSha = execSync('git rev-parse --short HEAD').toString().trim()
    const commitFull = execSync('git rev-parse HEAD').toString().trim()
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
    const buildTime = new Date().toISOString()

    return {
      COMMIT_SHA: commitSha,
      COMMIT_FULL: commitFull,
      BRANCH: branch,
      BUILD_TIME: buildTime,
      APP_VERSION: process.env.npm_package_version || '0.1.0',
    }
  } catch (error) {
    console.warn('Could not get git version info:', error)
    return {
      COMMIT_SHA: 'unknown',
      COMMIT_FULL: 'unknown',
      BRANCH: 'unknown',
      BUILD_TIME: new Date().toISOString(),
      APP_VERSION: process.env.npm_package_version || '0.1.0',
    }
  }
}

const versionInfo = getVersionInfo()

const config: NextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_COMMIT_SHA: versionInfo.COMMIT_SHA,
    NEXT_PUBLIC_COMMIT_FULL: versionInfo.COMMIT_FULL,
    NEXT_PUBLIC_BRANCH: versionInfo.BRANCH,
    NEXT_PUBLIC_BUILD_TIME: versionInfo.BUILD_TIME,
    NEXT_PUBLIC_APP_VERSION: versionInfo.APP_VERSION,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
          },
        ],
      },
    ]
  },
}

export default config