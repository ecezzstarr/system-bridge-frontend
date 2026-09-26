'use client'

import Link from 'next/link'
import { createContext,useCallback,useContext,useEffect,useMemo,useState } from 'react'
import { usePathname } from 'next/navigation'
import { EyeOff,Home } from 'lucide-react'
import { normalizeEnvironmentPageRoute } from '@/lib/weave-environment-registry'

type RuntimeSurface={
  surface_key:string
  label:string
  surface_kind:'page'|'card'
  route:string
  area:string
  scope:string
  is_visible:boolean
  sort_order:number
  is_protected:boolean
}

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
  const [items,setItems]=useState<RuntimeSurface[]>([])
  const [ready,setReady]=useState(false)

  const refresh=useCallback(async()=>{
    try{
      const response=await fetch('/api/environment-organizer',{cache:'no-store'})
      const body=await response.json()
      if(response.ok&&body.success&&Array.isArray(body.items))setItems(body.items)
    }catch{
      // A runtime registry failure must not make WEAVE navigation disappear.
    }finally{
      setReady(true)
    }
  },[])

  useEffect(()=>{
    void refresh()
    const interval=window.setInterval(()=>void refresh(),30000)
    const focus=()=>void refresh()
    const requested=()=>void refresh()
    window.addEventListener('focus',focus)
    window.addEventListener('weave-environment-refresh',requested)
    return()=>{
      window.clearInterval(interval)
      window.removeEventListener('focus',focus)
      window.removeEventListener('weave-environment-refresh',requested)
    }
  },[refresh])

  const value=useMemo<OrganizerContextValue>(()=>{
    const exact=new Map(items.map(item=>[item.route,item]))
    const pages=new Map(items.filter(item=>item.surface_kind==='page').map(item=>[normalizeEnvironmentPageRoute(item.route),item]))
    return{
      items,
      ready,
      isVisible:(route:string)=>{
        const exactItem=exact.get(route)
        if(exactItem)return exactItem.is_visible!==false
        const page=pages.get(normalizeEnvironmentPageRoute(route))
        return page ? page.is_visible!==false : true
      },
      orderFor:(route:string,fallback=1000)=>{
        const exactItem=exact.get(route)
        if(exactItem)return Number(exactItem.sort_order??fallback)
        const page=pages.get(normalizeEnvironmentPageRoute(route))
        return page ? Number(page.sort_order??fallback) : fallback
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
  const surface=items.find(item=>item.surface_kind==='page'&&normalizeEnvironmentPageRoute(item.route)===normalized)
  if(!surface||surface.is_visible!==false)return <>{children}</>

  return <main className="mx-auto flex min-h-[62vh] w-full max-w-3xl items-center justify-center p-5">
    <section className="w-full rounded-[2rem] border border-amber-300/15 bg-[#050b14]/88 p-8 text-center shadow-2xl backdrop-blur-xl">
      <EyeOff className="mx-auto h-8 w-8 text-amber-300"/>
      <p className="mt-4 text-[9px] font-black uppercase tracking-[0.22em] text-amber-300">Environment withdrawn</p>
      <h1 className="mt-2 text-2xl font-black text-white">{surface.label}</h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">Administration has removed this surface from the active WEAVE environment. Its source and records remain preserved so it can be restored without rebuilding the application.</p>
      <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-black text-white"><Home className="h-4 w-4"/>Return to WEAVE</Link>
    </section>
  </main>
}
