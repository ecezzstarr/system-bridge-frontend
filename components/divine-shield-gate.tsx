'use client'
import { visiblePoll } from '@/lib/visible-poll'

import { useEffect, useState, type ReactNode } from 'react'
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
  message:'The system is being refined. Participation will reopen when Administrations releases the Divine Shield.',
}

export function DivineShieldGate({children}:{children:ReactNode}){
  const {token,isInitialized}=useAuth()
  const pathname=usePathname() || '/'
  const [state,setState]=useState<ShieldState>(DEFAULT_STATE)
  const [adminEntrance,setAdminEntrance]=useState(false)

  useEffect(()=>{
    if(typeof window==='undefined') return
    const params=new URLSearchParams(window.location.search)
    setAdminEntrance(pathname==='/login' && (params.get('administration')==='1' || params.get('portal')==='admin'))
  },[pathname])

  useEffect(()=>{
    if(!isInitialized) return
    let alive=true

    const load=async(signal:AbortSignal)=>{
      try{
        const response=await fetch('/api/divine-shield/status',{
          cache:'no-store',signal,
          headers:token?{Authorization:`Bearer ${token}`}:{},
        })
        const body=await response.json()
        if(!alive||signal.aborted) return

        const active=Boolean(body?.active)
        const administrationBypass=Boolean(body?.administrationBypass)

        setState({
          checked:true,
          active,
          administrationBypass,
          title:body?.title || DEFAULT_STATE.title,
          message:body?.message || DEFAULT_STATE.message,
        })
      }catch{
        // A failed status request must never expose a protected workroom by accident.
        if(alive&&!document.hidden) setState(prev=>({
          ...prev,checked:true,active:prev.checked ? prev.active : true,
          title:'WEAVE is verifying its connection',
          message:'Your session is preserved. Departmental work resumes after the connection and Administrations checks are verified.',
        }))
      }
    }

    const stop=visiblePoll(load,5000)
    return()=>{
      alive=false
      stop()
    }
  },[isInitialized,token])

  if(!isInitialized || !state.checked){
    return <div className="relative z-10 flex min-h-screen items-center justify-center bg-[#020815]/92"><Loader2 className="h-7 w-7 animate-spin text-sky-300" aria-label="Opening WEAVE" /></div>
  }

  const loginEntrance = ['/login','/client/login','/client-login','/forgot-password','/reset-password'].includes(pathname)
  if(state.active && !state.administrationBypass && loginEntrance){
    return <>
      <div role="status" aria-live="polite" className="relative z-[61] border-b border-amber-300/40 bg-[#352b15] px-4 py-3 text-center text-sm font-semibold text-amber-100">
        <Shield className="mr-2 inline h-4 w-4" aria-hidden="true" />
        Divine Shield is raised. Sign in normally; your session will stay in place while Administrations verifies the release. Departmental work is temporarily paused.
      </div>
      {children}
    </>
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
            Your WEAVE session stays active. Your File Folder, work records and account remain preserved. Administrations is verifying the release; your department resumes automatically when the Shield is released.
          </div>
          <Link href="/login?portal=admin" className="mt-5 inline-flex rounded-full border border-sky-300/15 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 transition hover:text-sky-200">Administrations access</Link>
        </section>
      </main>
    )
  }

  return <>{children}</>
}
