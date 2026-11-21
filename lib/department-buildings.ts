import { WEAVE_LIFESTYLE_CATALOG } from '@/lib/weave-lifestyle-catalog'
import { getWeaveSearchDirectory } from '@/lib/weave-action-search'
import { weavePageCopyForPath } from '@/lib/weave-page-directory'
import { WEAVE_NATIVE_DEPARTMENTS, type NativeDepartment } from '@/lib/weave-native-blueprint'

export type DepartmentBuilding = { title: string; href: string; area: string; access?: string }
type FirstWorkshop = { href: string; name: string; action: string }
export const firstWorkshops: Record<NativeDepartment, FirstWorkshop[]> = {
  hope: [
    { href: '/weave/market/prospects', name: 'Prospect Market', action: 'Find a prospect to contact.' },
    { href: '/bridger/my-prospects', name: 'My Prospects', action: 'Contact your prospect, record their reply and follow up.' },
    { href: '/bridger/bridge-ai', name: 'Bridge AI', action: 'When they agree, guide them toward a Client File Folder.' },
    { href: '/distribution-studio', name: 'Social Studio', action: 'Create posts to reach new prospects or promote a Client’s business.' },
  ],
  stability: [
    { href: '/agent/outlet-training', name: 'Outlet Training', action: 'Learn how to approach a shop and explain the products.' },
    { href: '/agent/work', name: 'Agent Work', action: 'Choose a product and check how to order stock.' },
    { href: '/agent/distribution', name: 'Distribution', action: 'Supply an outlet and record the sale.' },
    { href: '/agent/commissions', name: 'Commissions', action: 'Check your recorded earnings.' },
  ],
  'dream-lovely': [
    { href: '/client/system-switch', name: 'My File Folder estate', action: 'Enter your private grounds to build your mansion, operate your enterprise and open your Customer Door.' },
    { href: '/market', name: 'Open Market', action: 'See the published Customer Doors as customers see them.' },
  ],
  administrations: [
    { href: '/admin/control-center', name: 'Control Center', action: 'Review the work that needs an administrator.' },
    { href: '/admin/orders', name: 'Orders and Payments', action: 'Inspect order alerts and payment exceptions.' },
    { href: '/admin/loop-workshop', name: 'Loop Workshop', action: 'Manage the company’s events and department responsibilities.' },
  ],
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
  return [...doors.values()]
}
