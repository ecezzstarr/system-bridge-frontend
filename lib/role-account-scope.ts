export type LeanAccountRole = 'agent' | 'bridger'

export type RoleAccountPlace = {
  label: string
  detail: string
  href: string
}

export const ROLE_ACCOUNT_PLACES: Record<LeanAccountRole, RoleAccountPlace[]> = {
  bridger: [
    {
      label: 'Bridge AI',
      detail: 'Open and operate Bridge AI for prospect crossing and continuity.',
      href: '/bridger/bridge-ai',
    },
    {
      label: 'Deposit & Withdrawal',
      detail: 'Move Flame Coin into or out of the Bridger account.',
      href: '/wallet/deposit-withdraw',
    },
    {
      label: 'Worldwide Number Bay',
      detail: 'Purchase and receive authenticated WhatsApp numbers.',
      href: '/bridger/numbers',
    },
    {
      label: 'Prospect Market',
      detail: 'Purchase and manage authorized Prospect packages.',
      href: '/weave/market/prospects',
    },
    {
      label: 'Echo',
      detail: 'Operate Echo as the Bridger intelligence and routing surface.',
      href: '/echo',
    },
    {
      label: 'Presences',
      detail: 'See recognized people and presences inside WEAVE.',
      href: '/profiles',
    },
  ],
  agent: [
    {
      label: 'Agility',
      detail: 'Operate Agility distribution and sales movement.',
      href: '/agility',
    },
    {
      label: 'Prospect Commissions',
      detail: 'See commission earned from Bridger Prospect purchases.',
      href: '/agent/commissions',
    },
  ],
}

const ACCOUNT_SHELL_ROUTES: Record<LeanAccountRole, string[]> = {
  bridger: ['/bridger/dashboard', '/weave', '/district/position', '/roles'],
  agent: ['/agent/dashboard', '/weave', '/district/position', '/roles'],
}

function routeMatches(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(route + '/')
}

export function isLeanAccountRole(role?: string | null): role is LeanAccountRole {
  return role === 'agent' || role === 'bridger'
}

export function isRoleAccountRouteAllowed(role: string | null | undefined, pathname: string) {
  if (!isLeanAccountRole(role)) return true

  const cleanPath = String(pathname || '/').split('?')[0].split('#')[0] || '/'
  const allowed = [
    ...ACCOUNT_SHELL_ROUTES[role],
    ...ROLE_ACCOUNT_PLACES[role].map(place => place.href),
  ]

  return allowed.some(route => routeMatches(cleanPath, route))
}

export function roleAccountHome(role: LeanAccountRole) {
  return role === 'bridger' ? '/bridger/dashboard' : '/agent/dashboard'
}
