'use client'
import {useState} from 'react'
import Link from 'next/link'

/**
 * The official image already contains its four entrance buttons.
 * Place real, focusable controls over the button artwork instead of
 * repeating the image's content as a second text panel.
 * Coordinates are proportional to the 941 x 1672 approved image.
 */
const hotspotBase='absolute z-10 block rounded-lg bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-amber-100 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080e1c]'
const hotspots={
 river:{left:'11%',top:'74.5%',width:'78%',height:'6.2%'},
 staff:{left:'6.2%',top:'81%',width:'28.2%',height:'6.7%'},
 visitor:{left:'36.4%',top:'81%',width:'27.7%',height:'6.7%'},
 customer:{left:'65.8%',top:'81%',width:'27.8%',height:'6.7%'},
}

export function BurningRiverOfficialGateway({
 staff=false,carrierCode=null,staffHref='/system-switch',
}:{staff?:boolean;carrierCode?:string|null;staffHref?:string}){
 const worldHref=carrierCode?'/system-switch/world?carrier='+encodeURIComponent(carrierCode):'/system-switch/world'
 const customerHref=worldHref+'#domains'
 const staffEntrance=staff?staffHref:'/login'
 const [missing,setMissing]=useState(false)
 return <section className="relative isolate overflow-hidden bg-[#080e1c] text-white"
   data-flame-official-gateway="bridge_of_radiance_flame_event_gateway.png">
   <div className="mx-auto max-w-[900px]">
     {!missing?<div className="relative w-full" data-gateway-image-hotspots="approved-artwork">
       <img src="/weave/flame-event/burning-river-crossing-official.webp"
         alt="The Company of Time. Interaction in Motion presents The Weave of Presence: System Switch — Bridge of Radiance. The Scroll of Time and Continuity, Company Loop 1, Flame Event: Burning River. Gateway with four illustrated entrances."
         width={941} height={1672} loading="eager" decoding="async"
         onError={()=>setMissing(true)}
         className="block h-auto w-full" data-flame-approved-image="true"/>
       <Link href={worldHref} className={hotspotBase} style={hotspots.river}
         aria-label="Enter Burning River" title="Enter Burning River"
         data-enter-burning-river="true" data-gateway-image-entrance="river"/>
       <Link href={staffEntrance} className={hotspotBase} style={hotspots.staff}
         aria-label={staff?'Staff entrance: cross System Switch Gate':'Staff entrance: sign in'}
         title="Staff Entrance" data-gateway-image-entrance="staff"/>
       <Link href={worldHref} className={hotspotBase} style={hotspots.visitor}
         aria-label="Visitor Entrance" title="Visitor Entrance"
         data-gateway-image-entrance="visitor"/>
       <Link href={customerHref} className={hotspotBase} style={hotspots.customer}
           aria-label="Customer Door: browse commissioned Client Customer Doors in WEAVE Open World"
           title="Customer Door" data-gateway-image-entrance="customer"/>
     </div>:
     <nav aria-label="Burning River entrances" className="grid gap-3 bg-[#0d1726] p-5 text-center text-sm font-semibold"
       data-gateway-fallback="true">
       <Link href={worldHref} data-enter-burning-river="true" className="rounded-lg border border-amber-200 p-4">Enter Burning River</Link>
       <Link href={staffEntrance} className="rounded-lg border border-amber-200/40 p-4">Staff Entrance</Link>
       <Link href={worldHref} className="rounded-lg border border-sky-200/40 p-4">Visitor Entrance</Link>
       <Link href={customerHref} className="rounded-lg border border-emerald-200/40 p-4">Customer Door</Link>
     </nav>}
   </div>
 </section>
}
