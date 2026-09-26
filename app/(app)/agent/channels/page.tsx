'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldCheck, Scale, Search, ArrowRight, Radio, CheckCircle2, Clock3 } from 'lucide-react'
import { toast } from 'sonner'
import { ClientBuildPull } from '@/components/world/client-build-pull'

interface Application {
  id: string
  channel: string
  status: 'pending' | 'approved' | 'rejected'
  applied_at: string
}

const CHANNELS = [
  { id: 'mandate', name: 'Mandate', icon: ShieldCheck, desc: 'Move an approved Client process forward.', output: 'Authorized Client movement' },
  { id: 'forensic', name: 'Forensics', icon: Search, desc: 'Verify that movement, records and claims are real.', output: 'Confirmed movement' },
  { id: 'lawyer', name: 'Attorney', icon: Scale, desc: 'Clarify obligations, agreements and what must be done.', output: 'Defined next action' },
]

export default function AgentChannelsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [applyingId, setApplyingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    if (user.role !== 'agent') {
      router.push('/dashboard')
      return
    }
    void fetchApplications()
  }, [user])

  const fetchApplications = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/agent/channel-applications', {
        headers: { Authorization: `Bearer ${localStorage.getItem('ssb_auth_token')}` },
      })
      const data = await res.json()
      if (data.success) setApplications(data.applications || [])
    } catch {
      toast.error('Failed to load channel status')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApply = async (channel: string) => {
    setApplyingId(channel)
    try {
      const res = await fetch('/api/agent/channel-applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('ssb_auth_token')}`,
        },
        body: JSON.stringify({ channel }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Channel movement submitted for Administration review.')
        await fetchApplications()
      } else {
        toast.error(data.error || 'Failed to apply')
      }
    } catch {
      toast.error('Failed to apply')
    } finally {
      setApplyingId(null)
    }
  }

  const statusFor = (channelId: string) => applications.find(a => a.channel === channelId)
  const approved = useMemo(() => applications.filter(item => item.status === 'approved').length, [applications])
  const pending = useMemo(() => applications.filter(item => item.status === 'pending').length, [applications])

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-sky-300" /></div>
  }

  return (
    <main className="mx-auto w-full max-w-6xl p-3 md:p-6">
      <section className="weave-system-depth overflow-hidden rounded-[2rem] border border-sky-300/15 bg-[#030a15]/72">
        <header className="border-b border-white/10 bg-[radial-gradient(circle_at_15%_0%,rgba(14,165,233,.13),transparent_34%),radial-gradient(circle_at_90%_0%,rgba(16,185,129,.08),transparent_28%)] p-5 md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-sky-300">Agent Channel Engine</p>
              <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">A channel is an operating responsibility.</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">Apply → Administration reviews → approval unlocks a Client-support function → real Client movement enters your work queue.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl border border-emerald-300/15 bg-emerald-400/[0.05] px-4 py-3"><p className="text-[8px] font-black uppercase tracking-wider text-emerald-300">Operating</p><p className="mt-1 text-2xl font-black text-white">{approved}</p></div>
              <div className="rounded-xl border border-amber-300/15 bg-amber-400/[0.05] px-4 py-3"><p className="text-[8px] font-black uppercase tracking-wider text-amber-300">Reviewing</p><p className="mt-1 text-2xl font-black text-white">{pending}</p></div>
            </div>
          </div>
        </header>

        <div className="grid gap-4 p-4 md:p-6 lg:grid-cols-[1fr_320px]">
          <section className="space-y-3">
            {CHANNELS.map((channel) => {
              const app = statusFor(channel.id)
              const Icon = channel.icon
              const state = app?.status || 'available'
              const tone = state === 'approved'
                ? 'border-emerald-300/20 bg-emerald-400/[0.045]'
                : state === 'pending'
                  ? 'border-amber-300/20 bg-amber-400/[0.045]'
                  : state === 'rejected'
                    ? 'border-rose-300/20 bg-rose-400/[0.04]'
                    : 'border-sky-300/15 bg-sky-400/[0.035]'

              return (
                <article key={channel.id} className={`rounded-3xl border p-5 ${tone}`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/25"><Icon className="h-5 w-5 text-white"/></div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-black text-white">{channel.name}</h2>
                          <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${state === 'approved' ? 'border-emerald-300/20 text-emerald-300' : state === 'pending' ? 'border-amber-300/20 text-amber-300' : state === 'rejected' ? 'border-rose-300/20 text-rose-300' : 'border-sky-300/20 text-sky-300'}`}>{state}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{channel.desc}</p>
                        <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold text-slate-400">
                          <Radio className="h-3.5 w-3.5 text-sky-300"/>
                          Output: <span className="text-slate-200">{channel.output}</span>
                        </div>
                      </div>
                    </div>

                    {state === 'approved' ? (
                      <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.06] px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-200"><CheckCircle2 className="h-4 w-4"/>Active</div>
                    ) : state === 'pending' ? (
                      <div className="inline-flex items-center gap-2 rounded-xl border border-amber-300/15 bg-amber-400/[0.06] px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-amber-200"><Clock3 className="h-4 w-4"/>Administration review</div>
                    ) : (
                      <button onClick={() => void handleApply(channel.id)} disabled={applyingId === channel.id} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-300 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-950 disabled:opacity-50">
                        {applyingId === channel.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <ArrowRight className="h-4 w-4"/>}
                        {state === 'rejected' ? 'Submit again' : 'Enter review'}
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-cyan-300/15 bg-cyan-400/[0.04] p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300">What approval changes</p>
              <p className="mt-3 text-xs leading-5 text-slate-300">Approval is not a badge. It authorizes you to perform that support function for Client movement inside WEAVE.</p>
            </section>
            <ClientBuildPull role="agent" />
          </aside>
        </div>
      </section>
    </main>
  )
}
