'use client'

import { useMemo, useState } from 'react'
import {
  Calendar,
  CheckCircle2,
  Clock3,
  Lock,
  Radio,
  ShieldCheck,
  Users,
  Video,
} from 'lucide-react'
import { usePrivateSessions } from '@/lib/hooks'

const STATE_TONE: Record<string,string> = {
  scheduled: 'border-sky-300/20 bg-sky-400/[0.05] text-sky-200',
  active: 'border-emerald-300/20 bg-emerald-400/[0.05] text-emerald-200',
  completed: 'border-violet-300/20 bg-violet-400/[0.05] text-violet-200',
  cancelled: 'border-rose-300/20 bg-rose-400/[0.05] text-rose-200',
}

function formatDateTime(dateString?: string) {
  if (!dateString) return { date:'Unscheduled', time:'—' }
  const date = new Date(dateString)
  return {
    date: Number.isNaN(date.getTime()) ? 'Unscheduled' : date.toLocaleDateString(),
    time: Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }),
  }
}

export default function PrivateGroundPage() {
  const [view, setView] = useState<'scheduled'|'active'|'history'>('scheduled')
  const status = view === 'scheduled' ? 'scheduled' : view === 'active' ? 'active' : undefined
  const { data: sessionsData, isLoading } = usePrivateSessions({ status })
  const sessions:any[] = (sessionsData as any)?.data || []

  const counts = useMemo(()=>({
    scheduled:sessions.filter(session=>session.status==='scheduled').length,
    active:sessions.filter(session=>session.status==='active').length,
    completed:sessions.filter(session=>session.status==='completed').length,
  }),[sessions])

  return (
    <main className="mx-auto w-full max-w-6xl p-3 md:p-6">
      <section className="weave-system-depth overflow-hidden rounded-[2rem] border border-violet-300/15 bg-[#030a15]/72">
        <header className="border-b border-white/10 bg-[radial-gradient(circle_at_14%_0%,rgba(139,92,246,.13),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(16,185,129,.08),transparent_28%)] p-5 md:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-violet-300">Private Ground · Session State</p>
              <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">Private interaction is tracked as a state transition.</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                This surface reads the session service and shows what is scheduled, live or completed. It no longer displays Start, End or Schedule buttons unless an authorized action channel actually exists.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <StateCount label="Scheduled" value={counts.scheduled} tone="text-sky-300 border-sky-300/15 bg-sky-400/[0.04]"/>
              <StateCount label="Live" value={counts.active} tone="text-emerald-300 border-emerald-300/15 bg-emerald-400/[0.04]"/>
              <StateCount label="Completed" value={counts.completed} tone="text-violet-300 border-violet-300/15 bg-violet-400/[0.04]"/>
            </div>
          </div>
        </header>

        <div className="grid gap-4 p-4 md:p-6 lg:grid-cols-[1fr_320px]">
          <section className="weave-reading-surface rounded-3xl p-4 md:p-5">
            <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">Session registry</p>
                <p className="mt-1 text-xs text-slate-400">Observe the recorded state without implying controls the current web client does not own.</p>
              </div>
              <div className="flex gap-2">
                {[
                  ['scheduled','Scheduled'],
                  ['active','Live'],
                  ['history','History'],
                ].map(([key,label])=>(
                  <button key={key} onClick={()=>setView(key as any)} className={`rounded-xl border px-3 py-2 text-[9px] font-black uppercase tracking-[0.1em] transition ${view===key?'border-violet-300/25 bg-violet-400/10 text-violet-100':'border-white/10 bg-black/20 text-slate-400'}`}>{label}</button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="py-20 text-center text-slate-400">Reading private-session state…</div>
            ) : sessions.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-8 text-center">
                <Lock className="mx-auto h-8 w-8 text-slate-500"/>
                <p className="mt-3 text-sm font-black text-white">No session is recorded in this view.</p>
                <p className="mt-2 text-xs leading-5 text-slate-400">When the session service records movement, it will appear here with its actual state and timing.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {sessions.map((session:any)=>{
                  const tone=STATE_TONE[session.status] || 'border-white/10 bg-white/[0.025] text-slate-200'
                  const {date,time}=formatDateTime(session.scheduledAt)
                  const guest=session?.guest?.displayName || session?.guest?.name || 'Participant'
                  const rate=Number(session.rate ?? session.price ?? 0)
                  return (
                    <article key={session.id} className={`rounded-2xl border p-4 ${tone}`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/25">
                            {session.status==='active'?<Radio className="h-4 w-4"/>:session.status==='completed'?<CheckCircle2 className="h-4 w-4"/>:<Calendar className="h-4 w-4"/>}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-white">{guest}</p>
                            <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-slate-400">
                              <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3"/>{date}</span>
                              <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3"/>{time}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black uppercase tracking-[0.1em]">{String(session.status||'recorded')}</p>
                          <p className="mt-1 text-xs font-black text-white">{rate.toLocaleString()} Flame Coin</p>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-emerald-300/15 bg-emerald-400/[0.04] p-4">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">Action integrity</p></div>
              <p className="mt-3 text-xs leading-5 text-slate-300">A mature system separates observation from authority. This page observes session state. It does not manufacture Start, End or Cancel actions that are absent from the connected session API.</p>
            </section>

            <section className="rounded-3xl border border-sky-300/15 bg-sky-400/[0.04] p-4">
              <div className="flex items-center gap-2"><Video className="h-4 w-4 text-sky-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">Session lifecycle</p></div>
              <div className="mt-3 space-y-2 text-xs font-semibold text-slate-300">
                <p>Scheduled → recognized.</p>
                <p>Live → active interaction.</p>
                <p>Completed → preserved history.</p>
              </div>
            </section>

            <section className="rounded-3xl border border-amber-300/15 bg-amber-400/[0.04] p-4">
              <div className="flex items-center gap-2"><Users className="h-4 w-4 text-amber-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">Next engineering step</p></div>
              <p className="mt-3 text-xs leading-5 text-slate-300">When a verified session-control API is connected, scheduling and live controls can be added here as real state transitions rather than decorative buttons.</p>
            </section>
          </aside>
        </div>
      </section>
    </main>
  )
}

function StateCount({ label, value, tone }:{label:string;value:number;tone:string}) {
  return <div className={`rounded-xl border px-3 py-3 ${tone}`}><p className="text-[8px] font-black uppercase tracking-wider">{label}</p><p className="mt-1 text-xl font-black text-white">{value}</p></div>
}
