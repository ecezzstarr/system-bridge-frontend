'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, FileText, Orbit, ShieldCheck, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-provider'

type Standing = {
  platformRole: string
  worldRoles: string[]
  crossing: {
    phase: string
    currentPass: number
    fileNumber: string | null
    recognizedAt: string | null
    unlockedRoles: string[]
  }
}

export default function WeaveStandingPage() {
  const { token, user } = useAuth()
  const [state, setState] = useState<Standing | null>(null)

  useEffect(() => {
    if (!token) return
    fetch('/api/world/state', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
      .then((response) => response.json())
      .then((data) => setState(data.success ? data.state : null))
      .catch(() => setState(null))
  }, [token])

  const progress = useMemo(() => {
    if (!state) return 0
    if (state.crossing.recognizedAt) return 100
    return Math.max(0, Math.min(90, Number(state.crossing.currentPass || 0) * 20))
  }, [state])

  if (!state) {
    return <div className="p-8 text-slate-400">Reading your WEAVE standing…</div>
  }

  const isClient = user?.role === 'client'
  const nextHref = isClient ? '/client/system-switch' : '/marketplace'
  const nextLabel = isClient ? 'Enter Main File Folder' : 'See what Clients can build'

  return (
    <main className="mx-auto w-full max-w-6xl p-3 md:p-6">
      <section className="weave-system-depth overflow-hidden rounded-[2rem] border border-sky-300/15 bg-[#030a15]/72">
        <header className="border-b border-white/10 bg-[radial-gradient(circle_at_14%_0%,rgba(14,165,233,.13),transparent_34%),radial-gradient(circle_at_86%_0%,rgba(245,158,11,.08),transparent_28%)] p-5 md:p-7">
          <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-sky-300">Standing Engine</p>
          <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">Your place in WEAVE is a live state, not a profile badge.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">Standing shows what WEAVE currently recognizes about your position, crossing, File Number and access. As movement changes, this state changes with it.</p>
        </header>

        <div className="grid gap-4 p-4 md:p-6 lg:grid-cols-[1fr_320px]">
          <section className="weave-reading-surface rounded-3xl p-4 md:p-6">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-sky-300/15 bg-sky-400/[0.04] p-5">
                <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-sky-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">File record</p></div>
                <p className="mt-4 break-all font-mono text-lg font-black text-white">{state.crossing.fileNumber ?? 'Not issued'}</p>
                <p className="mt-2 text-xs text-slate-400">Platform position: <span className="font-black capitalize text-slate-200">{state.platformRole || user?.role || 'unknown'}</span></p>
              </div>

              <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.04] p-5">
                <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">Recognition</p></div>
                <p className="mt-4 text-lg font-black text-white">{state.crossing.recognizedAt ? 'Recognized' : 'Movement still forming'}</p>
                <p className="mt-2 text-xs leading-5 text-slate-400">{state.crossing.recognizedAt ? `Recognized on ${new Date(state.crossing.recognizedAt).toLocaleDateString()}` : `Current phase: ${String(state.crossing.phase || 'not started').replaceAll('_',' ')}`}</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-300/15 bg-amber-400/[0.035] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">Crossing movement</p>
                  <p className="mt-1 text-sm font-black text-white">Pass {state.crossing.currentPass || 0} · {String(state.crossing.phase || 'not started').replaceAll('_',' ')}</p>
                </div>
                <span className="text-sm font-black text-amber-200">{progress}%</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/30"><div className="h-full rounded-full bg-amber-300" style={{width:`${progress}%`}}/></div>
              <p className="mt-3 text-[10px] leading-5 text-slate-400">This bar reflects recorded crossing state. It does not simulate progress that has not happened.</p>
            </div>

            <div className="mt-4">
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-300">Recognized access</p></div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(state.worldRoles || []).map((role) => (
                  <span key={role} className="rounded-full border border-violet-300/15 bg-violet-400/[0.05] px-3 py-1.5 text-[10px] font-black capitalize text-violet-100">
                    {role.replaceAll('_', ' ')}
                  </span>
                ))}
                {(state.worldRoles || []).length === 0 && <span className="text-xs text-slate-500">No additional world roles recorded.</span>}
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-sky-300/15 bg-sky-400/[0.04] p-4">
              <div className="flex items-center gap-2"><Orbit className="h-4 w-4 text-sky-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">Next useful movement</p></div>
              <p className="mt-3 text-xs leading-5 text-slate-300">{isClient ? 'Your File Folder is where standing becomes construction, live systems and recorded operation.' : 'The Client position is where a File Folder can turn a workshop into systems that remain hosted and usable.'}</p>
              <Link href={nextHref} className="mt-4 inline-flex w-full items-center justify-between rounded-xl border border-sky-300/15 bg-sky-400/[0.07] px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-sky-100">{nextLabel}<ArrowRight className="h-3.5 w-3.5"/></Link>
            </section>

            <section className="rounded-3xl border border-emerald-300/15 bg-emerald-400/[0.04] p-4">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">Truth rule</p></div>
              <p className="mt-3 text-xs leading-5 text-slate-300">Standing displays recorded identity and access only. WEAVE should never present a role, recognition or system state that has not actually been established.</p>
            </section>
          </aside>
        </div>
      </section>
    </main>
  )
}
