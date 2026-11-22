'use client'

import Link from 'next/link'
import { Castle, X } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { worldLocationForSlot, type DomainRegion, type DomainTier, type PublicWorldDomain } from '@/lib/weave-open-world-domains'
import './weave-world-atlas.css'

const WORLD_ATLAS_ART = '/weave/open-world/weave-open-world-official.jpg'

// The 22 November 2026 official Open World artwork is 1024 x 1536.
// Hit areas are measured on that exact image, not the superseded map. They
// remain attached to the image while resizing on small phone screens.
type Rectangle = readonly [x: number, y: number, width: number, height: number]
function hotspot([x, y, width, height]: Rectangle): CSSProperties {
  return {
    '--atlas-x': x / 1024 * 100 + '%',
    '--atlas-y': y / 1536 * 100 + '%',
    '--atlas-w': width / 1024 * 100 + '%',
    '--atlas-h': height / 1536 * 100 + '%',
  } as CSSProperties
}

const REGIONS = {
  radiant_heights: { name: 'Radiant Heights', landmark: 'Northridge', rect: [28, 175, 270, 235] },
  green_valley: { name: 'Green Valley', landmark: 'Verdant Keep', rect: [18, 448, 310, 285] },
  riverlands: { name: 'Riverlands', landmark: 'Rivergate Marketplace', rect: [8, 790, 329, 375] },
  ember_reach: { name: 'Ember Reach', landmark: 'Ember Hold', rect: [385, 270, 315, 329] },
  starfall_ridge: { name: 'Starfall Ridge', landmark: 'Starfall Spire', rect: [805, 490, 208, 337] },
  tidal_basin: { name: 'Tidal Basin', landmark: 'Tidemoor', rect: [706, 1047, 308, 290] },
} satisfies Record<DomainRegion, { name: string; landmark: string; rect: Rectangle }>

export function worldRegionName(region: DomainRegion) {
  return REGIONS[region].name
}

export type WorldDomainFilter = { region?: DomainRegion; tier?: DomainTier }

type AtlasProps = {
  domains: PublicWorldDomain[]
  status: 'loading' | 'ready' | 'unavailable'
  eventLabel: string
  staffHref: string
  returnHref: string
  notice: string
  /** Server-verified private owner identity, never part of the public world feed. */
  ownWorld?: {domainId:string;worldSlot:number;ownerName:string;tier:string}|null
  onFindOwnDomain?: () => void
  onExplore: () => void
  onDomains: (filter?: WorldDomainFilter) => void
  onDomain: (id: string) => void
  onCustomers: () => void
  onCommunity: () => void
  onGuide: () => void
}

export function WeaveWorldAtlas({
  domains, status, eventLabel, staffHref, returnHref, notice, ownWorld, onFindOwnDomain, onExplore, onDomains, onDomain, onCustomers, onCommunity, onGuide,
}: AtlasProps) {
  const map = useRef<HTMLDivElement>(null)
  const [artFailed, setArtFailed] = useState(false)
  const domainsByRegion = new Map<DomainRegion, PublicWorldDomain[]>()
  for (const domain of domains) {
    const region = domain.location.region
    const regionDomains = domainsByRegion.get(region)
    if (regionDomains) regionDomains.push(domain)
    else domainsByRegion.set(region, [domain])
  }

  // The founding illustration remains unaltered; this private nameplate is
  // live and follows the Client's server-confirmed, permanent world slot.
  const ownerRegion = ownWorld ? worldLocationForSlot(ownWorld.worldSlot).region : null

  return <div className="weave-atlas" data-weave-world-atlas="active">
    <div className="weave-atlas-frame">
      {notice && <p role="status" className="weave-atlas-notice">{notice}</p>}
      <div className={artFailed ? 'weave-atlas-map' : 'weave-atlas-map weave-atlas-illustrated'} ref={map} tabIndex={-1}>
        {!artFailed && <img src={WORLD_ATLAS_ART} width={1024} height={1536} fetchPriority="high" onError={() => setArtFailed(true)}
          alt="WEAVE Open World: mountains, verified Client File Folder landmarks, Bridge of Radiance, Rivergate Marketplace, Tidemoor and the Burning River event."/>}
        <header className="weave-atlas-header">
          <Link href={returnHref} data-map-hotspot data-atlas-utility="true"
            style={hotspot([8, 18, 120, 48])}
            aria-label={returnHref === '/system-switch' ? 'Return to System Switch Gate' : 'Return to Burning River'}>
            <span className="weave-atlas-label">Return</span>
            <span className="weave-atlas-utility-text" aria-hidden="true">‹ Back</span>
          </Link>
          <div className="weave-atlas-label">
            <p>The Company of Time</p>
            <h1>Weave Open World</h1>
          </div>
          <button type="button" data-map-hotspot data-atlas-utility="true"
            style={hotspot([893, 18, 123, 48])} onClick={onGuide}>
            <span className="weave-atlas-label">Open world guide</span>
            <span className="weave-atlas-utility-text" aria-hidden="true">Guide</span>
          </button>
        </header>
        <section className="weave-atlas-landmarks" aria-label="World landmarks">
          <Link href="/system-switch" data-map-hotspot style={hotspot([350, 650, 374, 206])}>
            <span className="weave-atlas-label">Bridge of Radiance · System Switch Gate</span>
          </Link>
          {(Object.keys(REGIONS) as DomainRegion[]).map(region => {
            const regionDomains = domainsByRegion.get(region) || []
            const count = regionDomains.length
            const place = REGIONS[region]
            const ownerHere = ownerRegion === region
            const action = ownerHere && onFindOwnDomain ? onFindOwnDomain
              : count === 1 ? () => onDomain(regionDomains[0].domainId) : () => onDomains({region})
            const label = ownerHere && ownWorld ? 'Find my File Folder · ' + (ownWorld.ownerName || place.name)
              : count === 1 ? place.landmark + ' landmark · ' + regionDomains[0].publicName
              : place.landmark + ' landmark · Browse ' + place.name
            return <button type="button" key={region} data-map-hotspot data-weave-live-region={region}
              style={hotspot(place.rect)} aria-label={label} onClick={action}>
              <span className="weave-atlas-label">{label}</span>
              {ownerHere && ownWorld && <span className="weave-atlas-owner-label" data-client-owned-map-name="verified-only">
                <strong>{ownWorld.ownerName || 'My File Folder'}</strong>
                <small>My {ownWorld.tier} File Folder · Tap to locate</small>
              </span>}
              {count > 0 && <span className="weave-atlas-live" aria-hidden="true"><Castle size={12}/> {count} live</span>}
            </button>
          })}
          <button type="button" data-map-hotspot style={hotspot([402, 365, 316, 212])} onClick={() => onDomains({tier:'pro'})}>
            <span className="weave-atlas-label">Ember Hold landmark · Browse Pro File Folders</span>
          </button>
          <button type="button" data-map-hotspot style={hotspot([729, 105, 286, 294])} onClick={() => onDomains({tier:'plus'})}>
            <span className="weave-atlas-label">The Plus Citadel landmark · Browse Plus File Folders</span>
          </button>
        </section>
        <nav className="weave-atlas-entrances" aria-label="Open World entrances">
          <Link href={staffHref} data-map-hotspot data-atlas-utility="true"
            style={hotspot([10, 129, 174, 49])}>
            <span className="weave-atlas-label">Staff Entrance</span>
            <span className="weave-atlas-utility-text" aria-hidden="true">Staff Entrance</span>
          </Link>
          <button type="button" data-map-hotspot style={hotspot([42, 1417, 290, 101])}
            onClick={onExplore} aria-label="Visitor Entrance · Explore the live 3D world">
            <span className="weave-atlas-label">Visitor Entrance · Explore</span>
          </button>
          <button type="button" data-map-hotspot style={hotspot([642, 1417, 369, 101])}
            onClick={onCustomers} aria-label="Customer Door · View commissioned businesses">
            <span className="weave-atlas-label">Customer Door</span>
          </button>
        </nav>
        <nav className="weave-atlas-tools" aria-label="Open World navigation">
          <button type="button" data-map-hotspot style={hotspot([349, 1417, 282, 101])}
            aria-label="Domains · Browse verified Client File Folders" onClick={() => onDomains()}>
            <span className="weave-atlas-label">Domains</span>
          </button>
          <button type="button" data-map-hotspot data-atlas-utility="true"
            style={hotspot([833, 131, 174, 49])} onClick={onCommunity}>
            <span className="weave-atlas-label">Community</span>
            <span className="weave-atlas-utility-text" aria-hidden="true">Community</span>
          </button>
          <span className="weave-atlas-label">World Map</span>
        </nav>
      </div>
      <p role="status" className="weave-atlas-caption">
        {status === 'loading' ? 'Connecting to verified File Folder domains…'
          : status === 'unavailable' ? 'Live domain feed unavailable · Open Domains to retry'
          : eventLabel + ' · Live badges show verified Client domains.'}
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
