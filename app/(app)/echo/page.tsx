'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-provider'
import {
  Activity,
  BookOpen,
  BrainCircuit,
  GitBranch,
  Globe2,
  Landmark,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react'

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

const WORLD_ROUTES = [
  { label: 'Holding', detail: 'Operational Flame Coin balance', href: '/wallet', icon: Wallet },
  { label: 'Record', detail: 'Preserved value movement', href: '/ledger', icon: BookOpen },
  { label: 'Standing', detail: 'Current WEAVE position', href: '/weave/standing', icon: Globe2 },
  { label: 'Company Loops', detail: 'Current company movement', href: '/company/loops', icon: GitBranch },
  { label: 'Bridge Plaza', detail: 'Shared world + Client support', href: '/weave', icon: Landmark },
]

export default function EchoPage() {
  const { user, token } = useAuth()
  const [subscription, setContinuance] = useState<Continuance | null>(null)
  const [insights, setInsights] = useState<Insight[]>([])
  const [flameCoinBalance, setFlameCoinBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const isActive = Boolean(
    subscription?.status === 'active' &&
    subscription.expiry &&
    new Date(subscription.expiry) > new Date()
  )

  const authHeaders = (): Headers => {
    const headers = new Headers()
    const currentToken = token || (typeof window !== 'undefined' ? localStorage.getItem('ssb_auth_token') : null)
    if (currentToken) headers.set('Authorization', `Bearer ${currentToken}`)
    return headers
  }

  useEffect(() => {
    if (user) void load()
    else setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const headers = authHeaders()
      const [subRes, walletRes] = await Promise.all([
        fetch('/api/echo/subscribe', { headers }),
        fetch('/api/wallet/balance', { headers }),
      ])

      const [subData, walletData] = await Promise.all([subRes.json(), walletRes.json()])
      setContinuance(subData.subscription || null)
      if (walletData.success) setFlameCoinBalance(Number(walletData.flameCoinBalance || 0))

      if (subData.subscription?.status === 'active') {
        const insightRes = await fetch('/api/echo/insights', { headers })
        const insightData = await insightRes.json()
        setInsights(insightData.insights || [])
      } else {
        setInsights([])
      }
    } catch {
      setError('Echo Board could not synchronize its live state.')
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
        setMessage('Echo is active. Authorized activity can now form continuity and insight.')
        await load()
      } else if (data.reason === 'insufficient_balance') {
        setError(`Insufficient balance. Need ${data.requiredFlameCoin} Flame Coin; Holding has ${data.availableFlameCoin}.`)
      } else {
        setError(data.error || 'Echo continuance could not be activated.')
      }
    } catch {
      setError('Echo continuance could not be activated.')
    } finally {
      setSubscribing(false)
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/echo/insights', { method: 'POST', headers: authHeaders() })
      const data = await res.json()
      if (res.ok) {
        setInsights(data.insights || [])
        if ((data.insights || []).length === 0) {
          setMessage('No new insight yet. Echo only works from authorized activity that has actually been received.')
        }
      } else {
        setError(data.error || 'Echo analysis could not complete.')
      }
    } catch {
      setError('Echo analysis could not complete.')
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[42vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300" />
          <p className="mt-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Synchronizing Echo Board</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <div className="p-6 text-center text-slate-400">Enter WEAVE to open Echo Board.</div>
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-1 sm:p-2">
      <section className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
        <div className="relative min-h-[280px] overflow-hidden rounded-[2rem] border border-cyan-300/15 bg-[#030a15]/68">
          <EchoOrb />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#030a15] via-transparent to-transparent" />
          <div className="absolute inset-x-5 bottom-5">
            <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] text-cyan-300">
              <Sparkles className="h-4 w-4" />
              Echo Board
            </div>
            <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">Intelligence that returns movement to the world.</h1>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-400">
              Echo works from activity that the user has authorized and that connected WEAVE surfaces actually submit. It preserves continuity, surfaces bounded insight and routes the user back into live WEAVE systems.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-amber-300/15 bg-amber-400/[0.04] p-4">
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-amber-300">Holding</p>
            <p className="mt-2 text-2xl font-black text-white">{flameCoinBalance === null ? '—' : flameCoinBalance.toLocaleString()}</p>
            <p className="mt-1 text-[10px] text-slate-500">Flame Coin · 1 Flame Coin = 1 TRX</p>
            <Link href="/wallet" className="mt-3 inline-flex text-[9px] font-black uppercase tracking-[0.12em] text-amber-200">Open Holding →</Link>
          </div>

          <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.04] p-4">
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-emerald-300">Echo continuance</p>
            <p className="mt-2 text-lg font-black text-white">{isActive ? 'Active' : 'Inactive'}</p>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">
              {subscription?.expiry ? `Through ${new Date(subscription.expiry).toLocaleDateString()}` : 'Activate when you want Echo continuity.'}
            </p>
          </div>

          <div className="sm:col-span-2 rounded-2xl border border-sky-300/15 bg-sky-400/[0.04] p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-sky-300">Authorization rule</p>
                <p className="mt-2 text-[11px] leading-5 text-slate-300">
                  Echo does not invent account activity and does not gain permission merely because a user exists in WEAVE. Connected browser, mobile or web surfaces must authenticate and submit activity through the Echo ingest path, and an active Echo continuance is checked on every write.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-black/20 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-300" />
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-cyan-300">World routing</p>
            <p className="mt-1 text-xs text-slate-400">Echo Board returns insight to working systems instead of becoming another isolated page.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {WORLD_ROUTES.map(({ label, detail, href, icon: Icon }) => (
            <Link key={href} href={href} className="rounded-2xl border border-white/10 bg-white/[0.025] p-3 transition hover:border-cyan-300/20 hover:bg-cyan-400/[0.04]">
              <Icon className="h-4 w-4 text-cyan-300" />
              <p className="mt-2 text-[10px] font-black text-white">{label}</p>
              <p className="mt-1 text-[8px] leading-4 text-slate-500">{detail}</p>
            </Link>
          ))}
        </div>
      </section>

      {error && <div className="rounded-xl border border-red-300/15 bg-red-400/[0.04] p-3 text-xs text-red-300">{error}</div>}
      {message && <div className="rounded-xl border border-emerald-300/15 bg-emerald-400/[0.04] p-3 text-xs text-emerald-300">{message}</div>}

      {!isActive ? (
        <section className="rounded-[2rem] border border-violet-300/15 bg-violet-400/[0.035] p-5">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-violet-300" />
            <h2 className="text-sm font-black text-white">Activate Echo continuity</h2>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            {SUBSCRIPTION_FEE_FLAME_COIN} Flame Coin per month is deducted from Holding. Activation creates the user&apos;s Echo identity if one does not already exist.
          </p>
          <button
            onClick={handleSubscribe}
            disabled={subscribing}
            className="mt-4 w-full rounded-xl bg-violet-300 px-4 py-3 text-xs font-black text-slate-950 disabled:opacity-50"
          >
            {subscribing ? 'Activating Echo…' : `Activate · ${SUBSCRIPTION_FEE_FLAME_COIN} Flame Coin`}
          </button>
        </section>
      ) : (
        <section className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.18em] text-cyan-300">Authorized insight</p>
              <h2 className="mt-1 text-lg font-black text-white">Recent Echo</h2>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="rounded-xl border border-cyan-300/15 bg-cyan-400/[0.06] px-4 py-2 text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100 disabled:opacity-50"
            >
              {analyzing ? 'Analyzing…' : 'Analyze received activity'}
            </button>
          </div>

          {insights.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-slate-500">
              Echo has no stored insight yet. It will not fabricate one without received activity.
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {insights.map(insight => (
                <article key={insight.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[8px] font-black uppercase tracking-[0.12em] text-cyan-300">{insight.category || 'Echo'}</span>
                    <span className="text-[8px] text-slate-600">{new Date(insight.generated_at).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-300">{insight.summary}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  )
}
