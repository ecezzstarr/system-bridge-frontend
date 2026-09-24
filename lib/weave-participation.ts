export const CLIENT_PLAYER_ROLE = 'client' as const

export const WEAVE_SUPPORT_ROLES = ['admin', 'agent', 'bridger'] as const

export type WeaveSupportRole = typeof WEAVE_SUPPORT_ROLES[number]
export type WeaveParticipationMode = 'player' | 'support' | 'unassigned'

/**
 * Weave gameplay has one human player position: the Client.
 * Other company/user positions support, operate, witness, verify, or extend
 * the Client's movement without becoming the Client player.
 */
export function isClientPlayerRole(role?: string | null): role is typeof CLIENT_PLAYER_ROLE {
  return role === CLIENT_PLAYER_ROLE
}

export function isWeaveSupportRole(role?: string | null): role is WeaveSupportRole {
  return !!role && WEAVE_SUPPORT_ROLES.includes(role as WeaveSupportRole)
}

export function getWeaveParticipationMode(role?: string | null): WeaveParticipationMode {
  if (isClientPlayerRole(role)) return 'player'
  if (isWeaveSupportRole(role)) return 'support'
  return 'unassigned'
}

export const WEAVE_PARTICIPATION = {
  player: {
    role: CLIENT_PLAYER_ROLE,
    principle: 'The Client is the player.',
    movement: 'The Client moves; Weave recognizes the movement and the world responds.',
  },
  support: {
    roles: WEAVE_SUPPORT_ROLES,
    principle: 'Every other company position supports Client movement.',
    movement: 'Support positions guide, operate, verify, witness, organize, and extend the Client world without taking the Client position.',
  },
} as const
