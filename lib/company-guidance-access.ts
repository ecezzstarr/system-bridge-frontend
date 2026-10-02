export function canAccessCompanyGuidance(role?: string | null): role is 'agent' | 'bridger' {
  return role === 'agent' || role === 'bridger'
}

export function isCompanyGuidanceRoute(route: string) {
  const pathname = route.split(/[?#]/)[0]
  return pathname === '/company-chat' || pathname.startsWith('/company-chat/')
}

export function canAccessEnvironmentRoute(route: string, role?: string | null) {
  return !isCompanyGuidanceRoute(route) || canAccessCompanyGuidance(role)
}
