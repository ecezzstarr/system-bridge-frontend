/**
 * SYSTEM REGISTRY
 * Tracks every active system connected to origin
 * Verifies all systems meet ecosystem requirements
 */

import {
  ORIGIN_SYSTEM_ID,
  SOURCE_ADMIN_ID,
  OriginSystemRecord,
  getOriginSystemById,
} from "./originTruthLedger"

export interface SystemVerification {
  isValid: boolean
  errors: string[]
  systemId?: string
}

/**
 * Verify a system is properly linked to origin
 */
export function verifyOriginLink(systemId: string): SystemVerification {
  const errors: string[] = []

  // Check if system exists
  const system = getOriginSystemById(systemId)
  if (!system) {
    errors.push("System not found in origin ledger")
    return { isValid: false, errors }
  }

  // Check required fields
  if (system.sourceAdminId !== SOURCE_ADMIN_ID) {
    errors.push("Invalid SOURCE_ADMIN_ID")
  }

  if (!system.linkedToOrigin) {
    errors.push("System not linked to origin")
  }

  if (!system.eightEnabled) {
    errors.push("EIGHT engine not enabled")
  }

  if (system.status !== "active") {
    errors.push(`System status is ${system.status}, not active`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    systemId,
  }
}

/**
 * Verify system has all required properties to connect
 */
export function validateSystemRequirements(systemConfig: {
  sourceAdminId?: string
  originSystemId?: string
  eightEnabled?: boolean
}): SystemVerification {
  const errors: string[] = []

  if (systemConfig.sourceAdminId !== SOURCE_ADMIN_ID) {
    errors.push("SOURCE_ADMIN_ID mismatch or missing")
  }

  if (systemConfig.originSystemId !== ORIGIN_SYSTEM_ID) {
    errors.push("ORIGIN_SYSTEM_ID mismatch or missing")
  }

  if (systemConfig.eightEnabled !== true) {
    errors.push("EIGHT_ENGINE_ENABLED must be true")
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Block startup if requirements not met
 */
export function requireOriginConnection(systemConfig: any): void {
  const verification = validateSystemRequirements(systemConfig)

  if (!verification.isValid) {
    const message = `[FATAL] System cannot start. Origin requirements not met:\n${verification.errors.join("\n")}`
    console.error(message)
    throw new Error(message)
  }

  console.log("[v0] System verified and linked to origin")
}

/**
 * Get registry status report
 */
export function getRegistryStatus(): {
  originSystemId: string
  sourceAdmin: string
  requirementsEnforced: boolean
} {
  return {
    originSystemId: ORIGIN_SYSTEM_ID,
    sourceAdmin: SOURCE_ADMIN_ID,
    requirementsEnforced: true,
  }
}
