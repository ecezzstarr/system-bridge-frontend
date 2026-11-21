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
    href: '/weave-modules/' + department + '/' + encodeURIComponent(module.slug),
    area: 'Published workshops',
  }))
  const terms = query.toLowerCase().trim().split(/\s+/)
  const visible = [...doors, ...published].filter(door => {
    const text = (door.title + ' ' + door.area + ' ' + door.href).toLowerCase()
    return isVisible(door.href) && terms.every(term => text.includes(term))
  })
  function move(direction: number) {
    const row = street.current
    if (row) row.scrollBy({ left: direction * row.clientWidth * 0.85 })
  }

  return <section className={styles.campus} data-department={department} aria-label={label + ' buildings'}>
    <header className={styles.header}>
      <div><Link href="/">Company Grounds</Link><h1>{label}</h1></div>
      <input type="search" aria-label="Find a building" placeholder="Find a building" value={query}
        onChange={event => { setQuery(event.target.value); street.current?.scrollTo({ left: 0 }) }} />
    </header>
    <nav className={styles.street} ref={street} aria-label={label + ' workshop entrances'}>
      {visible.map(door => <Link key={door.href} href={door.href} prefetch={false} className={styles.building}>
        <span aria-hidden="true" className={styles.facade} />
        <span className={styles.sign}>{door.title}</span>
        {door.access && door.access !== 'available' && <small>{door.access === 'approval' ? 'Approval required' : door.access}</small>}
      </Link>)}
    </nav>
    <footer className={styles.controls}>
      <span role="status">{visible.length ? visible.length + ' buildings' : 'No matching buildings'}</span>
      {visible.length > 1 && <div>
        <button type="button" aria-label="Previous buildings" onClick={() => move(-1)}><ChevronLeft /></button>
        <button type="button" aria-label="Next buildings" onClick={() => move(1)}><ChevronRight /></button>
      </div>}
    </footer>
  </section>
}
