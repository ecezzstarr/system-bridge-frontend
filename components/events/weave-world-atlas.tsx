'use client'

import Link from 'next/link'
import { X } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { DomainRegion, DomainTier, PublicWorldDomain } from '@/lib/weave-open-world-domains'
import './weave-world-atlas.css'

/**
 * Keep the founder-approved 1024 × 1536 image unchanged. The illustration's
 * named landmarks are orientation aids, not buildings already owned by Clients.
 * A real purchase gives its owner an independent server-verified 3D domain.
 */
const WORLD_ATLAS_ART = '/weave/open-world/weave-open-world-official.jpg'
const ATLAS_WIDTH = 1024
const ATLAS_HEIGHT = 1536

type Rectangle = readonly [x:number,y:number,width:number,height:number]
function hotspot([x,y,width,height]:Rectangle):CSSProperties {
 return {
  '--atlas-x': x/ATLAS_WIDTH*100+'%',
  '--atlas-y': y/ATLAS_HEIGHT*100+'%',
  '--atlas-w': width/ATLAS_WIDTH*100+'%',
  '--atlas-h': height/ATLAS_HEIGHT*100+'%',
 } as CSSProperties
}

// Target a named building/sign, not entire mountains or neighboring businesses.
// No hit regions overlap in the original artwork, including narrow phone layouts.
const REGIONS = {
 radiant_heights: {name:'Radiant Heights',landmark:'Northridge',rect:[84,252,224,136]},
 green_valley: {name:'Green Valley',landmark:'Verdant Keep',rect:[116,504,227,141]},
 riverlands: {name:'Riverlands',landmark:'Rivergate Marketplace',rect:[72,827,245,153]},
 ember_reach: {name:'Ember Reach',landmark:'Ember Hold · Pro',rect:[448,384,244,163]},
 starfall_ridge: {name:'Starfall Ridge',landmark:'Starfall Spire',rect:[820,578,188,165]},
 tidal_basin: {name:'Tidal Basin',landmark:'Tidemoor',rect:[778,1032,230,190]},
} satisfies Record<DomainRegion,{name:string;landmark:string;rect:Rectangle}>

export function worldRegionName(region:DomainRegion){return REGIONS[region].name}
export type WorldDomainFilter={region?:DomainRegion;tier?:DomainTier}

type AtlasProps={
 domains:PublicWorldDomain[]
 status:'loading'|'ready'|'unavailable'
 eventLabel:string
 staffHref:string
 returnHref:string
 eventHref?:string
 notice:string
 /** Owner-only data from the authenticated Client endpoint, NEVER public feed. */
 ownWorld?:{domainId:string;worldSlot:number;ownerName:string;tier:string}|null
 onFindOwnDomain?:()=>void
 onExplore:()=>void
 onDomains:(filter?:WorldDomainFilter)=>void
 onDomain:(id:string)=>void
 onCustomers:()=>void
 onCommunity:()=>void
 onGuide:()=>void
}

export function WeaveWorldAtlas({
 domains,status,eventLabel,staffHref,returnHref,eventHref='/flame-event',
 notice,ownWorld,onFindOwnDomain,onExplore,onDomains,onDomain,
 onCustomers,onCommunity,onGuide,
}:AtlasProps){
 const [artFailed,setArtFailed]=useState(false)
 const domainsByRegion=new Map<DomainRegion,PublicWorldDomain[]>()
 for(const domain of domains){
  const region=domain.location.region
  const existing=domainsByRegion.get(region)
  if(existing)existing.push(domain)
  else domainsByRegion.set(region,[domain])
 }

 return <div className="weave-atlas" data-weave-world-atlas="active">
   <div className="weave-atlas-frame">
     {notice&&<p role="status" className="weave-atlas-notice">{notice}</p>}
     <div className={artFailed?'weave-atlas-map':'weave-atlas-map weave-atlas-illustrated'}
       aria-label="World Map" data-official-illustration="unmodified">
       {!artFailed&&<img src={WORLD_ATLAS_ART} width={1024} height={1536}
         fetchPriority="high" onError={()=>setArtFailed(true)}
         alt="WEAVE Open World: mountains, distinct File Folder landmarks, Bridge of Radiance, Rivergate Marketplace, Tidemoor and Burning River."/>}
       <header className="weave-atlas-header">
         <h1 className="weave-atlas-label">Weave Open World</h1>
       </header>
       <section className="weave-atlas-landmarks" aria-label="World landmarks">
         {(Object.keys(REGIONS) as DomainRegion[]).map(region=>{
           const inRegion=domainsByRegion.get(region)||[]
           const place=REGIONS[region]
           const count=inRegion.length
           // One landmark is a type selector; all others locate regions.
           const action=region==='ember_reach'?()=>onDomains({tier:'pro'})
             :count===1?()=>onDomain(inRegion[0].domainId):()=>onDomains({region})
           return <button key={region} type="button" data-map-hotspot
             data-weave-live-region={region} style={hotspot(place.rect)}
             aria-label={place.landmark+' · '+(region==='ember_reach'?'Browse Pro File Folders':
               count===1?'Inspect '+inRegion[0].publicName:'Browse '+place.name)}
             onClick={action}>
             <span className="weave-atlas-label">{place.landmark}</span>
           </button>
         })}
         <button type="button" data-map-hotspot style={hotspot([775,232,232,163])}
           onClick={()=>onDomains({tier:'plus'})} aria-label="The Plus Citadel · Browse Plus File Folders">
           <span className="weave-atlas-label">The Plus Citadel</span>
         </button>
         <Link href="/system-switch" data-map-hotspot style={hotspot([443,665,269,137])}
           aria-label="Bridge of Radiance · System Switch Gate">
           <span className="weave-atlas-label">Bridge of Radiance · System Switch Gate</span>
         </Link>
         <Link href={eventHref} data-map-hotspot style={hotspot([712,896,240,62])}
           aria-label="Burning River · Company Loop 1">
           <span className="weave-atlas-label">Burning River · Company Loop 1</span>
         </Link>
       </section>
       <nav className="weave-atlas-entrances" aria-label="Open World entrances">
         <button type="button" data-map-hotspot style={hotspot([47,1430,286,87])}
           aria-label="Visitor Entrance · Explore live 3D WEAVE Open World" onClick={onExplore}>
           <span className="weave-atlas-label">Visitor Entrance · Explore</span>
         </button>
         <button type="button" data-map-hotspot style={hotspot([350,1430,281,87])}
           aria-label="Domains · Browse verified Client File Folders" onClick={()=>onDomains()}>
           <span className="weave-atlas-label">Domains</span>
         </button>
         <button type="button" data-map-hotspot style={hotspot([651,1430,359,87])}
           aria-label="Customer Door · Browse commissioned businesses" onClick={onCustomers}>
           <span className="weave-atlas-label">Customer Door</span>
         </button>
       </nav>
     </div>
     {/* Never pretend that a fixed illustrated landmark has been sold.
         Actual owner identity belongs to their persistent live domain. */}
     {ownWorld&&onFindOwnDomain&&<button type="button"
       className="weave-atlas-owner-entry" data-client-owned-world-control="verified-only"
       onClick={onFindOwnDomain} aria-label={'Find my owned '+ownWorld.tier+' File Folder, '+(ownWorld.ownerName||'Client')}>
       <span>My File Folder · {ownWorld.tier}</span>
       <strong>{ownWorld.ownerName||'Open my File Folder'}</strong>
       <span aria-hidden="true">View my castle ›</span>
     </button>}
     <nav className="weave-atlas-support" aria-label="Other Open World paths">
       <Link href={returnHref}>Back</Link>
       <Link href={staffHref}>Staff Entrance</Link>
       <button type="button" onClick={onCommunity}>Community</button>
       <button type="button" onClick={onGuide}>Guide</button>
     </nav>
     <p role="status" className="weave-atlas-caption">
       {status==='loading'?'Connecting to verified File Folder domains…'
         :status==='unavailable'?'Live domain feed unavailable · Open Domains to retry'
         :eventLabel+' · '+domains.length+' verified Client domains in this map area.'}
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
