'use client'

import Link from 'next/link'
import { BookOpen, Castle, Compass, Map as MapIcon, Menu, Sprout, Users, X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import type { DomainRegion, PublicWorldDomain } from '@/lib/weave-open-world-domains'
import './weave-world-atlas.css'

export const WORLD_ATLAS_ART = '/weave/flame-event/burning-river-open-world-official.webp'

const REGIONS = {
  radiant_heights: { name: 'Radiant Heights', x: 16, y: 32 },
  green_valley: { name: 'Green Valley', x: 13, y: 54 },
  riverlands: { name: 'Riverlands', x: 41, y: 65 },
  ember_reach: { name: 'Ember Reach', x: 18, y: 82 },
  starfall_ridge: { name: 'Starfall Ridge', x: 85, y: 76 },
  tidal_basin: { name: 'Tidal Basin', x: 76, y: 93 },
} satisfies Record<DomainRegion, { name: string; x: number; y: number }>

export function worldRegionName(region: DomainRegion) {
  return REGIONS[region].name
}

type AtlasProps = {
  domains: PublicWorldDomain[]
  status: 'loading' | 'ready' | 'unavailable'
  eventLabel: string
  staffHref: string
  returnHref: string
  onExplore: () => void
  onDomains: (region?: DomainRegion) => void
  onDomain: (id: string) => void
  onCustomers: () => void
  onCommunity: () => void
  onGuide: () => void
}

export function WeaveWorldAtlas({
  domains, status, eventLabel, staffHref, returnHref, onExplore, onDomains, onDomain, onCustomers, onCommunity, onGuide,
}: AtlasProps) {
  const map = useRef<HTMLDivElement>(null)
  const domainsByRegion = new Map<DomainRegion, PublicWorldDomain[]>()
  for (const domain of domains) {
    const region = domain.location.region
    const regionDomains = domainsByRegion.get(region)
    if (regionDomains) regionDomains.push(domain)
    else domainsByRegion.set(region, [domain])
  }

  return <div className="weave-atlas" data-weave-world-atlas="active">
    <div className="weave-atlas-frame">
      <div className="weave-atlas-terrain" ref={map} tabIndex={-1}>
        <img src={WORLD_ATLAS_ART} width={941} height={1672} fetchPriority="high"
          alt="Illustrated mountain kingdoms and bridges along a river of fire and water."/>
        <header className="weave-atlas-title">
          <Link href={returnHref} className="weave-atlas-compass" aria-label={returnHref === '/system-switch' ? 'Return to System Switch Gate' : 'Return to Burning River'}>
            <Compass aria-hidden="true"/>
          </Link>
          <div>
            <p>The Company of Time</p>
            <h1>Weave Open World</h1>
            <p>{eventLabel}</p>
          </div>
          <button type="button" onClick={onGuide} aria-label="Open world guide"><Menu aria-hidden="true"/></button>
        </header>
        {(Object.keys(REGIONS) as DomainRegion[]).map(region => {
          const regionDomains = domainsByRegion.get(region)
          if (!regionDomains?.length) return null
          const count = regionDomains.length
          const place = REGIONS[region]
          const name = count === 1 ? regionDomains[0].publicName + ', ' + place.name : place.name + ', ' + count + ' verified domains'
          return <button type="button" key={region} className="weave-atlas-pin"
            data-weave-live-region={region}
            style={{ left: place.x + '%', top: place.y + '%' }}
            aria-label={name}
            onClick={() => count === 1 ? onDomain(regionDomains[0].domainId) : onDomains(region)}>
            <Castle size={15} aria-hidden="true"/> <span>{count}</span>
          </button>
        })}
      </div>
      <nav className="weave-atlas-entrances" aria-label="Open World entrances">
        <Link href={staffHref} className="weave-atlas-staff"><Users aria-hidden="true"/> <span>Staff Entrance</span></Link>
        <button type="button" className="weave-atlas-visitor" onClick={onExplore}><Compass aria-hidden="true"/> <span>Visitor Entrance</span></button>
        <button type="button" className="weave-atlas-customer" onClick={onCustomers}><Sprout aria-hidden="true"/> <span>Customer Door</span></button>
      </nav>
      <nav className="weave-atlas-tools" aria-label="Open World navigation">
        <button type="button" aria-current="true" onClick={() => {
          map.current?.scrollIntoView({ block: 'start' })
          map.current?.focus({ preventScroll: true })
        }}><MapIcon aria-hidden="true"/> World Map</button>
        <button type="button" onClick={() => onDomains()}><Castle aria-hidden="true"/> Domains</button>
        <button type="button" onClick={onExplore}><Compass aria-hidden="true"/> Explore</button>
        <button type="button" onClick={onCommunity}><Users aria-hidden="true"/> Community</button>
        <button type="button" onClick={onGuide}><BookOpen aria-hidden="true"/> Guide</button>
      </nav>
      <p role="status" className="weave-atlas-caption">
        {status === 'loading' ? 'Connecting to verified File Folder domains…'
          : status === 'unavailable' ? 'Live domain feed unavailable · Open Domains to retry'
          : 'Illustrated terrain · Numbered markers show verified File Folder domains'}
      </p>
    </div>
  </div>
}

export function WeaveWorldSheet({open, title, onClose, children}: {
  open: boolean; title: string; onClose: () => void; children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (!open) {
      if (element.open) element.close()
      return
    }
    const transit = element.closest('[data-environment-content-state]')
    if (transit?.getAttribute('data-environment-content-state') === 'forming') {
      const observer = new MutationObserver(() => {
        if (transit.getAttribute('data-environment-content-state') === 'ready' && !element.open) {
          element.showModal()
          observer.disconnect()
        }
      })
      observer.observe(transit, { attributes: true, attributeFilter: ['data-environment-content-state'] })
      return () => observer.disconnect()
    }
    if (!element.open) element.showModal()
  }, [open])

  return <dialog ref={dialog} className="weave-world-sheet" aria-labelledby="weave-world-sheet-title"
    onCancel={event => { event.preventDefault(); onClose() }}>
    <header>
      <h2 id="weave-world-sheet-title">{title}</h2>
      <button type="button" autoFocus aria-label="Close world panel" onClick={onClose}><X size={20}/></button>
    </header>
    {children}
  </dialog>
}
