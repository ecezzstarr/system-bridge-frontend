export const WEAVE_DOMAIN_ROLES = {
  'weavingsystem.online': {
    role: 'main',
    label: 'WEAVE of Presence',
    entryPath: '/',
  },
  'ssbnow.online': {
    role: 'administration',
    label: 'Administration Workshop',
    entryPath: '/login?portal=admin',
  },
  'ssbnow.shop': {
    role: 'client',
    label: 'Client Service Portal',
    entryPath: '/client',
  },
} as const

export type WeaveDomainRole = (typeof WEAVE_DOMAIN_ROLES)[keyof typeof WEAVE_DOMAIN_ROLES]['role']

export function normalizeWeaveHostname(host: string | null | undefined) {
  return String(host || '')
    .toLowerCase()
    .split(':')[0]
    .replace(/^www\./, '')
}

export function getWeaveDomainRole(host: string | null | undefined) {
  const hostname = normalizeWeaveHostname(host)
  return WEAVE_DOMAIN_ROLES[hostname as keyof typeof WEAVE_DOMAIN_ROLES] || null
}
