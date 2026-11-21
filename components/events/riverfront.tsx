'use client'

import type { ReactNode } from 'react'
import { RiverPanorama } from './river-panorama'
import type { EventRole } from '@/lib/weave-event'
import styles from './riverfront.module.css'

const halls = {
  bridger: { name: 'Hope', work: 'Bridgers reach new prospects through Social Studio and Prospect Market. With consent, Bridge AI helps a prospect explore a File Folder. Once employed, a Bridger amplifies the Client’s business and directs buyers to their Customer Door.' },
  client: { name: 'Dream Lovely', work: 'The Client owns the File Folder and decides what to build. From the estate, the owner can employ Bridgers and skilled Agents as Legions and open a Customer Door to the market.' },
  agent: { name: 'Stability', work: 'Skilled Agents turn a Client’s design into a product, fulfil customer orders and distribute the finished work. What they learn from customers returns to the owner.' },
  admin: { name: 'Administrations', work: 'A Time brings people together through events and workshops. Administrations reviews verified activity so the owner can see what sold, where costs arose and what to improve in the next movement.' },
} satisfies Record<EventRole, {name:string; work:string}>

export function Riverfront({role, children}:{role?:EventRole; children:ReactNode}) {
  return <section className={styles.riverfront} aria-label="Burning River event grounds">
    <header className={styles.heading}>
      <p>Flame Event · Company Loop 1</p>
      <h1>Burning River</h1>
      <span>Hosted by Sunshine: Mechanized Wealth</span>
    </header>
    <RiverPanorama />
    <div className={styles.detail}>
      {role && <div>
        <h2>{halls[role].name}</h2>
        <p>{halls[role].work}</p>
        {role === 'bridger' && <p><strong>Individual event target</strong> · 70,000 USDT in verified File Folder sales across all tiers.</p>}
      </div>}
      {children}
    </div>
  </section>
}
