export const CLIENT_PLAYER_ROLE = 'client' as const

export const WEAVE_SUPPORT_ROLES = ['admin', 'agent', 'bridger'] as const

export type WeaveSupportRole = typeof WEAVE_SUPPORT_ROLES[number]
export type WeaveParticipationMode = 'player' | 'support' | 'unassigned'

/**
 * In System Switch — Weave's real-life game formation — the Client is the
 * game player. Other company positions support, operate, witness, verify, or
 * extend that Client movement.
 *
 * This is an institutional/game-world position, not a platform access class.
 * Shared experiences such as Arena and Casino remain available across user
 * roles according to their own feature rules.
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
    principle: 'The Client is the game player inside System Switch.',
    movement: 'The Client moves through the real-life game; Weave recognizes the movement and the world responds.',
  },
  support: {
    roles: WEAVE_SUPPORT_ROLES,
    principle: 'Within the Client game, every other company position supports Client movement.',
    movement: 'Support positions guide, operate, verify, witness, organize, and extend the Client world without taking the Client game-player position.',
  },
} as const

// Arena and Casino are shared platform experiences. Participation there does
// not redefine a user's institutional position inside System Switch.
export const WEAVE_SHARED_EXPERIENCES = ['arena', 'casino'] as const
