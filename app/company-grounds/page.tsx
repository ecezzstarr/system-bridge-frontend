'use client'

import Link from 'next/link'
import type { CSSProperties } from 'react'
import { Flame } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import styles from './grounds.module.css'

const buildings = [
  { name: 'Hope', role: 'bridger', workplace: '/bridger/dashboard', entrance: '/login', left: 1, top: 20, width: 17, height: 47 },
  { name: 'Stability', role: 'agent', workplace: '/agent/dashboard', entrance: '/login', left: 21, top: 28, width: 14, height: 35 },
  { name: 'Administrations', role: 'admin', workplace: '/admin/dashboard', entrance: '/login?portal=admin', left: 36, top: 11, width: 17, height: 45 },
  { name: 'Dream Lovely', role: 'client', workplace: '/client/dashboard', entrance: '/client/login', left: 54, top: 30, width: 12, height: 32 },
  { name: 'File Folder', role: 'client', workplace: '/client/system-switch', entrance: '/file-folder-preview', left: 72, top: 12, width: 27, height: 75 },
] as const

export default function CompanyGrounds() {
  const { user, isInitialized } = useAuth()
  const doors = buildings.filter(building => isInitialized && (!user || user.role === building.role))
  const eventHref = user?.role === 'client' ? '/client/event' : ['admin', 'bridger', 'agent'].includes(user?.role ?? '') ? '/event' : '/flame-event'

  return <main className={styles.grounds}>
    <header className={styles.header}>
      <h1>Company Grounds</h1>
      <Link href={eventHref} className={styles.river}><Flame aria-hidden="true" size={18}/> Burning River</Link>
    </header>
    <div className={styles.viewport} tabIndex={0} aria-label="Company panorama. Scroll sideways on a phone.">
      <div className={styles.scene}>
        <img src="/images/company-grounds-plus.webp" width="1536" height="864" alt="Hope and Stability halls, Administrations workshops, and the Dream Lovely entrance beside a Client engineering estate."/>
        {doors.map(door => <Link key={door.name} className={styles.door}
          href={user ? door.workplace : door.entrance} aria-label={'Enter ' + door.name}
          style={{left:door.left+'%', top:door.top+'%', width:door.width+'%', height:door.height+'%',
            '--origin-x':(door.left+door.width/2)+'%', '--origin-y':(door.top+door.height/2)+'%'} as CSSProperties}
          onFocus={event => aimAtDoor(event.currentTarget)}
          onPointerEnter={event => aimAtDoor(event.currentTarget)} />)}
        <Link className={styles.beacon} href={eventHref}><Flame size={16} aria-hidden="true"/> Flame Event</Link>
      </div>
    </div>
    <nav aria-label="Company entrances" className={styles.entrances}>
      {doors.map(door => <Link key={door.name} href={user ? door.workplace : door.entrance}>{door.name}</Link>)}
      <Link href="/market">Customer Market</Link>
    </nav>
  </main>
}

function aimAtDoor(link: HTMLAnchorElement) {
  const scene = link.parentElement
  scene?.style.setProperty('--focus-x', link.style.getPropertyValue('--origin-x'))
  scene?.style.setProperty('--focus-y', link.style.getPropertyValue('--origin-y'))
}
