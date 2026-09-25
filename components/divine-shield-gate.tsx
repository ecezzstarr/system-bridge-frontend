'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { WeaveLogo } from '@/components/weave-logo'

type ShieldState={
  checked:boolean
  active:boolean
  administrationBypass:boolean
  title:string
  message:string
}

const DEFAULT_STATE:ShieldState={
  checked:false,
  active:false,
  administrationBypass:false,
  title:'WEAVE is under maintenance',
  message:'The system is being refined. Participation will reopen when Administration releases the Divine Shield.',
}

export function DivineShieldGate({children}:{children:ReactNode}){
  const {token,isInitialized,logout}=useAuth()
  const pathname=usePathname() || '/'
  const [state,setState]=useState<ShieldState>(DEFAULT_STATE)
  const [adminEntrance,setAdminEntrance]=useState(false)
  const timerRef=useRef<number|null>(null)
  const evacuatedTokenRef=useRef<string|null>(null)

  useEffect(()=>{
    if(typeof window==='undefined') return
    const params=new URLSearchParams(window.location.search)
    setAdminEntrance(pathname==='/login' && params.get('administration')==='1')
  },[pathname])

  useEffect(()=>{
    if(!isInitialized) return
    let alive=true

    const load=async()=>{
      try{
        const response=await fetch('/api/divine-shield/status',{
          cache:'no-store',
          headers:token?{Authorization:`Bearer ${token}`}:{},
        })
        const body=await response.json()
        if(!alive) return

        const active=Boolean(body?.active)
        const administrationBypass=Boolean(body?.administrationBypass)
        const sessionValid=body?.sessionValid!==false

        if(!active && token && !sessionValid){
          evacuatedTokenRef.current=token
          logout()
        }
        if(active && !administrationBypass && token && sessionValid && evacuatedTokenRef.current!==token){
          evacuatedTokenRef.current=token
          try{
            await fetch('/api/divine-shield/evacuate',{
              method:'POST',
              headers:{Authorization:`Bearer ${token}`},
              cache:'no-store',
            })
          }catch{
            // Local evacuation still proceeds if the revocation request is interrupted.
          }
          logout()
        }

        setState({
          checked:true,
          active,
          administrationBypass,
          title:body?.title || DEFAULT_STATE.title,
          message:body?.message || DEFAULT_STATE.message,
        })
      }catch{
        if(alive) setState(prev=>({...prev,checked:true,active:false}))
      }
    }

    void load()
    timerRef.current=window.setInterval(load,5000)
    return()=>{
      alive=false
      if(timerRef.current) window.clearInterval(timerRef.current)
    }
  },[isInitialized,token,logout])

  if(!isInitialized || !state.checked){
    return <div className="relative z-10 flex min-h-screen items-center justify-center bg-[#020815]/92"><Loader2 className="h-7 w-7 animate-spin text-sky-300" aria-label="Opening WEAVE" /></div>
  }

  if(state.active && !state.administrationBypass && !adminEntrance){
    return (
      <main className="relative z-[60] flex min-h-screen items-center justify-center overflow-hidden bg-[#020815] px-5 py-10 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_32%,rgba(56,189,248,.12),transparent_30%),radial-gradient(circle_at_50%_70%,rgba(245,158,11,.07),transparent_28%)]" />
        <section className="relative w-full max-w-2xl rounded-[2rem] border border-sky-300/15 bg-[#03101d]/88 p-7 text-center shadow-[0_30px_120px_rgba(0,0,0,.55)] backdrop-blur-2xl md:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-sky-300/20 bg-sky-400/10">
            <Shield className="h-8 w-8 text-sky-200" />
          </div>
          <div className="mt-6 flex justify-center"><WeaveLogo size="md" /></div>
          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.3em] text-sky-300">Divine Shield · Maintenance Boundary</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">{state.title}</h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-slate-300">{state.message}</p>
          <div className="mt-7 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs leading-6 text-slate-500">
            Your WEAVE session has been closed for maintenance. Your records and position remain preserved. Sign in again after Administration releases the shield.
          </div>
          <Link href="/login?administration=1" className="mt-5 inline-flex rounded-full border border-sky-300/15 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 transition hover:text-sky-200">Administration access</Link>
        </section>
      </main>
    )
  }

  return <>{children}</>
}
