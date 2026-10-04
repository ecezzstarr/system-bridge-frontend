'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Clipboard, ExternalLink, Flame, Loader2, Megaphone, Pause, Play, Radio, RefreshCw, Share2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

type CarrierState = {
  headline: string
  message: string
  status: 'published' | 'paused'
  publicPath: string
  publicUrl: string
  publishedAt: string | null
  updatedAt: string | null
  uniqueViews: number
  supports: number
  shares: number
}

type CarrierGame = {
  id: string
  title: string
  category: string
  gameKey: string
  streamUrl: string | null
  matchStatus: string
  scheduledAt: string | null
  startedAt: string | null
  endedAt: string | null
  aceName: string
  carrier: CarrierState | null
}

type Draft = { headline: string; message: string }

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ssb_auth_token') : null
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export default function AceCarrierConsolePage() {
  const [games, setGames] = useState<CarrierGame[]>([])
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [loading, setLoading] = useState(true)
  const [moving, setMoving] = useState<string | null>(null)
  const [needsSubscription, setNeedsSubscription] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/carrier/ace', { headers: authHeaders(), cache: 'no-store' })
      const data = await response.json().catch(() => ({}))
      if (response.status === 403) {
        setNeedsSubscription(true)
        setGames([])
        return
      }
      if (!response.ok) throw new Error(data.error || 'Carrier could not open')
      const nextGames: CarrierGame[] = data.games || []
      setGames(nextGames)
      setNeedsSubscription(false)
      setDrafts(current => {
        const next = { ...current }
        for (const game of nextGames) {
          if (!next[game.id]) {
            next[game.id] = {
              headline: game.carrier?.headline || `${game.aceName} · ${game.title}`,
              message: game.carrier?.message || `${game.aceName} is playing ${game.title} in Weave Arena. Enter, watch and support the movement live.`,
            }
          }
        }
        return next
      })
    } catch (error: any) {
      toast.error(error.message || 'Carrier could not open')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const publishedCount = useMemo(() => games.filter(game => game.carrier?.status === 'published').length, [games])
  const totalReach = useMemo(() => games.reduce((sum, game) => sum + Number(game.carrier?.uniqueViews || 0), 0), [games])
  const totalSupport = useMemo(() => games.reduce((sum, game) => sum + Number(game.carrier?.supports || 0), 0), [games])

  const publish = async (game: CarrierGame) => {
    setMoving(game.id)
    try {
      const draft = drafts[game.id]
      const response = await fetch('/api/carrier/ace', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ matchId: game.id, headline: draft?.headline, message: draft?.message }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Carrier could not publish')
      toast.success('Carrier published. Outsiders can enter directly.')
      await load()
    } catch (error: any) {
      toast.error(error.message || 'Carrier could not publish')
    } finally {
      setMoving(null)
    }
  }

  const changeStatus = async (game: CarrierGame, action: 'pause' | 'publish') => {
    setMoving(game.id)
    try {
      const response = await fetch('/api/carrier/ace', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ matchId: game.id, action }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Carrier could not change')
      toast.success(action === 'pause' ? 'Carrier paused' : 'Carrier reopened')
      await load()
    } catch (error: any) {
      toast.error(error.message || 'Carrier could not change')
    } finally {
      setMoving(null)
    }
  }

  const copyLink = async (game: CarrierGame) => {
    if (!game.carrier?.publicUrl) return
    await navigator.clipboard.writeText(game.carrier.publicUrl)
    toast.success('Carrier link copied')
  }

  const shareWhatsApp = (game: CarrierGame) => {
    if (!game.carrier?.publicUrl) return
    const draft = drafts[game.id]
    const message = `${draft?.message || `${game.aceName} is playing ${game.title} in Weave Arena.`}\n\nEnter, watch and support:\n${game.carrier.publicUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  const shareNative = async (game: CarrierGame) => {
    if (!game.carrier?.publicUrl) return
    const draft = drafts[game.id]
    if (navigator.share) {
      try {
        await navigator.share({
          title: draft?.headline || game.title,
          text: draft?.message || `${game.aceName} is playing ${game.title} in Weave Arena.`,
          url: game.carrier.publicUrl,
        })
        return
      } catch {
        return
      }
    }
    await copyLink(game)
  }

  return (
    <main className="weave-operating-environment min-h-[75vh] overflow-hidden border-y border-yellow-300/15 bg-[#07101a]/82 text-white sm:rounded-[2rem] sm:border">
      <header className="border-b border-white/10 px-4 py-6 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-yellow-300" /><p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300/75">Carrier · Ace Movement</p></div>
            <h1 className="mt-2 text-3xl font-black tracking-tight">PUBLISH THE ACE</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Turn each Arena game into one public Carrier. Send it through WhatsApp or the web. The person receiving it enters the activity directly, watches and supports without registration.</p>
          </div>
          <Button onClick={() => void load()} variant="outline" className="border-white/15 text-slate-200"><RefreshCw className="mr-2 h-4 w-4" />REFRESH</Button>
        </div>

        <div className="mt-6 grid grid-cols-3 border-y border-white/10 text-center">
          <div className="px-2 py-4"><Radio className="mx-auto h-4 w-4 text-red-300" /><p className="mt-2 text-xl font-black">{publishedCount}</p><p className="mt-1 text-[8px] font-black uppercase tracking-widest text-slate-600">Public Carriers</p></div>
          <div className="border-x border-white/10 px-2 py-4"><Users className="mx-auto h-4 w-4 text-sky-300" /><p className="mt-2 text-xl font-black">{totalReach}</p><p className="mt-1 text-[8px] font-black uppercase tracking-widest text-slate-600">Reached</p></div>
          <div className="px-2 py-4"><Flame className="mx-auto h-4 w-4 text-yellow-300" /><p className="mt-2 text-xl font-black">{totalSupport}</p><p className="mt-1 text-[8px] font-black uppercase tracking-widest text-slate-600">Support</p></div>
        </div>
      </header>

      {loading ? (
        <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-yellow-300" /></div>
      ) : needsSubscription ? (
        <section className="px-5 py-14 text-center">
          <h2 className="text-xl font-black">CARRIER OPENS WITH SUBSCRIBED WEAVE</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Carrier is not the subscription. It is one system available to Aces inside the subscribed Weave layer.</p>
          <Button asChild className="mt-5 bg-yellow-400 font-black text-slate-950 hover:bg-yellow-300"><Link href="/weave/lifestyles">OPEN SUBSCRIBED WEAVE</Link></Button>
        </section>
      ) : games.length === 0 ? (
        <section className="px-5 py-14 text-center">
          <h2 className="text-xl font-black">NO ACE ACTIVITY TO CARRY YET</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Schedule a streamed game in Weave Arena first. Carrier will then make that activity publishable outside Weave.</p>
          <Button asChild className="mt-5 bg-yellow-400 font-black text-slate-950 hover:bg-yellow-300"><Link href="/arena">ENTER ARENA</Link></Button>
        </section>
      ) : (
        <section className="space-y-5 px-3 py-5 sm:px-6">
          {games.map(game => {
            const draft = drafts[game.id] || { headline: `${game.aceName} · ${game.title}`, message: '' }
            const isPublished = game.carrier?.status === 'published'
            const isPaused = game.carrier?.status === 'paused'
            return (
              <article key={game.id} className="border-y border-white/10 bg-black/15 sm:border">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-4 py-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-300">ACE · {game.aceName}</span>
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">{game.gameKey}</span>
                      {isPublished && <span className="bg-emerald-400/10 px-2 py-1 text-[8px] font-black text-emerald-300">PUBLIC</span>}
                      {isPaused && <span className="bg-slate-400/10 px-2 py-1 text-[8px] font-black text-slate-400">PAUSED</span>}
                    </div>
                    <h2 className="mt-2 text-xl font-black">{game.title}</h2>
                    <p className="mt-1 text-xs text-slate-500">Arena · {String(game.matchStatus || '').toUpperCase()}{game.scheduledAt ? ` · ${new Date(game.scheduledAt).toLocaleString()}` : ''}</p>
                  </div>
                  {game.carrier && (
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div><p className="text-lg font-black">{game.carrier.uniqueViews}</p><p className="text-[7px] font-black uppercase tracking-widest text-slate-600">Reach</p></div>
                      <div><p className="text-lg font-black text-yellow-200">{game.carrier.supports}</p><p className="text-[7px] font-black uppercase tracking-widest text-slate-600">Support</p></div>
                      <div><p className="text-lg font-black text-emerald-200">{game.carrier.shares}</p><p className="text-[7px] font-black uppercase tracking-widest text-slate-600">Shares</p></div>
                    </div>
                  )}
                </div>

                <div className="grid gap-4 px-4 py-4 lg:grid-cols-[1fr_1.4fr]">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Carrier headline</label>
                    <Input
                      value={draft.headline}
                      onChange={event => setDrafts(current => ({ ...current, [game.id]: { ...draft, headline: event.target.value } }))}
                      maxLength={180}
                      className="mt-1 border-white/10 bg-black/30 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Message people receive</label>
                    <textarea
                      value={draft.message}
                      onChange={event => setDrafts(current => ({ ...current, [game.id]: { ...draft, message: event.target.value } }))}
                      maxLength={1200}
                      rows={3}
                      className="mt-1 w-full resize-none border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-yellow-300/30"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-white/10 px-4 py-4">
                  <Button disabled={moving === game.id} onClick={() => void publish(game)} className="bg-yellow-400 font-black text-slate-950 hover:bg-yellow-300">
                    {moving === game.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Megaphone className="mr-2 h-4 w-4" />}
                    {game.carrier ? 'UPDATE & PUBLISH' : 'PUBLISH CARRIER'}
                  </Button>
                  {isPublished && <Button disabled={moving === game.id} onClick={() => void changeStatus(game, 'pause')} variant="outline" className="border-white/15 text-slate-300"><Pause className="mr-2 h-4 w-4" />PAUSE</Button>}
                  {isPaused && <Button disabled={moving === game.id} onClick={() => void changeStatus(game, 'publish')} variant="outline" className="border-emerald-300/20 text-emerald-200"><Play className="mr-2 h-4 w-4" />REOPEN</Button>}
                  {game.carrier && <>
                    <Button onClick={() => shareWhatsApp(game)} variant="outline" className="border-emerald-300/20 text-emerald-200">WHATSAPP</Button>
                    <Button onClick={() => void shareNative(game)} variant="outline" className="border-sky-300/20 text-sky-200"><Share2 className="mr-2 h-4 w-4" />SHARE</Button>
                    <Button onClick={() => void copyLink(game)} variant="ghost" className="text-slate-400"><Clipboard className="mr-2 h-4 w-4" />COPY</Button>
                    <Button asChild variant="ghost" className="text-slate-400"><Link href={game.carrier.publicPath} target="_blank"><ExternalLink className="mr-2 h-4 w-4" />OPEN PUBLIC</Link></Button>
                  </>}
                </div>
              </article>
            )
          })}
        </section>
      )}
    </main>
  )
}
