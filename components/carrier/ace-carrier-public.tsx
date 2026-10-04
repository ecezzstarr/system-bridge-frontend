'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Clipboard, Flame, Loader2, Radio, Share2, Users, Wifi, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

const VISITOR_STORAGE_KEY = 'weave_carrier_visitor_v1'

type CarrierData = {
  matchId: string
  aceUserId: string
  aceName: string
  title: string
  gameKey: string
  category: string
  streamUrl: string | null
  matchStatus: string
  aceResult: string | null
  scheduledAt: string | null
  startedAt: string | null
  endedAt: string | null
  headline: string
  message: string
  publicationStatus: string
  publishedAt: string | null
  updatedAt: string | null
  uniqueViews: number
  supports: number
  shares: number
  aceWinCalls: number
  aceLoseCalls: number
}

function getVisitorKey() {
  if (typeof window === 'undefined') return ''
  const existing = window.localStorage.getItem(VISITOR_STORAGE_KEY)
  if (existing) return existing
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `carrier-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
  window.localStorage.setItem(VISITOR_STORAGE_KEY, random)
  return random
}

export function AceCarrierPublic({ matchId }: { matchId: string }) {
  const [carrier, setCarrier] = useState<CarrierData | null>(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [supporting, setSupporting] = useState(false)
  const [supported, setSupported] = useState(false)
  const visitorKeyRef = useRef('')
  const viewedRef = useRef(false)

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/carrier/ace/${encodeURIComponent(matchId)}`, { cache: 'no-store' })
      const data = await response.json().catch(() => ({}))
      if (response.status === 404) {
        setMissing(true)
        setCarrier(null)
        return
      }
      if (!response.ok) throw new Error(data.error || 'Carrier could not load')
      setCarrier(data.carrier)
      setMissing(false)
    } catch {
      // Keep the last live Carrier state if a poll is interrupted.
    } finally {
      setLoading(false)
    }
  }, [matchId])

  const engage = useCallback(async (action: 'view' | 'support' | 'share', channel?: string) => {
    const visitorKey = visitorKeyRef.current || getVisitorKey()
    visitorKeyRef.current = visitorKey
    if (!visitorKey) return null
    const response = await fetch(`/api/carrier/ace/${encodeURIComponent(matchId)}/engage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorKey, action, channel }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'Carrier movement failed')
    if (data.metrics) {
      setCarrier(current => current ? { ...current, ...data.metrics } : current)
    }
    return data
  }, [matchId])

  useEffect(() => {
    visitorKeyRef.current = getVisitorKey()
    void load()
    const timer = window.setInterval(() => { void load() }, 10000)
    return () => window.clearInterval(timer)
  }, [load])

  useEffect(() => {
    if (!carrier || viewedRef.current || !visitorKeyRef.current) return
    viewedRef.current = true
    void engage('view').catch(() => {})
  }, [carrier, engage])

  const shareText = useMemo(() => {
    if (!carrier) return ''
    const lead = carrier.message || `${carrier.aceName} is playing ${carrier.title} in Weave Arena.`
    const url = typeof window !== 'undefined' ? window.location.href : ''
    return `${lead}\n\nWatch and support live through Carrier:\n${url}`
  }, [carrier])

  const support = async () => {
    if (supported || supporting) return
    setSupporting(true)
    try {
      await engage('support')
      setSupported(true)
    } finally {
      setSupporting(false)
    }
  }

  const copyCarrier = async () => {
    if (typeof window === 'undefined') return
    await navigator.clipboard.writeText(window.location.href)
    void engage('share', 'copy').catch(() => {})
  }

  const shareCarrier = async () => {
    if (typeof window === 'undefined' || !carrier) return
    if (navigator.share) {
      try {
        await navigator.share({ title: carrier.headline, text: carrier.message, url: window.location.href })
        void engage('share', 'native').catch(() => {})
        return
      } catch {
        return
      }
    }
    await copyCarrier()
  }

  const shareWhatsApp = () => {
    if (typeof window === 'undefined' || !carrier) return
    void engage('share', 'whatsapp').catch(() => {})
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer')
  }

  if (loading) {
    return <main className="relative z-10 flex min-h-screen items-center justify-center bg-[#020814] text-white"><Loader2 className="h-8 w-8 animate-spin text-yellow-300" /></main>
  }

  if (missing || !carrier) {
    return (
      <main className="relative z-10 flex min-h-screen items-center justify-center bg-[#020814] px-5 text-white">
        <section className="w-full max-w-xl border-y border-white/10 py-12 text-center">
          <Radio className="mx-auto h-9 w-9 text-slate-600" />
          <h1 className="mt-4 text-2xl font-black">THIS CARRIER IS CLOSED</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">The Ace has not published this activity or has paused its public movement.</p>
        </section>
      </main>
    )
  }

  const live = carrier.matchStatus === 'live'
  const settling = carrier.matchStatus === 'settling'
  const completed = carrier.matchStatus === 'completed' || carrier.matchStatus === 'cancelled'
  const scheduled = carrier.scheduledAt ? new Date(carrier.scheduledAt) : null

  return (
    <main className="relative z-10 min-h-screen bg-[#020814] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(245,158,11,.12),transparent_27%),radial-gradient(circle_at_18%_52%,rgba(14,165,233,.08),transparent_30%)]" />
      <section className="relative mx-auto w-full max-w-5xl px-0 pb-12 sm:px-5 sm:pt-5">
        <header className="border-y border-yellow-300/15 bg-[#07101d]/92 px-5 py-5 sm:rounded-t-[2rem] sm:border">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300">WEAVE CARRIER</span>
                {live && <span className="inline-flex items-center gap-1 bg-red-500 px-2 py-1 text-[8px] font-black text-white"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />LIVE</span>}
              </div>
              <h1 className="mt-3 break-words text-2xl font-black tracking-tight sm:text-4xl">{carrier.headline}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{carrier.message}</p>
              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">ACE · <span className="text-yellow-200">{carrier.aceName}</span> · {carrier.gameKey}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Game</p>
              <p className="mt-1 text-xs font-black text-white">{String(carrier.matchStatus || '').toUpperCase()}</p>
              {scheduled && <p className="mt-1 text-[10px] text-slate-500">{scheduled.toLocaleString()}</p>}
            </div>
          </div>
        </header>

        <section className="overflow-hidden border-b border-white/10 bg-black/60 sm:border-x">
          {carrier.streamUrl && (live || settling || completed) ? (
            <div className="aspect-video w-full bg-black">
              <iframe
                src={carrier.streamUrl}
                title={`${carrier.aceName} · ${carrier.title}`}
                className="h-full w-full"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,.08),transparent_34%),#01040a] px-5 text-center">
              <Wifi className="h-10 w-10 text-yellow-300/40" />
              <p className="mt-4 text-sm font-black text-slate-300">{live ? 'LIVE STREAM LINK IS FORMING' : completed ? 'THIS GAME HAS ENDED' : 'THE ACE HAS NOT STARTED THE STREAM YET'}</p>
              <p className="mt-2 max-w-md text-xs leading-5 text-slate-600">Carrier stays on this game and opens the stream here when the Ace brings it live.</p>
            </div>
          )}
        </section>

        <section className="grid grid-cols-3 border-b border-white/10 bg-[#06101c]/90 text-center sm:border-x">
          <div className="px-2 py-4"><Users className="mx-auto h-4 w-4 text-sky-300" /><p className="mt-2 text-xl font-black">{carrier.uniqueViews}</p><p className="mt-1 text-[8px] font-black uppercase tracking-widest text-slate-600">Reached</p></div>
          <div className="border-x border-white/10 px-2 py-4"><Flame className="mx-auto h-4 w-4 text-yellow-300" /><p className="mt-2 text-xl font-black">{carrier.supports}</p><p className="mt-1 text-[8px] font-black uppercase tracking-widest text-slate-600">Support</p></div>
          <div className="px-2 py-4"><Share2 className="mx-auto h-4 w-4 text-emerald-300" /><p className="mt-2 text-xl font-black">{carrier.shares}</p><p className="mt-1 text-[8px] font-black uppercase tracking-widest text-slate-600">Carried onward</p></div>
        </section>

        <section className="border-b border-white/10 bg-[#07101d]/95 px-5 py-5 sm:border-x sm:rounded-b-[2rem]">
          <div className="flex flex-wrap gap-2">
            <Button disabled={supported || supporting} onClick={support} className="bg-yellow-400 font-black text-slate-950 hover:bg-yellow-300">
              {supporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              {supported ? 'SUPPORT CARRIED' : `SUPPORT ${carrier.aceName.toUpperCase()}`}
            </Button>
            <Button onClick={shareWhatsApp} variant="outline" className="border-emerald-300/25 text-emerald-200">WHATSAPP</Button>
            <Button onClick={shareCarrier} variant="outline" className="border-white/15 text-slate-200"><Share2 className="mr-2 h-4 w-4" />SHARE</Button>
            <Button onClick={copyCarrier} variant="ghost" className="text-slate-400"><Clipboard className="mr-2 h-4 w-4" />COPY LINK</Button>
          </div>
          <p className="mt-4 text-[10px] leading-5 text-slate-500">Enter and watch. No WEAVE account is required. Carrier is the public movement of this Ace activity; subscribed WEAVE access is only required to become an Ace and publish games.</p>
          {(carrier.aceWinCalls > 0 || carrier.aceLoseCalls > 0) && (
            <div className="mt-4 flex gap-5 border-t border-white/10 pt-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <span>WEAVE calls · Ace wins <strong className="text-emerald-300">{carrier.aceWinCalls}</strong></span>
              <span>Ace falls <strong className="text-red-300">{carrier.aceLoseCalls}</strong></span>
            </div>
          )}
        </section>
      </section>
    </main>
  )
}
