'use client'

import Link from 'next/link'
import { workshopArt } from '@/lib/workshop-art'
import { useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { departmentBuildings, firstWorkshops, type DepartmentBuilding } from '@/lib/department-buildings'
import { WEAVE_NATIVE_DEPARTMENTS, type NativeDepartment } from '@/lib/weave-native-blueprint'
import { useEnvironmentOrganizer } from '@/components/world/environment-organizer-provider'
import { useDepartmentModules } from './native-department-rail'
import styles from './department-buildings.module.css'

const pages: string[] = JSON.parse(process.env.NEXT_PUBLIC_DEPARTMENT_WORK_PAGES ?? '[]')

export function DepartmentBuildings({ department }: { department: NativeDepartment }) {
  const { user } = useAuth()
  const { isVisible } = useEnvironmentOrganizer()
  const modules = useDepartmentModules(department)
  const doors = useMemo(() => departmentBuildings(department, pages), [department])
  const [query, setQuery] = useState('')
  const { label, role } = WEAVE_NATIVE_DEPARTMENTS[department]
  if (user?.role !== role) return null

  const published: DepartmentBuilding[] = modules.map(module => ({
    title: module.blueprint.title,
    href: `/weave-modules/${department}/${encodeURIComponent(module.slug)}`,
    area: 'Published workshops',
  }))
  const starters = firstWorkshops[department]
  const terms = query.toLowerCase().trim().split(/\s+/)
  const visible = [...doors, ...published].filter(door => {
    const estateTerms = role === 'client' && door.href === '/client/system-switch' ? ' my file folder estate mansion enterprise customer door' : ''
    const start = starters.find(item => item.href === door.href)
    const text = [door.title, door.area, door.href, estateTerms, start?.name, start?.action].join(' ').toLowerCase()
    return isVisible(door.href) && terms.every(term => text.includes(term))
  })
  const first = starters.flatMap(step => {
    const door = visible.find(item => item.href === step.href)
    return door ? [{ ...door, title: step.name, action: step.action }] : []
  })
  const studio = department === 'hope' ? first.find(door => door.href === '/distribution-studio') : undefined
  const route = first.filter(door => door !== studio)
  const rest = visible.filter(door => !first.some(step => step.href === door.href))
    .sort((a,b) => a.title.localeCompare(b.title) || a.href.localeCompare(b.href))
  const mansion = { hope: 'Hope', stability: 'Stability', 'dream-lovely': 'Dream Lovely', administrations: 'Administrations · A Time' }[department]

  function entrance(door: DepartmentBuilding, action?: string) {
    return <Link href={door.href} prefetch={false} className={styles.building}>
      <img className={styles.facade} src={workshopArt(door.href)} alt="" width={312} height={312} loading="lazy" />
      <span className={styles.caption}><strong>{door.title}</strong>{action && <span>{action}</span>}
        {door.access && door.access !== 'available' && <small>{door.access === 'approval' ? 'Approval required' : door.access}</small>}
      </span>
    </Link>
  }

  return <section className={styles.campus} data-department={department} aria-label={label + ' buildings'}>
    <header className={styles.header}>
      <div><Link href="/">Company Grounds</Link><h1>{mansion} mansion</h1></div>
      <input type="search" aria-label="Find a building" placeholder="Find a building" value={query}
        onChange={event => { setQuery(event.target.value) }} />
    </header>
    {route.length > 0 && <nav aria-label="Start here" className={styles.route}>
      <h2>{query.trim() ? 'Matching main buildings' : 'Start here'}</h2>
      <ol>{route.map(door => <li key={door.href}>{entrance(door, door.action)}</li>)}</ol>
    </nav>}
    {studio && <aside className={styles.studio} aria-label="Available anytime">
      <h2>Available anytime</h2>{entrance(studio, studio.action)}
    </aside>}
    {rest.length > 0 && <details key={query.trim() ? 'search' : 'browse'} open={query.trim() ? true : undefined} className={styles.directory}>
      <summary>Other workshops ({rest.length})</summary>
      <ul>{rest.map(door => <li key={door.href}>{entrance(door)}</li>)}</ul>
    </details>}
    {!visible.length && <p role="status" className={styles.empty}>No matching buildings. Try a workshop name or task.</p>}
  </section>
}
