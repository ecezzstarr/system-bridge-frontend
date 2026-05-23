/**
 * ORIGIN LINK
 * Handshake between new systems and origin ledger
 * Verifies connections and grants ecosystem authority
 */

import {
  registerSystemToOrigin,
  ORIGIN_SYSTEM_ID,
  SOURCE_ADMIN_ID,
  OriginSystemRecord,
} from "./originTruthLedger"
import { verifyOriginLink as verifyOriginLinkFromRegistry } from "./systemRegistry"
import { SystemIdentity, verifySystemIdentity } from "./systemIdentity"

export interface OriginLinkResponse {
  success: boolean
  message: string
  systemId?: string
  authorized?: boolean
  authority?: OriginSystemRecord
}

/**
 * Connect a new system to the origin network
 * Flow: new deployment boots → requests origin verification → validated → registered
 */
export async function connectToOrigin(
  systemIdentity: SystemIdentity,
  sourceAdminId: string
): Promise<OriginLinkResponse> {
  // Step 1: Verify identity
  if (!verifySystemIdentity(systemIdentity)) {
    return {
      success: false,
      message: "System identity verification failed",
      authorized: false,
    }
  }

  // Step 2: Verify source admin
  if (sourceAdminId !== SOURCE_ADMIN_ID) {
    return {
      success: false,
      message: "SOURCE_ADMIN_ID verification failed - unauthorized connection attempt",
      authorized: false,
    }
  }

  // Step 3: Register to origin ledger
  try {
    const record = registerSystemToOrigin(
      systemIdentity.SYSTEM_NAME,
      systemIdentity.DEPLOYMENT_TARGET as any,
      undefined,
      undefined,
      ORIGIN_SYSTEM_ID
    )

    console.log("[v0] System successfully linked to origin:", record.id)

    return {
      success: true,
      message: `System ${systemIdentity.SYSTEM_NAME} authorized and registered to origin`,
      systemId: record.id,
      authorized: true,
      authority: record,
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to register system: ${error.message}`,
      authorized: false,
    }
  }
}

/**
 * Verify existing system is still connected to origin
 */
export function verifySystemConnection(systemId: string): OriginLinkResponse {
  const verification = verifyOriginLinkFromRegistry(systemId)

  if (!verification.isValid) {
    return {
      success: false,
      message: `System connection verification failed: ${verification.errors.join(", ")}`,
      authorized: false,
    }
  }

  return {
    success: true,
    message: "System connection verified",
    systemId,
    authorized: true,
  }
}

/**
 * Boot sequence for any system - must verify origin connection first
 */
export async function systemBootSequence(systemIdentity: SystemIdentity): Promise<{
  canBoot: boolean
  authority: OriginSystemRecord | null
  errors: string[]
}> {
  const errors: string[] = []

  // Verify identity
  if (!verifySystemIdentity(systemIdentity)) {
    errors.push("System identity verification failed")
    return { canBoot: false, authority: null, errors }
  }

  // Verify connection to origin
  const linkResponse = await connectToOrigin(systemIdentity, SOURCE_ADMIN_ID)

  if (!linkResponse.success) {
    errors.push(linkResponse.message)
    return { canBoot: false, authority: null, errors }
  }

  console.log("[v0] System boot sequence complete - granted ecosystem authority")

  return {
    canBoot: true,
    authority: linkResponse.authority || null,
    errors: [],
  }
}
