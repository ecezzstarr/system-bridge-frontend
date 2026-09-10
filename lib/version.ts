/**
 * Version and Build Information Utility
 * 
 * Provides access to build-time version information including
 * commit SHA, branch, and build timestamp.
 */

export interface VersionInfo {
  appVersion: string
  commitSha: string
  commitFull: string
  branch: string
  buildTime: string
  isProduction: boolean
}

/**
 * Get version information for the current build
 */
export function getVersionInfo(): VersionInfo {
  return {
    appVersion: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
    commitSha: process.env.NEXT_PUBLIC_COMMIT_SHA || 'unknown',
    commitFull: process.env.NEXT_PUBLIC_COMMIT_FULL || 'unknown',
    branch: process.env.NEXT_PUBLIC_BRANCH || 'unknown',
    buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || 'unknown',
    isProduction: process.env.NODE_ENV === 'production',
  }
}

/**
 * Get a formatted version string for display
 */
export function getFormattedVersion(): string {
  const info = getVersionInfo()
  return `v${info.appVersion} (${info.commitSha})`
}

/**
 * Get detailed version information for debugging
 */
export function getDetailedVersionInfo(): string {
  const info = getVersionInfo()
  return `
Application Version: ${info.appVersion}
Commit (Short):      ${info.commitSha}
Commit (Full):       ${info.commitFull}
Branch:              ${info.branch}
Build Time:          ${info.buildTime}
Environment:         ${info.isProduction ? 'production' : 'development'}
  `.trim()
}