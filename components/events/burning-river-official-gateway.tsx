'use client'
import {useState} from 'react'
import Link from 'next/link'
import {ArrowRight,Castle,Compass,DoorOpen,ShieldCheck,Users} from 'lucide-react'

/**
 * The approved Burning River crossing artwork is a visual identity reference,
 * never a substitute for clickable DOM controls or the live shared world map.
 * Official gateway source: bridge_of_radiance_flame_event_gateway.png.
 * Its image must be imported from the approved source at the target path;
 * the fallback is clearly marked rather than silently substituting new art.
 */
export function BurningRiverOfficialGateway({staff=false,carrierCode=null,staffHref='/system-switch'}:{staff?:boolean;carrierCode?:string|null;staffHref?:string}){
 const worldHref=carrierCode?'/flame-event/world?carrier='+encodeURIComponent(carrierCode):'/flame-event/world'
 const customerHref=worldHref+'#domains'
 const [missing,setMissing]=useState(false)
 return <section className="relative isolate overflow-hidden bg-[#080e1c] text-white"
   data-flame-official-gateway="bridge_of_radiance_flame_event_gateway.png">
   <div className="mx-auto max-w-5xl">
     <div className="relative mx-auto w-full max-w-[900px]">
       {!missing?<img src="/weave/flame-event/burning-river-crossing-official.webp"
         alt="Official Burning River gateway: The Company of Time, Interaction in Motion presents, The Weave of Presence: System Switch — Bridge of Radiance, The Scroll of Time and Continuity, a river of fire and water, radiant bridge and Company Loop 1"
         width={941} height={1672} loading="eager" decoding="async"
         onError={()=>setMissing(true)}
         className="h-auto w-full" data-flame-approved-image="true"/>:
       <div className="relative flex min-h-[500px] flex-col justify-center bg-cover bg-center px-6 py-16 text-center"
          style={{backgroundImage:"linear-gradient(rgba(3,12,24,.25),rgba(3,12,24,.7)),url('/weave/flame-event/burning-river-world.svg')"}}>
          <p className="text-sm font-bold tracking-[.18em] text-amber-100">The Company of Time</p>
          <p className="mt-2 text-xs uppercase tracking-[.17em]">Interaction in Motion presents</p>
          <h1 className="mt-8 font-serif text-3xl font-bold text-amber-100">The Weave of Presence</h1>
          <p className="mt-2 text-sm tracking-wide">System Switch — Bridge of Radiance</p>
          <h2 className="mt-10 font-serif text-4xl font-bold text-amber-200">The Scroll of Time and Continuity</h2>
          <p className="mt-10 text-sm">Book One · Company Loop 1</p>
          <p className="mt-2 font-serif text-xl font-bold text-amber-100">Flame Event: Burning River</p>
          <p className="mt-2 text-sm">October 1 – December 31, 2026</p>
          <p className="mt-6 text-xs text-amber-200">Approved visual asset awaiting installation</p>
       </div>}
     </div>
     <div className="relative mx-auto max-w-[900px] space-y-3 border-t border-amber-300/40 bg-[#0d1726] p-4 sm:p-6"
       data-gateway-working-entrances="true">
       <p className="text-center text-xs font-semibold uppercase tracking-[.19em] text-amber-200">
         System Switch · The Crossing
       </p>
       <h3 className="text-center font-serif text-2xl font-semibold text-amber-100">Enter the Living Company World</h3>
       <p className="mx-auto max-w-xl text-center text-sm leading-6 text-sky-100/80">
         One world for Agents, Bridgers, Administration, Clients, visitors and customers.
         File Folder castles develop through real systems and business participation.
         No private Client workspaces are exposed.
       </p>
       <Link href={worldHref} className="flex min-h-14 items-center justify-center gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-[#61321d] via-[#bf852a] to-[#533320] px-4 py-4 font-serif text-lg font-bold tracking-wide text-white shadow-[0_0_28px_rgba(244,160,45,.15)]"
         data-enter-burning-river="true">
         <Castle className="h-5 w-5"/> Enter Burning River <ArrowRight className="h-5 w-5"/>
       </Link>
       <nav aria-label="Flame Event entrance types" className="grid gap-2 sm:grid-cols-3">
         <Link href={staff ? staffHref : '/login'}
           className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-orange-300/50 bg-orange-800/35 p-3 text-sm font-bold text-orange-100">
           <Users className="h-5 w-5"/> {staff ? 'Cross System Switch' : 'Staff Login'}
         </Link>
         <Link href={worldHref}
           className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-sky-300/50 bg-sky-900/45 p-3 text-sm font-bold text-sky-100">
           <Compass className="h-5 w-5"/> Visitor Entrance
         </Link>
         <Link href={customerHref}
           className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-300/50 bg-emerald-900/35 p-3 text-sm font-bold text-emerald-100">
           <DoorOpen className="h-5 w-5"/> Customer Door
         </Link>
       </nav>
       <p className="flex items-start justify-center gap-2 text-center text-xs leading-5 text-sky-100/70">
         <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-200"/> Open world entry never grants another Client's private File Folder access.
       </p>
     </div>
   </div>
 </section>
}
