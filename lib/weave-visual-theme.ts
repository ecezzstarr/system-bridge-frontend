/** Company-wide visual identity is independent of File Folder ownership/tier. */
export const FLAME_EVENT_VISUAL_ROUTES = [
  '/event',
  '/flame-event',
  '/client/event',
  '/admin/flame-event',
  '/system-switch/flame-event',
  '/client/system-switch/flame-event',
] as const

export function isFlameEventVisualRoute(pathname: string): boolean {
  const path = (pathname || '/').split('?')[0].replace(/\/+$/, '') || '/'
  return FLAME_EVENT_VISUAL_ROUTES.some(route => path === route || path.startsWith(route + '/'))
}

export function weaveVisualThemeForPath(pathname: string): 'plus-white-gold' | 'flame-event-original' {
  return isFlameEventVisualRoute(pathname) ? 'flame-event-original' : 'plus-white-gold'
}
