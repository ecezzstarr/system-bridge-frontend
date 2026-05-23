/**
 * SYSTEM IDENTITY
 * Every deployment identifies itself as part of the same ecosystem
 * This is the system's passport to the origin network
 */

import { ORIGIN_SYSTEM_ID, SOURCE_ADMIN_ID } from "./originTruthLedger"

export interface SystemIdentity {
  SYSTEM_ID: string
  ORIGIN_SYSTEM_ID: string
  SYSTEM_NAME: string
  SYSTEM_ROLE: "origin" | "extension" | "arena" | "agent"
  DEPLOYMENT_TARGET: "vercel" | "cloudrun" | "local" | "playstore"
  CONNECTED_TO_ORIGIN: boolean
  SOURCE_ADMIN: string
  EIGHT_ENABLED: boolean
  createdAt: number
}

/**
 * Main system identity for SSBNOW.SHOP
 */
export const mainSystemIdentity: SystemIdentity = {
  SYSTEM_ID: ORIGIN_SYSTEM_ID,
  ORIGIN_SYSTEM_ID: ORIGIN_SYSTEM_ID,
  SYSTEM_NAME: "SSBNOW.SHOP",
  SYSTEM_ROLE: "origin",
  DEPLOYMENT_TARGET: "vercel",
  CONNECTED_TO_ORIGIN: true,
  SOURCE_ADMIN: SOURCE_ADMIN_ID,
  EIGHT_ENABLED: true,
  createdAt: Date.now(),
}

/**
 * Create identity for a new system/extension
 */
export function createSystemIdentity(
  systemName: string,
  systemRole: "extension" | "arena" | "agent",
  deploymentTarget: "vercel" | "cloudrun" | "local" | "playstore"
): SystemIdentity {
  return {
    SYSTEM_ID: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ORIGIN_SYSTEM_ID: ORIGIN_SYSTEM_ID,
    SYSTEM_NAME: systemName,
    SYSTEM_ROLE: systemRole,
    DEPLOYMENT_TARGET: deploymentTarget,
    CONNECTED_TO_ORIGIN: true,
    SOURCE_ADMIN: SOURCE_ADMIN_ID,
    EIGHT_ENABLED: true,
    createdAt: Date.now(),
  }
}

/**
 * Verify system identity is valid
 */
export function verifySystemIdentity(identity: SystemIdentity): boolean {
  return (
    identity.ORIGIN_SYSTEM_ID === ORIGIN_SYSTEM_ID &&
    identity.SOURCE_ADMIN === SOURCE_ADMIN_ID &&
    identity.CONNECTED_TO_ORIGIN === true &&
    identity.EIGHT_ENABLED === true
  )
}

/**
 * Get system identity signature for logging/verification
 */
export function getIdentitySignature(identity: SystemIdentity): string {
  return `${identity.SYSTEM_NAME}[${identity.SYSTEM_ROLE}]@${identity.DEPLOYMENT_TARGET}`
}
