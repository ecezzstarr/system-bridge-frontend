export const DISTRICT_BODY_RADIUS = 1.6
export type Presence = { x: number; z: number; yaw: number }
export type WorldObstacle = { x: number; z: number; radius: number }

// Session-local presence: never changes ownership, build state or wallet state.
export function movePresence(p: Presence, forward: number, turn: number, seconds: number, obstacles: WorldObstacle[] = []): Presence {
  const dt = Math.max(0, Math.min(.05, seconds))
  const yaw = p.yaw + Math.max(-1, Math.min(1, turn)) * dt * 2
  const distance = Math.max(-1, Math.min(1, forward)) * dt * 3
  const x = p.x - Math.sin(yaw) * distance
  const z = p.z - Math.cos(yaw) * distance
  const blocked = Math.hypot(x, z) > 9 || obstacles.some(o => Math.hypot(x-o.x,z-o.z) < o.radius + .2)
  return { x: blocked ? p.x : x, z: blocked ? p.z : z, yaw }
}

export function systemWorldPosition(index: number, total: number): [number, number, number] {
  const radius = 7.05 + (index % 2) * .42
  const angle = index / Math.max(1, total) * Math.PI * 2
  return [Math.cos(angle)*radius, 0, Math.sin(angle)*radius]
}

export function canEnter(p: Presence, position: [number, number, number]) {
  return Math.hypot(p.x-position[0],p.z-position[2]) <= 2
}
