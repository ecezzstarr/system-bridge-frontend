'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-provider'
import { Sparkles, ShieldCheck, Smartphone, Chrome, Globe, BrainCircuit, ArrowRight, RefreshCw } from 'lucide-react'

const EchoOrb = dynamic(() => import('@/components/echo-orb'), { ssr: false })

type Continuance = {
  user_id: string
  status: 'active' | 'inactive'
  expiry: string | null
  last_paid_at: string | null
}

type Insight = {
  id: string
  summary: string
  category: string | null
  confidence: number | null
  generated_at: string
  recommended_action?:string|null
  evidence_type?:string|null
  confidence_label?:string|null
}

type ImmediateEcho={
  headline:string
  explanation:string
  generatedAt:string
  signals:{recentActivityCount:number;unreadNotifications:number|null;lastActivityAt:string|null}
  nextMovements:Array<{title:string;detail:string;href:string}>
}

const SOURCES = [
  { icon: Chrome, label: 'Browser extension' },
  { icon: Smartphone, label: 'Mobile app' },
  { icon: Globe, label: 'Web activity' },
]

export default function EchoPage() {
  const { user, token } = useAuth()
  const [subscription, setContinuance] = useState<Continuance | null>(null)
  const [insights, setInsights] = useState<Insight[]>([])
  const [immediate,setImmediate]=useState<ImmediateEcho|null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const isActive = subscription?.status === 'active'

  const authHeaders = (): Headers => {
    const headers = new Headers()
    const t = token || (typeof window !== 'undefined' ? localStorage.getItem('ssb_auth_token') : null)

    if (t) {
      headers.set('Authorization', `Bearer ${t}`)
    }

    return headers
  }

  useEffect(() => {
    if (user?.id) void load()
    else setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id,token])

  useEffect(()=>{
    if(!user?.id)return
    const refresh=()=>{if(document.visibilityState==='visible')void load(true)}
    document.addEventListener('visibilitychange',refresh)
    const interval=window.setInterval(refresh,30000)
    return ()=>{
      document.removeEventListener('visibilitychange',refresh)
      window.clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[user?.id,token])

  async function load(silent=false) {
    if(!silent)setLoading(true)
    try {
      const subRes = await fetch('/api/echo/subscribe', { headers: authHeaders(),cache:'no-store' })
      const subData = await subRes.json()
      if(!subRes.ok)throw Error(subData.error||'Echo status unavailable')
      setContinuance(subData.subscription)

      if (subData.subscription?.status === 'active') {
        const insRes = await fetch('/api/echo/insights', { headers: authHeaders(),cache:'no-store' })
        const insData = await insRes.json()
        if(!insRes.ok)throw Error(insData.error||'Echo results unavailable')
        setInsights(insData.insights || [])
        setImmediate(insData.immediate||null)
      }
      setError(null)
    } catch(error:any) {
      if(!silent)setError(error.message||'Failed to load Echo')
    } finally {
      if(!silent)setLoading(false)
    }
  }

  async function handleSubscribe() {
    setSubscribing(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/echo/subscribe', { method: 'POST', headers: authHeaders() })
      const data = await res.json()
      if (res.ok) {
        setMessage('Echo is ready. Your immediate next movements are available now.')
        await load()
      } else if (data.reason === 'insufficient_balance') {
        setError(`Insufficient balance. Need ${data.requiredFlameCoin} Flame Coin, wallet has ${data.availableFlameCoin} Flame Coin.`)
      } else {
        setError('Echo activation failed. Please try again.')
      }
    } catch {
      setError('Echo activation failed. Please try again.')
    } finally {
      setSubscribing(false)
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true)
    setError(null)
    try {
      const res = await fetch('/api/echo/insights', { method: 'POST', headers: authHeaders() })
      const data = await res.json()
      if (res.ok) {
        setInsights(data.insights || [])
        if(data.immediate)setImmediate(data.immediate)
        setMessage(data.message||'Echo has reviewed your current recorded movement.')
      } else {
        setError(data.error || 'Analysis failed')
      }
    } catch {
      setError('Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-slate-500">Loading Echo...</div>
  }

  if (!user) {
    return <div className="p-6 text-center text-red-400">You must be logged in to view Echo.</div>
  }

  return (
    <main className="weave-operating-environment mx-auto max-w-5xl overflow-hidden border-y border-cyan-300/15 bg-[#040a10]/78 sm:rounded-[2rem] sm:border" data-echo-board>
      {/* 3D Hero */}
      <section className="relative h-72 overflow-hidden border-b border-cyan-300/15 bg-gradient-to-b from-slate-900 to-slate-950">
        <EchoOrb />
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Echo</span>
        </div>
      </section>

      <header className="border-b border-white/10 px-5 py-6 md:px-7">
        <h1 className="text-2xl font-bold text-white">Echo</h1>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          Echo provides immediate private, role-specific direction from your verified WEAVE position and available activity. 
          It keeps activity connected to the next relevant operating system. No monthly waiting period is required.
        </p>
      </header>

      {/* What it does */}
      <section className="space-y-4 border-b border-slate-800 bg-slate-900/20 px-5 py-6 md:px-7" data-echo-station="continuity">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">How it works</h2>
        </div>
        <ol className="space-y-3 text-sm text-slate-400">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center">1</span>
            <span>Echo reads your verified position and your own recorded WEAVE activity. Connected devices can add more activity.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center">2</span>
            <span>Immediate guidance appears as soon as Echo opens. Optional AI analysis examines bounded recorded activity; it does not require months of history.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center">3</span>
            <span>Echo identifies a current next movement and distinguishes verified signals from optional AI observations.</span>
          </li>
        </ol>

        <div className="border-t border-slate-800 pt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Sources Echo can read from</p>
          <div className="flex gap-4">
            {SOURCES.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1.5 text-center">
                <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <s.icon className="h-4 w-4 text-slate-400" />
                </div>
                <span className="text-[10px] text-slate-500 leading-tight">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-800 pt-4 flex gap-2 items-start">
          <ShieldCheck className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 leading-relaxed">
            Privacy: Echo reads this account's own activity and notifications. The immediate guidance is private, free and does not publish another person's records.
          </p>
        </div>
      </section>

      {/* Status */}
      <section className="space-y-3 border-b border-slate-800 bg-black/10 px-5 py-5 md:px-7" data-echo-station="status">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-sm">Echo · Free for all positions</span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-400'
          }`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </section>

      {isActive&&immediate&&<section className="space-y-4 border-b border-sky-300/20 bg-sky-300/[.045] px-5 py-6 md:px-7" data-echo-immediate="ready">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-[10px] font-bold uppercase tracking-widest text-sky-300">Immediate Echo · Current movement</p>
            <h2 className="mt-2 text-xl font-bold text-white">{immediate.headline}</h2></div>
          <button onClick={()=>void load(true)} className="inline-flex items-center gap-2 rounded-lg border border-sky-200/20 px-3 py-2 text-xs font-semibold text-sky-100"><RefreshCw className="h-4 w-4"/>Refresh now</button>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-slate-200">{immediate.explanation}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {immediate.nextMovements.map(move=><Link key={move.href} href={move.href} className="rounded-xl border border-white/10 bg-black/25 p-4 transition hover:border-sky-200/40">
            <p className="flex items-center justify-between gap-2 text-sm font-bold text-white">{move.title}<ArrowRight className="h-4 w-4 shrink-0 text-sky-200"/></p>
            <p className="mt-2 text-xs leading-5 text-slate-300">{move.detail}</p>
          </Link>)}
        </div>
        <p className="text-xs text-slate-400">Verified here: {immediate.signals.recentActivityCount} recorded Echo activities in the last seven days{immediate.signals.unreadNotifications===null?' · Notification status unavailable':` · ${immediate.signals.unreadNotifications} unread notifications`}. Guidance is not a confirmed sale, completed order or approved build.</p>
      </section>}

      {error && <div className="text-sm text-red-400">{error}</div>}
      {message && <div className="text-sm text-green-400">{message}</div>}

      {!isActive ? (
        <section className="space-y-4 border-b border-slate-800 bg-slate-900/20 px-5 py-6 md:px-7" data-echo-station="continuance">
          <h2 className="text-lg font-medium text-white">Enable Echo · Free</h2>
          <p className="text-sm text-slate-500">
            No subscription or wallet charge. Available to every WEAVE position.
          </p>
          <button
            onClick={handleSubscribe}
            disabled={subscribing}
            className="w-full border-y border-cyan-300/25 bg-cyan-500/15 py-3 font-medium text-cyan-50 transition hover:bg-cyan-500/20 disabled:opacity-50"
          >
            {subscribing ? 'Activating...' : 'Enable Echo free'}
          </button>
        </section>
      ) : (
        <section className="space-y-4 px-5 py-6 md:px-7" data-echo-station="insights">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-white">Insights</h2>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="border-y border-cyan-300/20 bg-cyan-300/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-300/[0.08] disabled:opacity-50"
            >
              {analyzing ? 'Analyzing...' : 'Analyze now'}
            </button>
          </div>

          {insights.length === 0 ? (
            <div className="border-y border-slate-800 bg-slate-900/20 p-8 text-center">
              <p className="text-slate-500 text-sm">
                No saved AI analysis yet. Your immediate Echo guidance above is already available; further findings can be generated from recorded activity.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {insights.map((insight) => (
                <article key={insight.id} className="border-b border-slate-800 bg-slate-900/20 p-4 last:border-b-0">
                  <div className="flex items-center justify-between mb-1">
                    {insight.category && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                        {insight.category}
                      </span>
                    )}
                    <span className="text-xs text-slate-500">
                      {new Date(insight.generated_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-white leading-relaxed">{insight.summary}</p>
                  {insight.recommended_action&&<p className="mt-2 text-sm text-sky-100"><strong>Next movement:</strong> {insight.recommended_action}</p>}
                  {insight.evidence_type&&<p className="mt-2 text-xs text-slate-400">{insight.evidence_type} · {insight.confidence_label||'Unrated confidence'}</p>}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  )
}
