import { WEAVE_LIFESTYLE_CATALOG } from '@/lib/weave-lifestyle-catalog'
import { getWeaveSearchDirectory } from '@/lib/weave-action-search'
import { weavePageCopyForPath } from '@/lib/weave-page-directory'
import { WEAVE_NATIVE_DEPARTMENTS, type NativeDepartment } from '@/lib/weave-native-blueprint'

export type DepartmentBuilding = { title: string; href: string; area: string; access?: string }
const firstDoors: Record<NativeDepartment, string[]> = {
  hope: ['/bridger/my-prospects', '/weave/market/prospects', '/bridger/bridge-ai', '/distribution-studio'],
  stability: ['/agent/work', '/agent/distribution', '/agent/commissions'],
  'dream-lovely': ['/client/system-switch', '/client/system-store', '/client/staff-workspace'],
  administrations: ['/admin/control-center', '/admin/loop-workshop', '/admin/native-foundry'],
}
const entryOnly = /\/(dashboard|login|register|access-recovery|pro-verification)$/

export function departmentBuildings(department: NativeDepartment, pages: readonly string[]): DepartmentBuilding[] {
  const role = WEAVE_NATIVE_DEPARTMENTS[department].role
  const pageSet = new Set(pages)
  const doors = new Map<string, DepartmentBuilding>()
  for (const item of getWeaveSearchDirectory(role)) {
    const path = item.href.split(/[?#]/)[0]
    if (!pageSet.has(path) || entryOnly.test(path) || path === '/' + role) continue
    doors.set(item.href, { title: item.title, href: item.href, area: item.department, access: item.access })
  }
  for (const lifestyle of Object.values(WEAVE_LIFESTYLE_CATALOG)) {
    const roles: readonly string[] = lifestyle.roles
    if (roles.includes(role) && pageSet.has(lifestyle.route) && !doors.has(lifestyle.route)) {
      const entrance = '/weave/lifestyles#entrance-' + lifestyle.route.split('/').filter(Boolean).join('-')
      doors.set(lifestyle.route, { title: lifestyle.label, href: entrance, area: 'Lifestyle', access: 'lifestyle' })
    }
  }
  for (const path of pages) {
    if (!path.startsWith('/' + role + '/') || entryOnly.test(path) || doors.has(path)) continue
    const copy = weavePageCopyForPath(path)
    const title = copy?.title ?? path.split('/').at(-1)!.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ')
    doors.set(path, { title, href: path, area: 'Department workshops' })
  }
  const featured = firstDoors[department]
  return [...doors.values()].sort((a, b) => {
    const rank = (href: string) => featured.includes(href) ? featured.indexOf(href) : featured.length
    return rank(a.href) - rank(b.href)
  })
}
