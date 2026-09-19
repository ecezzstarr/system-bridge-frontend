export const CROSSING_ROLES = [
  'bridge_ai',
  'bridger',
  'attorney',
  'mandate',
  'forensic',
  'administration',
] as const

export type CrossingRole = (typeof CROSSING_ROLES)[number]

export const PLATFORM_ROLES = [
  'admin',
  'agent',
  'bridger',
  'client',
  'user',
] as const

export type PlatformRole = (typeof PLATFORM_ROLES)[number]
export type WorldRole = CrossingRole | PlatformRole

export const WEAVE_DISTRICTS = [
  'bridge_plaza',
  'market',
  'arena',
  'business',
  'knowledge_library',
  'administration_hall',
  'client_spaces',
  'bridger_spaces',
  'agent_spaces',
] as const

export type WeaveDistrict = (typeof WEAVE_DISTRICTS)[number]

export type CrossingPhase =
  | 'bridge_contact'
  | 'file_folder_issued'
  | 'pass_1_active'
  | 'pass_2_active'
  | 'pass_3_active'
  | 'awaiting_recognition'
  | 'recognized'
  | 'weave_resident'

export interface CrossingState {
  phase: CrossingPhase
  currentPass: 0 | 1 | 2 | 3 | 4
  fileNumber: string | null
  recognizedAt: string | null
  unlockedRoles: CrossingRole[]
}

export interface ResidentWorldState {
  residentId: string
  platformRole: PlatformRole
  worldRoles: WorldRole[]
  crossing: CrossingState
  currentDistrict: WeaveDistrict | null
  visitedDistricts: WeaveDistrict[]
}

export function hasCrossedIntoWeave(state: CrossingState): boolean {
  return state.phase === 'recognized' || state.phase === 'weave_resident'
}

export function canEnterDistrict(
  state: ResidentWorldState,
  district: WeaveDistrict,
): boolean {
  if (!hasCrossedIntoWeave(state.crossing)) return false

  if (district === 'administration_hall') {
    return state.worldRoles.includes('admin')
      || state.worldRoles.includes('administration')
  }

  if (district === 'bridger_spaces') {
    return state.worldRoles.includes('bridger')
  }

  if (district === 'agent_spaces') {
    return state.worldRoles.includes('agent')
  }

  if (district === 'client_spaces') {
    return state.worldRoles.includes('client')
  }

  return true
}
