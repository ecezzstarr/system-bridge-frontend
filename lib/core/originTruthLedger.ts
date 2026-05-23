/**
 * ORIGIN TRUTH LEDGER
 * Immutable registry of all systems ever connected to the ecosystem
 * Append-only, systems cannot remove themselves
 */

export type DeploymentType = "cloudrun" | "vercel" | "local" | "playstore"
export type SystemStatus = "active" | "paused" | "archived"

export interface OriginSystemRecord {
  id: string
  name: string
  createdAt: number
  parentSystemId?: string
  deploymentType: DeploymentType
  domain?: string
  wallet?: string
  status: SystemStatus
  linkedToOrigin: true
  sourceAdminId: string
  eightEnabled: boolean
}

// In-memory origin ledger (append-only)
const originLedger: OriginSystemRecord[] = []

// Origin constants
export const ORIGIN_SYSTEM_ID = "origin_ssbnow_shop_001"
export const SOURCE_ADMIN_ID = "ecezzstarr@gmail.com"

/**
 * Register a system to the origin ledger
 * Once registered, it cannot be removed or modified
 */
export function registerSystemToOrigin(
  systemName: string,
  deploymentType: DeploymentType,
  domain?: string,
  wallet?: string,
  parentSystemId?: string
): OriginSystemRecord {
  const record: OriginSystemRecord = {
    id: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: systemName,
    createdAt: Date.now(),
    parentSystemId,
    deploymentType,
    domain,
    wallet,
    status: "active",
    linkedToOrigin: true,
    sourceAdminId: SOURCE_ADMIN_ID,
    eightEnabled: true,
  }

  originLedger.push(record)
  console.log("[v0] System registered to origin ledger:", record.id, systemName)
  return record
}

/**
 * Get all systems in the origin ledger
 */
export function getAllOriginSystems(): OriginSystemRecord[] {
  return [...originLedger]
}

/**
 * Get a specific system by ID
 */
export function getOriginSystemById(systemId: string): OriginSystemRecord | undefined {
  return originLedger.find((s) => s.id === systemId)
}

/**
 * Get systems by parent (children of a specific origin system)
 */
export function getSystemsByParent(parentId: string): OriginSystemRecord[] {
  return originLedger.filter((s) => s.parentSystemId === parentId)
}

/**
 * Update system status (only status field can be updated)
 */
export function updateSystemStatus(systemId: string, newStatus: SystemStatus): boolean {
  const system = originLedger.find((s) => s.id === systemId)
  if (system) {
    system.status = newStatus
    console.log("[v0] System status updated:", systemId, newStatus)
    return true
  }
  return false
}

/**
 * Verify origin ledger integrity
 */
export function verifyOriginLedgerIntegrity(): boolean {
  // All systems must have sourceAdminId and linkedToOrigin
  return originLedger.every((s) => s.sourceAdminId === SOURCE_ADMIN_ID && s.linkedToOrigin === true)
}

/**
 * Initialize origin system (called on first startup)
 */
export function initializeOriginSystem() {
  if (originLedger.length === 0) {
    // Register Origin Authority (Primary System)
    registerSystemToOrigin("SSBNOW.SHOP - Origin Authority", "vercel", "ssbnow.shop", "THGBvmPt3XEb8mbSRXViA93GkW3PpCanJk")
    
    // Register Service System (Child System)
    registerSystemToOrigin("SSBNOW.ONLINE - Service System", "vercel", "ssbnow.online", "THGBvmPt3XEb8mbSRXViA93GkW3PpCanJk", ORIGIN_SYSTEM_ID)
    
    // Register Admin Workshop (Private Production Layer)
    registerSystemToOrigin("WEAVINGSYSTEM.ONLINE - Admin Workshop", "vercel", "weavingsystem.online", "THGBvmPt3XEb8mbSRXViA93GkW3PpCanJk", ORIGIN_SYSTEM_ID)
    
    console.log("[v0] Origin Truth Ledger initialized with 3 interconnected systems")
  }
}
