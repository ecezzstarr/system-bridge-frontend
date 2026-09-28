'use client'

import Link from 'next/link'
import { createContext,useContext,useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { EyeOff,Home } from 'lucide-react'
import { environmentRouteMatches, normalizeEnvironmentPageRoute } from '@/lib/weave-environment-registry'

import { useEnvironmentRuntimeConfig,type RuntimeSurface } from './use-environment-runtime-config'

type OrganizerContextValue={
  items:RuntimeSurface[]
  ready:boolean
  isVisible:(route:string)=>boolean
  orderFor:(route:string,fallback?:number)=>number
  refresh:()=>Promise<void>
}

const OrganizerContext=createContext<OrganizerContextValue>({
  items:[],
  ready:false,
  isVisible:()=>true,
  orderFor:(_route,fallback=1000)=>fallback,
  refresh:async()=>{},
})

export function EnvironmentOrganizerProvider({children}:{children:React.ReactNode}){
  const {items,ready,refresh}=useEnvironmentRuntimeConfig()

  const value=useMemo<OrganizerContextValue>(()=>{
    const exact=new Map(items.map(item=>[item.route,item]))
    const surfaces=new Map(items.map(item=>[normalizeEnvironmentPageRoute(item.route),item]))
    return{
      items,
      ready,
      isVisible:(route:string)=>{
        const exactItem=exact.get(route)
        if(exactItem)return exactItem.is_visible!==false
        const surface=surfaces.get(normalizeEnvironmentPageRoute(route))
          ||items.find(item=>environmentRouteMatches(item.route,route))
        return surface ? surface.is_visible!==false : true
      },
      orderFor:(route:string,fallback=1000)=>{
        const exactItem=exact.get(route)
        if(exactItem)return Number(exactItem.sort_order??fallback)
        const surface=surfaces.get(normalizeEnvironmentPageRoute(route))
          ||items.find(item=>environmentRouteMatches(item.route,route))
        return surface ? Number(surface.sort_order??fallback) : fallback
      },
      refresh,
    }
  },[items,ready,refresh])

  return <OrganizerContext.Provider value={value}>{children}</OrganizerContext.Provider>
}

export function useEnvironmentOrganizer(){
  return useContext(OrganizerContext)
}

export function EnvironmentPageGuard({children}:{children:React.ReactNode}){
  const pathname=usePathname()
  const {ready,items}=useEnvironmentOrganizer()

  if(!ready)return <>{children}</>

  const normalized=normalizeEnvironmentPageRoute(pathname)
  const surface=items.find(item=>normalizeEnvironmentPageRoute(item.route)===normalized)
    ||items.find(item=>environmentRouteMatches(item.route,pathname))
  if(!surface||surface.is_visible!==false)return <>{children}</>

  return <main className="mx-auto flex min-h-[62vh] w-full max-w-3xl items-center justify-center p-5">
    <section className="w-full rounded-[2rem] border border-amber-300/15 bg-[#050b14]/88 p-8 text-center shadow-2xl backdrop-blur-xl">
      <EyeOff className="mx-auto h-8 w-8 text-amber-300"/>
      <p className="mt-4 text-[9px] font-black uppercase tracking-[0.22em] text-amber-300">Environment surface removed</p>
      <h1 className="mt-2 text-2xl font-black text-white">{surface.label}</h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">Administration has removed this surface from the active WEAVE environment. Its source and records remain preserved so it can be restored from Environment Organizer without rebuilding the application.</p>
      <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-black text-white"><Home className="h-4 w-4"/>Return to WEAVE</Link>
    </section>
  </main>
}
