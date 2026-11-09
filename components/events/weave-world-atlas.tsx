'use client'

import Link from 'next/link'
import { Castle, X } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { DomainRegion, DomainTier, PublicWorldDomain } from '@/lib/weave-open-world-domains'
import './weave-world-atlas.css'

const WORLD_ATLAS_ART = '/weave/flame-event/burning-river-open-world-official.webp'

// Positions are measured against the 864 × 1536 reference. The installed art
// has the same proportions. Hotspots stay attached to the art at every width.
type Rectangle = readonly [x: number, y: number, width: number, height: number]
function hotspot([x, y, width, height]: Rectangle): CSSProperties {
  return {
    '--atlas-x': x / 864 * 100 + '%',
    '--atlas-y': y / 1536 * 100 + '%',
    '--atlas-w': width / 864 * 100 + '%',
    '--atlas-h': height / 1536 * 100 + '%',
  } as CSSProperties
}

const REGIONS = {
  radiant_heights: { name: 'Radiant Heights', landmark: 'Northridge Folder', rect: [26, 235, 242, 185] },
  green_valley: { name: 'Green Valley', landmark: 'Verdant Keep', rect: [29, 514, 247, 200] },
  riverlands: { name: 'Riverlands', landmark: 'Rivergate', rect: [274, 655, 230, 181] },
  ember_reach: { name: 'Ember Reach', landmark: 'Ashen Bastion', rect: [35, 849, 254, 199] },
  starfall_ridge: { name: 'Starfall Ridge', landmark: 'Starfall Spire', rect: [630, 796, 232, 180] },
  tidal_basin: { name: 'Tidal Basin', landmark: 'Tidemoor', rect: [566, 995, 273, 190] },
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
  onExplore: () => void
  onDomains: (filter?: WorldDomainFilter) => void
  onDomain: (id: string) => void
  onCustomers: () => void
  onCommunity: () => void
  onGuide: () => void
}

export function WeaveWorldAtlas({
  domains, status, eventLabel, staffHref, returnHref, notice, onExplore, onDomains, onDomain, onCustomers, onCommunity, onGuide,
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

  return <div className="weave-atlas" data-weave-world-atlas="active">
    <div className="weave-atlas-frame">
      {notice && <p role="status" className="weave-atlas-notice">{notice}</p>}
      <div className={artFailed ? 'weave-atlas-map' : 'weave-atlas-map weave-atlas-illustrated'} ref={map} tabIndex={-1}>
        {!artFailed && <img src={WORLD_ATLAS_ART} width={941} height={1672} fetchPriority="high" onError={() => setArtFailed(true)}
          alt="Burning River landscape with mountain kingdoms, bridges, and a river of fire and water."/>}
        <header className="weave-atlas-header">
          <Link href={returnHref} data-map-hotspot style={hotspot([0, 0, 110, 105])}
            aria-label={returnHref === '/system-switch' ? 'Return to System Switch Gate' : 'Return to Burning River'}>
            <span className="weave-atlas-label">Return</span>
          </Link>
          <div className="weave-atlas-label">
            <p>The Company of Time</p>
            <h1>Weave Open World</h1>
          </div>
          <button type="button" data-map-hotspot style={hotspot([758, 0, 106, 110])} onClick={onGuide}>
            <span className="weave-atlas-label">Open world guide</span>
          </button>
        </header>
        <section className="weave-atlas-landmarks" aria-label="World landmarks">
          <Link href="/system-switch" data-map-hotspot style={hotspot([548, 157, 306, 180])}>
            <span className="weave-atlas-label">Bridge of Radiance · System Switch Gate</span>
          </Link>
          {(Object.keys(REGIONS) as DomainRegion[]).map(region => {
            const regionDomains = domainsByRegion.get(region) || []
            const count = regionDomains.length
            const place = REGIONS[region]
            const action = count === 1 ? () => onDomain(regionDomains[0].domainId) : () => onDomains({region})
            const label = count === 1
              ? place.landmark + ' landmark · ' + regionDomains[0].publicName
              : place.landmark + ' landmark · Browse ' + place.name
            return <button type="button" key={region} data-map-hotspot data-weave-live-region={region}
              style={hotspot(place.rect)} aria-label={label} onClick={action}>
              <span className="weave-atlas-label">{label}</span>
              {count > 0 && <span className="weave-atlas-live" aria-hidden="true"><Castle size={12}/> {count} live</span>}
            </button>
          })}
          <button type="button" data-map-hotspot style={hotspot([294, 330, 245, 190])} onClick={() => onDomains({tier:'pro'})}>
            <span className="weave-atlas-label">Ember Hold landmark · Browse Pro File Folders</span>
          </button>
          <button type="button" data-map-hotspot style={hotspot([620, 402, 240, 302])} onClick={() => onDomains({tier:'plus'})}>
            <span className="weave-atlas-label">The Plus Citadel landmark · Browse Plus File Folders</span>
          </button>
        </section>
        <nav className="weave-atlas-entrances" aria-label="Open World entrances">
          <Link href={staffHref} data-map-hotspot style={hotspot([18, 1260, 270, 115])}><span className="weave-atlas-label">Staff Entrance</span></Link>
          <button type="button" data-map-hotspot style={hotspot([296, 1260, 275, 115])} onClick={onExplore}><span className="weave-atlas-label">Visitor Entrance</span></button>
          <button type="button" data-map-hotspot style={hotspot([579, 1260, 270, 115])} onClick={onCustomers}><span className="weave-atlas-label">Customer Door</span></button>
        </nav>
        <nav className="weave-atlas-tools" aria-label="Open World navigation">
          <button type="button" data-map-hotspot style={hotspot([18, 1396, 166, 101])} aria-current="page" onClick={() => {
            map.current?.scrollIntoView({ block: 'start' })
            map.current?.focus({ preventScroll: true })
          }}><span className="weave-atlas-label">World Map</span></button>
          <button type="button" data-map-hotspot style={hotspot([184, 1396, 169, 101])} onClick={() => onDomains()}><span className="weave-atlas-label">Domains</span></button>
          <button type="button" data-map-hotspot style={hotspot([353, 1396, 167, 101])} onClick={onExplore}><span className="weave-atlas-label">Explore</span></button>
          <button type="button" data-map-hotspot style={hotspot([520, 1396, 168, 101])} onClick={onCommunity}><span className="weave-atlas-label">Community</span></button>
          <button type="button" data-map-hotspot style={hotspot([688, 1396, 161, 101])} onClick={onGuide}><span className="weave-atlas-label">Guide</span></button>
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
