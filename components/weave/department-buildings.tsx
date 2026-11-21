'use client'

import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { departmentBuildings, type DepartmentBuilding } from '@/lib/department-buildings'
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
  const street = useRef<HTMLElement>(null)
  const [query, setQuery] = useState('')
  const { label, role } = WEAVE_NATIVE_DEPARTMENTS[department]
  if (user?.role !== role) return null

  const published: DepartmentBuilding[] = modules.map(module => ({
    title: module.blueprint.title,
    href: `/weave-modules/${department}/${encodeURIComponent(module.slug)}`,
    area: 'Published workshops',
  }))
  const terms = query.toLowerCase().trim().split(/\s+/)
  const visible = [...doors, ...published].filter(door => {
    const estateTerms = role === 'client' && door.href === '/client/system-switch' ? ' my file folder estate mansion enterprise customer door' : ''
    const text = (door.title + ' ' + door.area + ' ' + door.href + estateTerms).toLowerCase()
    return isVisible(door.href) && terms.every(term => text.includes(term))
  })
  const estate = role === 'client' ? visible.find(door => door.href === '/client/system-switch') : undefined
  const workshops = visible.filter(door => door !== estate)
  const mansion = { hope: 'Hope', stability: 'Stability', 'dream-lovely': 'Dream Lovely', administrations: 'Administrations · A Time' }[department]

  function move(direction: number) {
    const row = street.current
    if (row) row.scrollBy({ left: direction * row.clientWidth * 0.85 })
  }

  return <section className={styles.campus} data-department={department} aria-label={label + ' buildings'}>
    <header className={styles.header}>
      <div><Link href="/">Company Grounds</Link><h1>{mansion} mansion</h1></div>
      <input type="search" aria-label="Find a building" placeholder="Find a building" value={query}
        onChange={event => { setQuery(event.target.value); street.current?.scrollTo({ left: 0 }) }} />
    </header>
    {estate && <Link href={estate.href} className={styles.estate} prefetch={false}>
      <strong>My File Folder estate</strong>
      <span>Enter your private grounds to build your mansion, operate your enterprise and open your Customer Door.</span>
    </Link>}
    <nav className={styles.street} ref={street} aria-label={label + ' workshop entrances'}>
      {workshops.map(door => <Link key={door.href} href={door.href} prefetch={false} className={styles.building}>
        <span aria-hidden="true" className={styles.facade} />
        <span className={styles.sign}>{door.title}</span>
        {door.access && door.access !== 'available' && <small>{door.access === 'approval' ? 'Approval required' : door.access}</small>}
      </Link>)}
    </nav>
    <footer className={styles.controls}>
      <span role="status">{visible.length ? visible.length + ' buildings' : 'No matching buildings'}</span>
      {workshops.length > 1 && <div>
        <button type="button" aria-label="Previous buildings" onClick={() => move(-1)}><ChevronLeft /></button>
        <button type="button" aria-label="Next buildings" onClick={() => move(1)}><ChevronRight /></button>
      </div>}
    </footer>
  </section>
}
