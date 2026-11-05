'use client'

import {createContext,useContext,useEffect,useMemo,useState,type CSSProperties,type ReactNode} from 'react'
import {usePathname} from 'next/navigation'
import {useAuth} from '@/lib/auth-provider'
import type {FileFolderTier} from '@/lib/file-folder-pricing'
import type {FileFolderThemeId} from '@/lib/file-folder-world-presets'
import './kingdom-theme.css'

export type KingdomIdentity={
  tier:FileFolderTier
  theme:FileFolderThemeId
  clientName:string
  businessName:string
  palette:{ground:string;structure:string;accent:string;glow:string;glass:string;sky:string}
}
type KingdomState={identity:KingdomIdentity|null;loading:boolean}
const Context=createContext<KingdomState>({identity:null,loading:false})
export function useKingdomIdentity(){return useContext(Context)}
const shared=(path:string)=>path==='/event'||path.startsWith('/event/')||
  path==='/system-switch/world'||path.startsWith('/flame-event')||
  path.includes('/flame-event')||path==='/client/loops'||path.startsWith('/client/loops/')

export function KingdomThemeFrame({children,subject,enabled=true}:{
  children:ReactNode;subject:'client'|'legion';enabled?:boolean
}){
  const {user,token,isInitialized}=useAuth()
  const pathname=usePathname()||'/'
  const authorized=Boolean(enabled&&isInitialized&&user?.id&&(
    subject==='client'?user.role==='client':user.role==='agent'||user.role==='bridger'
  ))
  const [identity,setIdentity]=useState<KingdomIdentity|null>(null)
  const [loading,setLoading]=useState(false)
  useEffect(()=>{
    if(!authorized){setIdentity(null);setLoading(false);return}
    const controller=new AbortController()
    setIdentity(null)
    setLoading(true)
    void fetch('/api/weave/kingdom-identity',{
      headers:token?{Authorization:'Bearer '+token}:{},
      cache:'no-store',signal:controller.signal,
    }).then(async response=>{
      if(!response.ok)throw Error('Kingdom identity unavailable')
      return response.json()
    }).then(data=>{if(!controller.signal.aborted)setIdentity(data.active?data.identity:null)})
      .catch(error=>{
        if(!controller.signal.aborted){
          console.error('[kingdom theme] Verified identity lookup failed',error)
          setIdentity(null)
        }
      }).finally(()=>{if(!controller.signal.aborted)setLoading(false)})
    return ()=>controller.abort()
  },[authorized,user?.id,token,subject])
  const active=authorized&&!shared(pathname)?identity:null
  const style=useMemo<CSSProperties|undefined>(()=>{
    if(!active)return undefined
    const p=active.palette
    return {
      '--kingdom-ground':p.ground,'--kingdom-structure':p.structure,
      '--kingdom-accent':p.accent,'--kingdom-glow':p.glow,
      '--kingdom-glass':p.glass,'--kingdom-sky':p.sky,
    } as CSSProperties
  },[active])
  return <Context.Provider value={{identity:active,loading}}>
    <div className="kingdom-theme-frame relative min-h-dvh" style={style}
      data-kingdom-active={active?'true':'false'}
      data-kingdom-tier={active?.tier}
      data-kingdom-theme={active?.theme}
      data-kingdom-context={subject}>
      {children}
    </div>
  </Context.Provider>
}
