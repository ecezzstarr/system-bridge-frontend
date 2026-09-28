'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  ArrowLeft,
  Bot,
  CheckCircle2,
  CirclePause,
  Cpu,
  FileCode2,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  XCircle,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { getAuthHeaders } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { visiblePoll } from '@/lib/visible-poll'

type Agent = {
  agent_key: string
  name: string
  role: string
  mandate: string
  cadence_minutes: number
  enabled: boolean
  last_pulse_at?: string | null
  next_pulse_at?: string | null
  last_summary?: string | null
  open_work_count: number
  awaiting_authority_count: number
}

type Work = {
  id: string
  agent_key: string
  source: 'automatic' | 'admin'
  priority: number
  title: string
  brief: string
  target_paths: string[]
  status: string
  proposal?: string | null
  verification?: string | null
  created_at: string
  updated_at: string
}

type FoundryState = {
  success: boolean
  agents: Agent[]
  work: Work[]
  continuousRuntimeReady: boolean
  pulseIntervalMinutes: number
}

function relative(value?: string | null) {
  if (!value) return 'not yet'
  const ms = Date.now() - new Date(value).getTime()
  const minutes = Math.max(0, Math.floor(ms / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}

function agentState(agent: Agent) {
  if (!agent.enabled) return 'PAUSED'
  if (agent.awaiting_authority_count > 0) return 'AWAITING AUTHORITY'
  if (agent.open_work_count > 0) return 'BUILDING'
  return 'OBSERVING'
}

export default function DevelopmentFoundryPage() {
  const { user } = useAuth()
  const [state, setState] = useState<FoundryState | null>(null)
  const [loading, setLoading] = useState(true)
  const [pulsing, setPulsing] = useState(false)
  const [continuousFloor, setContinuousFloor] = useState(true)
  const [agentKey, setAgentKey] = useState('eight')
  const [title, setTitle] = useState('')
  const [brief, setBrief] = useState('')
  const [queueing, setQueueing] = useState(false)
  const pulseLock = useRef(false)

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/development-agents', {
        headers: getAuthHeaders(),
        cache: 'no-store',
      })
      const body = await response.json()
      if (!response.ok || !body.success) throw new Error(body.error || 'Unable to read Development Foundry')
      setState(body)
    } catch (error: any) {
      toast.error(error?.message || 'Development Foundry is unreachable')
    } finally {
      setLoading(false)
    }
  }, [])

  const pulse = useCallback(async (force = false, target?: string) => {
    if (pulseLock.current) return
    pulseLock.current = true
    setPulsing(true)
    try {
      const response = await fetch('/api/admin/development-agents', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'pulse',
          force,
          agentKey: target || undefined,
          maxAgents: 1,
        }),
      })
      const body = await response.json()
      if (!response.ok || !body.success) throw new Error(body.error || 'Development cycle failed')
      await refresh()
      if (force) toast.success('Development cycle completed')
    } catch (error: any) {
      if (force) toast.error(error?.message || 'Development cycle interrupted')
    } finally {
      pulseLock.current = false
      setPulsing(false)
    }
  }, [refresh])

  useEffect(() => visiblePoll(() => refresh(), 30000), [refresh])

  useEffect(() => {
    if (!continuousFloor) return
    return visiblePoll(() => pulse(false), 60000)
  }, [continuousFloor, pulse])

  const queueWork = async () => {
    if (!title.trim() || !brief.trim()) return
    setQueueing(true)
    try {
      const response = await fetch('/api/admin/development-agents', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'queue',
          agentKey,
          title: title.trim(),
          brief: brief.trim(),
          priority: 80,
        }),
      })
      const body = await response.json()
      if (!response.ok || !body.success) throw new Error(body.error || 'Unable to queue work')
      setTitle('')
      setBrief('')
      await refresh()
      toast.success('Development movement assigned')
      void pulse(true, agentKey)
    } catch (error: any) {
      toast.error(error?.message || 'Unable to queue work')
    } finally {
      setQueueing(false)
    }
  }

  const setEnabled = async (key: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/admin/development-agents', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'set_enabled', agentKey: key, enabled }),
      })
      const body = await response.json()
      if (!response.ok || !body.success) throw new Error(body.error || 'Agent state change failed')
      await refresh()
    } catch (error: any) {
      toast.error(error?.message || 'Agent state change failed')
    }
  }

  const decide = async (workId: string, decision: 'approved' | 'rejected' | 'shipped') => {
    try {
      const response = await fetch('/api/admin/development-agents', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'decide', workId, decision }),
      })
      const body = await response.json()
      if (!response.ok || !body.success) throw new Error(body.error || 'Decision failed')
      await refresh()
    } catch (error: any) {
      toast.error(error?.message || 'Decision failed')
    }
  }

  const agentsByKey = useMemo(() => new Map((state?.agents || []).map(agent => [agent.agent_key, agent])), [state?.agents])
  const proposals = (state?.work || []).filter(item => ['proposal', 'working', 'queued', 'approved'].includes(item.status))

  if (!user || user.role !== 'admin') return null

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-[#02070c] text-white" data-development-foundry="live">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-cyan-100/10 pb-5">
          <div className="min-w-0">
            <Link href="/admin/workshop" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 hover:text-cyan-200">
              <ArrowLeft className="h-3.5 w-3.5" />
              Admin Workshop
            </Link>
            <p className="mt-5 text-[9px] font-black uppercase tracking-[0.3em] text-cyan-300">Administration · Development Foundry</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">AI engineers inside WEAVE.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Eight leads a persistent engineering workforce. Each agent owns a real part of the source, reads that code before acting, develops one bounded movement at a time, and returns evidence to Administration before production authority moves.
            </p>
          </div>
          <div className="flex items-center gap-2 border-l border-cyan-300/15 pl-4">
            <Activity className="h-4 w-4 text-emerald-300" />
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">Foundry state</p>
              <p className="mt-1 text-xs font-black text-emerald-200">{continuousFloor ? 'DEVELOPING' : 'HELD'}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-0 border-b border-cyan-100/10 lg:grid-cols-[1.1fr_.9fr]">
          <div className="border-r-0 border-cyan-100/10 py-5 lg:border-r lg:pr-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-300">Engineering floor</p>
                <p className="mt-1 text-xs text-slate-500">Not avatars. Each line below is a persisted development role with owned code and work state.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setContinuousFloor(value => !value)}>
                  {continuousFloor ? <CirclePause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                  {continuousFloor ? 'Hold floor' : 'Resume floor'}
                </Button>
                <Button size="sm" onClick={() => void pulse(true)} disabled={pulsing}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${pulsing ? 'animate-spin' : ''}`} />
                  Run cycle
                </Button>
              </div>
            </div>

            <div className="mt-5 divide-y divide-cyan-100/10 border-y border-cyan-100/10">
              {(state?.agents || []).map(agent => (
                <div key={agent.agent_key} className="grid gap-3 py-4 sm:grid-cols-[180px_1fr_auto] sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      {agent.agent_key === 'eight' ? <Sparkles className="h-4 w-4 text-violet-300" /> : <Cpu className="h-4 w-4 text-cyan-300" />}
                      <p className="font-black">{agent.name}</p>
                    </div>
                    <p className="mt-1 text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">{agent.role}</p>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.13em] text-emerald-300">{agentState(agent)}</span>
                      <span className="text-[9px] text-slate-600">· pulse {relative(agent.last_pulse_at)} · {agent.cadence_minutes}m cadence</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{agent.last_summary || agent.mandate}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {agent.awaiting_authority_count > 0 && <span className="text-[9px] font-black text-amber-300">{agent.awaiting_authority_count} awaiting</span>}
                    <button
                      onClick={() => void setEnabled(agent.agent_key, !agent.enabled)}
                      className="rounded-full border border-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-slate-300 hover:border-cyan-300/30"
                    >
                      {agent.enabled ? 'Pause' : 'Enable'}
                    </button>
                  </div>
                </div>
              ))}
              {!loading && (state?.agents || []).length === 0 && <p className="py-5 text-sm text-slate-500">No development agents registered.</p>}
            </div>
          </div>

          <div className="py-5 lg:pl-6">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-violet-300">Administrator → Foundry</p>
            <h2 className="mt-2 text-xl font-black">Assign a development movement</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">Give one outcome. The assigned engineer reads its owned source, develops against that source, and returns a concrete proposal with verification.</p>

            <label className="mt-5 block text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">Engineer</label>
            <select
              value={agentKey}
              onChange={event => setAgentKey(event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-slate-700 bg-[#06101a] px-3 text-sm text-white"
            >
              {(state?.agents || []).map(agent => <option key={agent.agent_key} value={agent.agent_key}>{agent.name} · {agent.role}</option>)}
            </select>

            <label className="mt-4 block text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">Movement</label>
            <Input className="mt-2" value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Make the Admin World physically navigable" />

            <label className="mt-4 block text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">Required behavior</label>
            <textarea
              value={brief}
              onChange={event => setBrief(event.target.value)}
              rows={6}
              className="mt-2 w-full rounded-md border border-slate-700 bg-[#06101a] p-3 text-sm leading-6 text-white outline-none focus:border-cyan-400/50"
              placeholder="Describe the behavior the system must actually perform, not how it should describe itself."
            />

            <Button className="mt-4 w-full" onClick={() => void queueWork()} disabled={queueing || !title.trim() || !brief.trim()}>
              <Bot className="mr-2 h-4 w-4" />
              Assign and develop
            </Button>

            <div className="mt-5 border-t border-cyan-100/10 pt-4 text-xs leading-5 text-slate-500">
              <div className="flex items-center gap-2 text-slate-300"><ShieldCheck className="h-4 w-4 text-emerald-300" />Production authority stays with Administration.</div>
              <p className="mt-2">Continuous server pulse: {state?.continuousRuntimeReady ? 'armed for scheduler' : 'scheduler secret not armed yet'}. The Foundry also pulses while this floor is open.</p>
            </div>
          </div>
        </section>

        <section className="py-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-300">Build stream</p>
              <h2 className="mt-2 text-2xl font-black">Work moving through the Foundry</h2>
            </div>
            <Link href="/admin/dev-workshop" className="inline-flex items-center gap-2 text-xs font-black text-cyan-200 hover:text-white">
              <TerminalSquare className="h-4 w-4" />
              Open Eight Developer Workshop
            </Link>
          </div>

          <div className="mt-5 divide-y divide-white/10 border-y border-white/10">
            {proposals.map(item => {
              const agent = agentsByKey.get(item.agent_key)
              return (
                <article key={item.id} className="py-5" data-development-work={item.status}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <FileCode2 className="h-4 w-4 text-cyan-300" />
                        <span className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-300">{agent?.name || item.agent_key}</span>
                        <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-600">{item.status}</span>
                        <span className="text-[9px] text-slate-600">{item.source}</span>
                      </div>
                      <h3 className="mt-2 text-lg font-black">{item.title}</h3>
                      <p className="mt-2 max-w-4xl text-xs leading-5 text-slate-400">{item.brief}</p>
                    </div>
                    {item.status === 'proposal' && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => void decide(item.id, 'rejected')}>
                          <XCircle className="mr-2 h-4 w-4" />Reject
                        </Button>
                        <Button size="sm" onClick={() => void decide(item.id, 'approved')}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />Approve proposal
                        </Button>
                      </div>
                    )}
                  </div>

                  {Array.isArray(item.target_paths) && item.target_paths.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-mono text-slate-600">
                      {item.target_paths.slice(0, 8).map(path => <span key={path}>{path}</span>)}
                    </div>
                  )}

                  {item.proposal && (
                    <pre className="mt-4 max-h-[360px] overflow-auto whitespace-pre-wrap border-l-2 border-cyan-300/25 bg-cyan-300/[0.025] px-4 py-3 text-xs leading-6 text-slate-300">
                      {item.proposal}
                    </pre>
                  )}
                  {item.verification && (
                    <div className="mt-3 border-l-2 border-emerald-300/20 pl-4">
                      <p className="text-[9px] font-black uppercase tracking-[0.15em] text-emerald-300">Verification</p>
                      <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-500">{item.verification}</p>
                    </div>
                  )}
                </article>
              )
            })}
            {!loading && proposals.length === 0 && (
              <div className="py-8 text-sm text-slate-500">The engineering floor is clear. A due pulse or an Administration assignment will create the next movement.</div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
