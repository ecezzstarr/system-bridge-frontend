export type WeaveWorldBoundary = 'open-weave' | 'file-folder'

export function weaveWorldBoundaryForPath(pathname: string): WeaveWorldBoundary {
  const path = String(pathname || '/')
  if (path.startsWith('/client/system-switch') || path.startsWith('/system-switch')) return 'file-folder'
  return 'open-weave'
}
