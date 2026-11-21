'use client'

import Link from 'next/link'
import { workshopArt } from '@/lib/workshop-art'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { weavePageCopyForPath } from '@/lib/weave-page-directory'
import { isFlameEventVisualRoute } from '@/lib/weave-visual-theme'
import { WeaveExistingPageImage } from '@/components/world/weave-existing-page-image'
import styles from './department-building-interior.module.css'

const mansions = { bridger: 'Hope', agent: 'Stability', client: 'Dream Lovely', admin: 'Administrations · A Time' }
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

  const prospectDesk = path === '/bridger/my-prospects'
  const name = prospectDesk ? 'My Prospects' : path === '/weave/market/prospects' ? 'Prospect Market' :
    weavePageCopyForPath(path)?.title ?? path.split('/').filter(Boolean).at(-1)?.replace(/-/g, ' ') ?? 'Workshop'

  return <section className={styles.interior} aria-label={name + ' building'}>
    <nav className={styles.threshold} aria-label="Building location">
      <Link href={'/' + role + '/dashboard'}>{mansions[role]} mansion</Link>
      <span aria-hidden="true">›</span><a href="#workshop-desk">Work desk</a>
    </nav>
    <div className={styles.workroom}>
      <figure className={styles.workshopFront}>
        <img className={styles.workshopView} src={workshopArt(path)} alt="" width={312} height={312} />
        <figcaption>{name}</figcaption>
      </figure>
      <div className={styles.desk} id="workshop-desk" tabIndex={-1}>
        {children}
      </div>
    </div>
    <WeaveExistingPageImage />
  </section>
}
