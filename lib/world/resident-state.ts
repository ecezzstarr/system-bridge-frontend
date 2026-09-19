import { sql } from '@/lib/db'
import {
  CROSSING_ROLES,
  type CrossingPhase,
  type CrossingRole,
  type CrossingState,
  type PlatformRole,
  type ResidentWorldState,
  type WorldRole,
  hasCrossedIntoWeave,
} from './state'

type ResidentRow = {
  id: string
  role: string | null
  file_number: string | null
  current_pass: number | null
  unlocked_roles: string[] | null
  recognized_at: string | Date | null
}

function toPlatformRole(role: string | null): PlatformRole {
  if (role === 'admin' || role === 'agent' || role === 'bridger' || role === 'client') {
    return role
  }
  return 'user'
}

function toCrossingRoles(roles: string[] | null): CrossingRole[] {
  if (!Array.isArray(roles)) return []
  return roles.filter((role): role is CrossingRole =>
    (CROSSING_ROLES as readonly string[]).includes(role),
  )
}

function toCurrentPass(value: number | null): 0 | 1 | 2 | 3 | 4 {
  if (value === 1 || value === 2 || value === 3 || value === 4) return value
  return 0
}

function toCrossingPhase(
  currentPass: 0 | 1 | 2 | 3 | 4,
  fileNumber: string | null,
  recognizedAt: string | Date | null,
): CrossingPhase {
  if (recognizedAt) return 'weave_resident'
  if (currentPass === 4) return 'awaiting_recognition'
  if (currentPass === 3) return 'pass_3_active'
  if (currentPass === 2) return 'pass_2_active'
  if (currentPass === 1) return 'pass_1_active'
  if (fileNumber) return 'file_folder_issued'
  return 'bridge_contact'
}

/**
 * Returns the authoritative state used by both SYSTEM SWITCH and WEAVE.
 * This service is read-only: it adapts existing users and institutional
 * progress records without changing their current storage.
 */
export async function getResidentWorldState(
  residentId: string,
): Promise<ResidentWorldState | null> {
  const rows = await sql`
    SELECT
      u.id,
      u.role,
      u.file_number,
      ip.current_pass,
      ip.unlocked_roles,
      ip.recognized_at
    FROM users u
    LEFT JOIN institutional_progress ip
      ON ip.file_number = u.file_number
    WHERE u.id = ${residentId}::uuid
      AND u.is_active = true
    ORDER BY ip.updated_at DESC NULLS LAST
    LIMIT 1
  `

  const row = rows[0] as ResidentRow | undefined
  if (!row) return null

  const platformRole = toPlatformRole(row.role)
  const currentPass = toCurrentPass(row.current_pass)
  const unlockedRoles = toCrossingRoles(row.unlocked_roles)
  const crossing: CrossingState = {
    phase: toCrossingPhase(currentPass, row.file_number, row.recognized_at),
    currentPass,
    fileNumber: row.file_number,
    recognizedAt: row.recognized_at ? new Date(row.recognized_at).toISOString() : null,
    unlockedRoles,
  }

  const worldRoles = Array.from(
    new Set<WorldRole>([platformRole, ...unlockedRoles]),
  )

  return {
    residentId: row.id,
    platformRole,
    worldRoles,
    crossing,
    currentDistrict: hasCrossedIntoWeave(crossing) ? 'bridge_plaza' : null,
    visitedDistricts: [],
  }
}
