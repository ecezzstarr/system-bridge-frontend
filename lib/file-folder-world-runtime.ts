export const DISTRICT_BODY_RADIUS = 1.6
export type Presence = { x: number; z: number; yaw: number }
export type WorldObstacle = { x: number; z: number; radius: number }

// Session-local presence: never changes ownership, build state or wallet state.
export function movePresence(p: Presence, forward: number, turn: number, seconds: number, obstacles: WorldObstacle[] = [], strafe = 0): Presence {
  const dt = Math.max(0, Math.min(.05, seconds))
  const yaw = p.yaw + Math.max(-1, Math.min(1, turn)) * dt * 2
  const distance = Math.max(-1, Math.min(1, forward)) * dt * 3
  const lateral = Math.max(-1, Math.min(1, strafe)) * dt * 3
  const x = p.x - Math.sin(yaw) * distance + Math.cos(yaw) * lateral
  const z = p.z - Math.cos(yaw) * distance + Math.sin(yaw) * lateral
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

/**
 * One authoritative visual progress function for both 3D construction and the
 * touch build console. Purchased acceleration changes the stored completion
 * date; the two surfaces must never show different construction percentages.
 */
export function buildFormationProgress(build: {
  started_at?: string | number | Date | null;
  created_at?: string | number | Date | null;
  completes_at?: string | number | Date | null;
}, now: number): number {
  const started = new Date(build.started_at || build.created_at || now).getTime()
  const completed = new Date(build.completes_at || now).getTime()
  if (!Number.isFinite(started) || !Number.isFinite(completed)) return 0
  if (completed <= started) return now >= completed ? 100 : 0
  return Math.max(0, Math.min(100, ((now - started) / (completed - started)) * 100))
}
