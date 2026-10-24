export type SystemSwitchRole = 'client' | 'agent' | 'bridger' | 'admin'

type RolePlace = {
  label: string
  detail: string
  href: string
  daily?: boolean
}

/**
 * Keep the Flame Event visible in the role's district. It is the arrival
 * ground, while System Switch remains a distinct, intentional crossing.
 * This compatibility function keeps existing district consumers working.
 */
export function placeThroughSystemSwitch(_role: SystemSwitchRole, place: RolePlace): RolePlace {
  return place
}
