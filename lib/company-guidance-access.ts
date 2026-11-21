export function canAccessCompanyGuidance(role?: string | null): role is 'agent' | 'bridger' {
  return role === 'agent' || role === 'bridger'
}

export function isCompanyGuidanceRoute(route: string) {
  const pathname = route.split(/[?#]/)[0]
  return pathname === '/company-chat' || pathname.startsWith('/company-chat/')
}

export function isAgentTrainingRoute(route: string) {
  const pathname = route.split(/[?#]/)[0]
  return pathname === '/agent/outlet-training' || pathname.startsWith('/agent/outlet-training/')
}

/** A position may enter its own departmental pages, not another department's mansion.
 * Management oversight remains available through the designated shared/admin routes.
 * Client routes have their separate ClientRouteGuard and ownership checks.
 */
export function canEnterDepartmentPath(route: string, role?: string | null) {
  const pathname = route.split(/[?#]/)[0]
  const department = /^\/(agent|bridger|admin)(?:\/|$)/.exec(pathname)?.[1]
  return !department || department === role
}

export function canAccessEnvironmentRoute(route: string, role?: string | null) {
  if (isAgentTrainingRoute(route)) return role === 'agent'
  return !isCompanyGuidanceRoute(route) || canAccessCompanyGuidance(role)
}
