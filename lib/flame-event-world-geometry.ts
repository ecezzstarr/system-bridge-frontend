/**
 * Shared physical layout for the Flame Event landing ground.
 * Coordinates are in metres. Public door identity never comes from geometry:
 * positions are assigned only to enterprises returned by the public API.
 */
export type FlameDoorPosition = { x: number; z: number }

export const FLAME_EVENT_MAX_PORTALS = 9
export const FLAME_EVENT_PLAYER_START = { x: 0, z: 10 } as const

export function flameEventDoorPositions(count: number): FlameDoorPosition[] {
  const length = Math.max(0, Math.min(FLAME_EVENT_MAX_PORTALS, Math.trunc(count)))
  const spacing = length >= 8 ? 2.9 : length >= 5 ? 3.25 : 3.7
  return Array.from({ length }, (_, index) => {
    const x = (index - (length - 1) / 2) * spacing
    return { x, z: -12.1 + 0.052 * x * x }
  })
}

/** Walkers remain on the central crossing, never in the uncollidable river. */
export function clampFlameEventPosition(x: number, z: number) {
  const cx = Math.max(-14.75, Math.min(14.75, x))
  const cz = Math.max(-15.75, Math.min(13.75, z))
  const radius = Math.hypot(cx, cz + 1)
  const scale = radius > 15.2 ? 15.2 / radius : 1
  return { x: cx * scale, z: -1 + (cz + 1) * scale }
}

export function nearestFlameEventDoor(
  x: number,
  z: number,
  doors: FlameDoorPosition[],
  range = 3.2,
): number | null {
  let nearest: number | null = null
  let distanceSquared = range * range
  doors.forEach((door, index) => {
    const next = (door.x - x) ** 2 + (door.z - z) ** 2
    if (next <= distanceSquared) {
      nearest = index
      distanceSquared = next
    }
  })
  return nearest
}
