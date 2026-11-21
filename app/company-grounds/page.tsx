'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { Flame } from 'lucide-react'
import { WEAVE_COMPANY } from '@/lib/company-profile'
import { useAuth } from '@/lib/auth-provider'
import styles from './grounds.module.css'

const buildings = [
  { name: 'Hope', role: 'bridger', workplace: '/bridger/dashboard', entrance: '/login', left: 0, top: 47, width: 22, height: 21 },
  { name: 'Stability', role: 'agent', workplace: '/agent/dashboard', entrance: '/login', left: 23, top: 30, width: 15, height: 16 },
  { name: 'Administrations · A Time', role: 'admin', workplace: '/admin/dashboard', entrance: '/login?portal=admin', left: 37, top: 12, width: 19, height: 13 },
  { name: 'Dream Lovely', role: 'client', workplace: '/client/dashboard', entrance: '/client/login', left: 62, top: 40, width: 18, height: 16 },
  { name: 'File Folder', role: 'client', workplace: '/client/system-switch', entrance: '/file-folder-preview', left: 68, top: 12, width: 14, height: 8 },
] as const

export default function CompanyGrounds() {
  const { user, isInitialized } = useAuth()
  const [overview, setOverview] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const [attempted, setAttempted] = useState('')
  const ownDepartment = buildings.find(building => building.role === user?.role)
  const doors = isInitialized ? buildings : []
  const eventHref = user?.role === 'client' ? '/client/event' : ['admin', 'bridger', 'agent'].includes(user?.role ?? '') ? '/event' : '/flame-event'

  function renderDoor(door: (typeof buildings)[number], panorama: boolean) {
    const appearance = panorama ? {
      style: { left: door.left+'%', top: door.top+'%', width: door.width+'%', height: door.height+'%' },
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

  const destinations = [
    { name: 'Company Managements', href: !user ? '/manager/login' : user.role === 'client' ? '/client/staff-workspace' : user.role === 'admin' ? '/admin/dashboard' : '/weave/lifestyles', left: 55, top: 22, width: 23, height: 10 },
    { name: 'Burning River', href: eventHref, left: 84, top: 18, width: 16, height: 9 },
    { name: 'Sunshine · Mechanized Wealth', href: '/weave/lifestyles/sunshine', left: 84, top: 34, width: 15, height: 12 },
    { name: 'Open Market', href: '/market', left: 85, top: 51, width: 15, height: 29 },
  ]

  return <section className={styles.grounds} aria-label="Weave Open World" data-weave-company-home="company-grounds">
    <h1 className="sr-only">Weave of Presence · Open World</h1>
    <div id="grounds-panorama" className={styles.viewport} data-overview={overview} tabIndex={0} aria-label="Company Grounds panorama. Scroll sideways to explore on a phone.">
      <div className={styles.scene}>
        <img src="/images/weave-open-world-home.jpg" width="1536" height="864" fetchPriority="high"
          alt="Aerial view of Weave Company Grounds, the departmental buildings, Client estates and Burning River." />
        {doors.map(door => renderDoor(door, true))}
        {destinations.map(({name, href, left, top, width, height}) => (
          <Link key={name} href={href} className={styles.door} aria-label={name}
            style={{left:left+'%', top:top+'%', width:width+'%', height:height+'%'}} />
        ))}
        <Link className={styles.door} style={{right:'1%',top:'1%',width:'10%',height:'8%'}}
          href={user ? ownDepartment?.workplace ?? '/dashboard' : '/login'} aria-label={user ? 'My workspace' : 'Sign in'} />
        <a className={styles.door} href="#grounds-entrances" aria-label="Scroll to explore" style={{left:'43%',bottom:0,width:'14%',height:'9%'}} />
      </div>
    </div>
    <nav id="grounds-entrances" aria-label="Company entrances" className={styles.entrances}>
      <button type="button" className={styles.zoom} aria-controls="grounds-panorama" aria-pressed={overview}
        onClick={() => setOverview(!overview)}>{overview ? 'Scroll through grounds' : 'Show entire grounds'}</button>
      {doors.map(door => renderDoor(door, false))}
      {destinations.map(({name,href}) => <Link key={name} href={href}>{name}</Link>)}
      <Link href="/login">Sign in</Link>
      <Link href="/register">Join as Agent or Bridger</Link>
      <Link href="/client/register">Client registration</Link>
      <Link href="/file-folder-preview">Explore File Folders</Link>
      <Link href="/company-overview">Company services and Reach requests</Link>
      <Link href="/download">Download the Weave app</Link>
    </nav>
    <footer className={styles.identity}>
      <span>{WEAVE_COMPANY.legalName} · RC {WEAVE_COMPANY.registrationNumber}</span>
      <Link href="/company">Company information</Link>
      <Link href="/terms">Terms</Link>
      <Link href="/privacy">Privacy</Link>
    </footer>
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
  </section>
}
