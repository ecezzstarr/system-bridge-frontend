'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useAuth } from '@/lib/auth-provider'
import { Sparkles, ShieldCheck, Smartphone, Chrome, Globe, BrainCircuit } from 'lucide-react'

const EchoOrb = dynamic(() => import('@/components/echo-orb'), { ssr: false })

const SUBSCRIPTION_FEE_FLAME_COIN = 7

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
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const isActive = subscription?.status === 'active' && subscription.expiry && new Date(subscription.expiry) > new Date()

  const authHeaders = (): Headers => {
    const headers = new Headers()
    const t = token || (typeof window !== 'undefined' ? localStorage.getItem('ssb_auth_token') : null)

    if (t) {
      headers.set('Authorization', `Bearer ${t}`)
    }

    return headers
  }

  useEffect(() => {
    if (user) load()
    else setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function load() {
    setLoading(true)
    try {
      const subRes = await fetch('/api/echo/subscribe', { headers: authHeaders() })
      const subData = await subRes.json()
      setContinuance(subData.subscription)

      if (subData.subscription?.status === 'active') {
        const insRes = await fetch('/api/echo/insights', { headers: authHeaders() })
        const insData = await insRes.json()
        setInsights(insData.insights || [])
      }
    } catch {
      setError('Failed to load Echo')
    } finally {
      setLoading(false)
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
        setMessage('Echo activated. Your reflective insights will build over time.')
        await load()
      } else if (data.reason === 'insufficient_balance') {
        setError(`Insufficient balance. Need ${data.requiredFlameCoin} Flame Coin, wallet has ${data.availableFlameCoin} Flame Coin.`)
      } else {
        setError('Continuance failed. Please try again.')
      }
    } catch {
      setError('Continuance failed. Please try again.')
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
        if ((data.insights || []).length === 0) {
          setMessage('Not enough activity yet to surface new insights.')
        }
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
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {/* 3D Hero */}
      <div className="relative h-64 rounded-2xl overflow-hidden border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
        <EchoOrb />
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Echo</span>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white">Echo</h1>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          Echo is the institutional participation layer and continuity engine of Weave of Presence. 
          It governs how different intelligences participate with humans and systems, preserving 
          the memory of the institution so it does not forget itself across movement.
        </p>
      </div>

      {/* What it does */}
      <div className="border border-slate-800 rounded-2xl p-5 bg-slate-900/50 space-y-4">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">How it works</h2>
        </div>
        <ol className="space-y-3 text-sm text-slate-400">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center">1</span>
            <span>Echo collects activity from the sources you use — nothing you haven't touched.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center">2</span>
            <span>When you run an analysis, it looks at your last 30 days of activity — a bounded window, never your entire history at once.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center">3</span>
            <span>It surfaces short, plain-language insights — patterns in how you work, trade, or engage — so you can act on them.</span>
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
            Privacy: Echo only ever analyzes your own activity. Data collection stops the moment
            your subscription lapses, and nothing is shared with other users or admins.
          </p>
        </div>
      </div>

      {/* Status */}
      <div className="border border-slate-800 rounded-2xl p-5 space-y-3 bg-slate-900/50">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-sm">Status</span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-400'
          }`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        {subscription?.expiry && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Renews</span>
            <span className="text-white">{new Date(subscription.expiry).toLocaleDateString()}</span>
          </div>
        )}
        {subscription?.last_paid_at && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Last paid</span>
            <span className="text-white">{new Date(subscription.last_paid_at).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {error && <div className="text-sm text-red-400">{error}</div>}
      {message && <div className="text-sm text-green-400">{message}</div>}

      {!isActive ? (
        <div className="border border-slate-800 rounded-2xl p-5 bg-slate-900/50 space-y-4">
          <h2 className="text-lg font-medium text-white">Subscribe — {SUBSCRIPTION_FEE_FLAME_COIN} Flame Coin / month</h2>
          <p className="text-sm text-slate-500">
            Deducted from your primary wallet. Available to every account type. Cancel anytime by letting it lapse.
          </p>
          <button
            onClick={handleSubscribe}
            disabled={subscribing}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl py-2.5 font-medium disabled:opacity-50 transition"
          >
            {subscribing ? 'Activating...' : `Subscribe for ${SUBSCRIPTION_FEE_FLAME_COIN} Flame Coin`}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-white">Insights</h2>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="bg-slate-800 hover:bg-slate-700 text-white rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50 transition"
            >
              {analyzing ? 'Analyzing...' : 'Analyze now'}
            </button>
          </div>

          {insights.length === 0 ? (
            <div className="border border-slate-800 rounded-2xl p-8 text-center bg-slate-900/50">
              <p className="text-slate-500 text-sm">
                No insights yet. Keep using the extension and apps, then run an analysis.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {insights.map((insight) => (
                <div key={insight.id} className="border border-slate-800 rounded-xl p-4 bg-slate-900/50">
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
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
