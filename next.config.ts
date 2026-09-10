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
    }
  } catch (error) {
    console.warn('Could not get git version info:', error)
    return {
      COMMIT_SHA: 'unknown',
      COMMIT_FULL: 'unknown',
      BRANCH: 'unknown',
      BUILD_TIME: new Date().toISOString(),
    }
  }
}

const versionInfo = getVersionInfo()

const config: NextConfig = {
  env: {
    NEXT_PUBLIC_COMMIT_SHA: versionInfo.COMMIT_SHA,
    NEXT_PUBLIC_COMMIT_FULL: versionInfo.COMMIT_FULL,
    NEXT_PUBLIC_BRANCH: versionInfo.BRANCH,
    NEXT_PUBLIC_BUILD_TIME: versionInfo.BUILD_TIME,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default config