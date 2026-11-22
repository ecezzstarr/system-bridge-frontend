'use client'

import {BuildingRelief} from '@/components/world/building-relief'
import Link from 'next/link'
import { departmentNames, firstWorkshops } from '@/lib/department-buildings'
import { workshopArt } from '@/lib/workshop-art'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { weavePageCopyForPath } from '@/lib/weave-page-directory'
import { isFlameEventVisualRoute } from '@/lib/weave-visual-theme'
import { WeaveExistingPageImage } from '@/components/world/weave-existing-page-image'
import styles from './department-building-interior.module.css'

const ownWorlds = new Set(['/client', '/client/login', '/client/register', '/client/pro-verification',
  '/client/pro-activation', '/client/system-switch', '/system-switch/world', '/weave/lifestyles/legion',
  '/weave/lifestyles/pro-regional-manager/workspace'])

export function DepartmentBuildingInterior({ children }: { children: ReactNode }) {
  const path = usePathname() || '/'
  const { user } = useAuth()
  const role = user?.role
  if (!(role === 'bridger' || role === 'agent' || role === 'client' || role === 'admin') ||
      path === '/' + role + '/dashboard' || ownWorlds.has(path) || isFlameEventVisualRoute(path)) {
    return <><WeaveExistingPageImage />{children}</>
  }

  const step = Object.values(firstWorkshops).flat().find(workshop => workshop.href === path)
  const copy = weavePageCopyForPath(path)
  const name = step?.name ?? copy?.title ?? path.split('/').filter(Boolean).at(-1)?.replace(/-/g, ' ') ?? 'Workshop'
  const purpose = step?.action ?? copy?.purpose

  return <section className={styles.interior} aria-label={name + ' building'}>
    <nav className={styles.threshold} aria-label="Building location">
      <Link href={'/' + role + '/dashboard'}>{departmentNames[role]}</Link>
      <span aria-hidden="true">›</span><a href="#workshop-desk">Work desk</a>
    </nav>
    <div className={styles.workroom}>
      <figure className={styles.workshopFront}>
        <BuildingRelief className={styles.workshopView} src={workshopArt(path)} alt="" width={312} height={312} />
        <figcaption><strong>{name}</strong>{purpose && <p>{purpose}</p>}</figcaption>
      </figure>
      <div className={styles.desk} id="workshop-desk" tabIndex={-1}>
        {children}
      </div>
    </div>
    <WeaveExistingPageImage />
  </section>
}
