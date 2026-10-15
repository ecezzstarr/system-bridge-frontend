export type SystemSwitchRole = 'client' | 'agent' | 'bridger' | 'admin'

type RolePlace = {
  label: string
  detail: string
  href: string
  daily?: boolean
}

export function placeThroughSystemSwitch(role: SystemSwitchRole, place: RolePlace): RolePlace {
  if (place.href !== '/event' && place.href !== '/client/event') return place

  return {
    ...place,
    label: 'System Switch',
    href: role === 'client' ? '/client/system-switch' : '/system-switch',
    detail: 'Cross the System Switch gate into the File Folder. Flame Event is inside the File Folder after the crossing.',
  }
}
