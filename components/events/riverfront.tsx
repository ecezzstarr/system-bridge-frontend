'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { EventRole } from '@/lib/weave-event'
import styles from './riverfront.module.css'

const halls = {
  bridger: { name: 'Hope', work: 'Bridgers reach new prospects through Social Studio and Prospect Market. With consent, Bridge AI helps a prospect explore a File Folder. Once employed, a Bridger amplifies the Client’s business and directs buyers to their Customer Door.' },
  client: { name: 'Dream Lovely', work: 'The Client owns the File Folder and decides what to build. From the estate, the owner can employ Bridgers and skilled Agents as Legions and open a Customer Door to the market.' },
  agent: { name: 'Stability', work: 'Skilled Agents turn a Client’s design into a product, fulfil customer orders and distribute the finished work. What they learn from customers returns to the owner.' },
  admin: { name: 'Administrations', work: 'A Time brings people together through events and workshops. Administrations reviews verified activity so the owner can see what sold, where costs arose and what to improve in the next movement.' },
} satisfies Record<EventRole, {name:string; work:string}>

const positions: EventRole[] = ['bridger', 'client', 'agent', 'admin']

export function Riverfront({role, children}:{role?:EventRole; children:ReactNode}) {
  const [choice, setChoice] = useState<EventRole | null>(null)
  const selected = choice ?? role ?? 'bridger'
  const viewport = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const view = viewport.current
    const building = view?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
    if (view && building) view.scrollLeft = building.offsetLeft - (view.clientWidth - building.offsetWidth) / 2
  }, [selected])
  return <section className={styles.riverfront} aria-label="Burning River event grounds">
    <header className={styles.heading}>
      <p>Flame Event · Company Loop 1</p>
      <h1>Burning River</h1>
      <span>Hosted by Sunshine: Mechanized Wealth</span>
    </header>
    <div ref={viewport} className={styles.viewport}>
      <div className={styles.bank} role="group" aria-label="Explore the four department halls">
        <img src="/weave/flame-event/burning-river-riverfront.webp" width="1600" height="533"
          alt="A Bridger films a maker, a Client welcomes a customer, an Agent prepares an order, and Administrations hosts a workshop along one riverbank."/>
        {positions.map(position => <button type="button" key={position} aria-pressed={selected === position}
          onClick={() => setChoice(position)}><span>{halls[position].name}</span></button>)}
      </div>
    </div>
    <div className={styles.detail}>
      <div aria-live="polite" aria-atomic="true">
        <h2>{halls[selected].name}</h2>
        <p>{halls[selected].work}</p>
        {selected==='bridger' && <p><strong>Individual event target</strong> · 70,000 USDT in verified File Folder sales across all tiers.</p>}
        {role && selected!==role && <p className={styles.guidance}>The Flame · Access to this hall is reserved for its department. Your entrance is {halls[role].name}.</p>}
      </div>
      {children}
    </div>
  </section>
}
