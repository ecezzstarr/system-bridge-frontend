'use client'

import Link from 'next/link'
import { useRef, useState, type CSSProperties, type FocusEvent, type PointerEvent } from 'react'
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
  const dialog = useRef<HTMLDialogElement>(null)
  const [attempted, setAttempted] = useState('')
  const ownDepartment = buildings.find(building => building.role === user?.role)
  const doors = isInitialized ? buildings : []
  const eventHref = user?.role === 'client' ? '/client/event' : ['admin', 'bridger', 'agent'].includes(user?.role ?? '') ? '/event' : '/flame-event'

  function renderDoor(door: (typeof buildings)[number], panorama: boolean) {
    const appearance = panorama ? {
      style: {left:door.left+'%', top:door.top+'%', width:door.width+'%', height:door.height+'%',
        '--origin-x':(door.left+door.width/2)+'%', '--origin-y':(door.top+door.height/2)+'%'} as CSSProperties,
      onFocus: (event: FocusEvent<HTMLElement>) => aimAtDoor(event.currentTarget),
      onPointerEnter: (event: PointerEvent<HTMLElement>) => aimAtDoor(event.currentTarget),
    } : {}
    const label = panorama ? null : door.name
    if (user && user.role !== door.role) {
      return <button key={door.name} type="button" {...appearance}
        className={panorama ? styles.door+' bg-transparent' : 'min-h-11 rounded-full border border-[#a18147] px-4'}
        aria-label={'Check access to '+door.name} aria-haspopup="dialog"
        onClick={() => {
          setAttempted(door.name)
          dialog.current?.showModal()
        }}>{label}</button>
    }
    return <Link key={door.name} {...appearance} className={panorama ? styles.door : undefined}
      aria-label={'Enter '+door.name} href={user ? door.workplace : door.entrance}>{label}</Link>
  }

  return <main className={styles.grounds}>
    <header className={styles.header}>
      <h1>Company Grounds</h1>
      <Link href={eventHref} className={styles.river}><Flame aria-hidden="true" size={18}/> Burning River</Link>
    </header>
    <div className={styles.viewport} tabIndex={0} aria-label="Company panorama. Scroll sideways on a phone.">
      <div className={styles.scene}>
        <img src="/images/company-grounds-plus.webp" width="1536" height="864" alt="Hope and Stability halls, Administrations workshops, and the Dream Lovely entrance beside a Client engineering estate."/>
        {doors.map(door => renderDoor(door, true))}
        <Link className={styles.beacon} href={eventHref}><Flame size={16} aria-hidden="true"/> Flame Event</Link>
      </div>
    </div>
    <nav aria-label="Company entrances" className={styles.entrances}>
      {doors.map(door => renderDoor(door, false))}
      <Link href="/market">Customer Market</Link>
    </nav>
    <dialog ref={dialog} aria-labelledby="flame-access-title" aria-describedby="flame-access-message"
      className="fixed inset-0 m-auto w-[min(90vw,26rem)] rounded-2xl border border-[#b69a61] bg-[#fffaf0] p-6 text-[#302c23] shadow-xl backdrop:bg-black/45">
      <p className="flex items-center gap-2 text-sm text-[#805422]"><Flame size={18} aria-hidden="true"/> The Flame</p>
      <h2 id="flame-access-title" className="mt-2 font-serif text-2xl">{attempted} entrance</h2>
      <p id="flame-access-message" className="my-4">Your account does not have access to this entrance.
        {ownDepartment && ' Your department is '+ownDepartment.name+'.'}</p>
      <div className="flex flex-wrap gap-3">
        <Link className={styles.river} href={ownDepartment?.workplace ?? '/dashboard'}
          onClick={() => dialog.current?.close()}>Open {ownDepartment?.name ?? 'my workspace'}</Link>
        <button type="button" className="min-h-11 px-2 underline" onClick={() => dialog.current?.close()}>Stay on the grounds</button>
      </div>
    </dialog>
  </main>
}

function aimAtDoor(link: HTMLElement) {
  const scene = link.parentElement
  scene?.style.setProperty('--focus-x', link.style.getPropertyValue('--origin-x'))
  scene?.style.setProperty('--focus-y', link.style.getPropertyValue('--origin-y'))
}
