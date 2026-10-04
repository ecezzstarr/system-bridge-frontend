'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Flame, Gamepad2, Loader2, Play, Plus, Radio, ShieldCheck, Swords, Trophy, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useArenaMatches } from '@/lib/hooks'
import { useAuth } from '@/lib/auth-provider'
import { toast } from 'sonner'

const GAMES = [
  { id: 'efootball', name: 'eFootball', icon: Trophy },
  { id: 'football', name: 'Football', icon: Trophy },
  { id: 'racing', name: 'Racing', icon: Flame },
  { id: 'fighting', name: 'Fighting', icon: Swords },
  { id: 'esports', name: 'Online Games', icon: Gamepad2 },
]

function localHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ssb_auth_token') : null
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function patchGame(matchId: string, body: Record<string, unknown>) {
  const response = await fetch(`/api/arena/matches/${matchId}`, {
    method: 'PATCH',
    headers: localHeaders(),
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Arena movement failed')
  return data
}

export default function Arena({ user: propUser }: { user?: any }) {
  const { user: authUser } = useAuth()
  const user = propUser || authUser
  const { data: matchesData, isLoading, mutate } = useArenaMatches({ limit: 50 })
  const [activeGame, setActiveGame] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [moving, setMoving] = useState<string | null>(null)
  const [predicting, setPredicting] = useState<string | null>(null)
  const [carrierAccess, setCarrierAccess] = useState<{ active: boolean; reason?: string; gate?: string }>({ active: false })
  const [newGame, setNewGame] = useState({
    title: 'eFootball Division League',
    description: 'Flame Event seasonal Ace run',
    category: 'efootball',
    gameKey: 'efootball-division-league',
    streamUrl: '',
    startsAt: '',
  })

  const matches = matchesData?.matches || []
  const visible = useMemo(() => (
    activeGame === 'all' ? matches : matches.filter((match: any) => match.category === activeGame || match.gameKey === activeGame)
  ), [matches, activeGame])

  useEffect(() => {
    if (!user?.id) return
    fetch('/api/carrier/access', { headers: localHeaders(), cache: 'no-store' })
      .then(async response => ({ response, data: await response.json().catch(() => ({})) }))
      .then(({ response, data }) => {
        if (response.ok) setCarrierAccess({ active: Boolean(data.access?.active), reason: data.access?.reason, gate: data.access?.gate })
      })
      .catch(() => {})
  }, [user?.id])

  const gateHref = user?.role === 'agent'
    ? '/weave/lifestyles'
    : user?.role === 'bridger'
      ? '/bridger/subscription'
      : user?.role === 'client'
        ? '/client/system-switch#enterprise'
        : '/weave/carrier'

  const gateLabel = user?.role === 'agent'
    ? 'OPEN MONTHLY WEAVE'
    : user?.role === 'bridger'
      ? 'RESTORE CONTINUANCE'
      : user?.role === 'client'
        ? 'BECOME LORD / LADY'
        : 'OPEN CARRIER'

  const move = async (matchId: string, body: Record<string, unknown>, success: string) => {
    setMoving(matchId)
    try {
      await patchGame(matchId, body)
      await mutate()
      toast.success(success)
    } catch (error: any) {
      toast.error(error.message || 'Arena movement failed')
    } finally {
      setMoving(null)
    }
  }

  const predict = async (matchId: string, prediction: 'ACE_WIN' | 'ACE_LOSE') => {
    setPredicting(matchId)
    try {
      const response = await fetch(`/api/arena/matches/${matchId}/predict`, {
        method: 'POST',
        headers: localHeaders(),
        body: JSON.stringify({ prediction }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Prediction could not be recorded')
      await mutate()
      toast.success(prediction === 'ACE_WIN' ? 'You called an Ace win' : 'You called an Ace fall')
    } catch (error: any) {
      toast.error(error.message || 'Prediction could not be recorded')
    } finally {
      setPredicting(null)
    }
  }

  const createGame = async () => {
    if (!newGame.title || !newGame.startsAt) return
    setCreating(true)
    try {
      const response = await fetch('/api/arena/matches', {
        method: 'POST',
        headers: localHeaders(),
        body: JSON.stringify(newGame),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not enter as Ace')
      setShowCreate(false)
      await mutate()
      toast.success('Ace game entered')
    } catch (error: any) {
      toast.error(error.message || 'Could not enter as Ace')
    } finally {
      setCreating(false)
    }
  }

  return (
    <section className="weave-operating-environment min-h-[75vh] overflow-hidden border-y border-yellow-300/15 bg-[#070a10]/80 sm:rounded-[2rem] sm:border" data-arena-environment>
      <header className="border-b border-white/10 px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2"><Radio className="h-5 w-5 text-red-400" /><p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300/75">Carrier · Flame Event · Live Ground</p></div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">WEAVE ARENA</h1>
            <p className="mt-1 max-w-xl text-xs leading-5 text-slate-400">Inside Carrier every qualified participant is an Ace. Aces choose online games, stream their run and carry a seasonal record while every Weave role can watch and call the live outcome.</p>
          </div>
          {carrierAccess.active ? (
            <Button onClick={() => setShowCreate(true)} className="bg-yellow-400 font-black text-slate-950 hover:bg-yellow-300"><Plus className="mr-2 h-4 w-4" />ENTER AS ACE</Button>
          ) : (
            <div className="max-w-xs text-right">
              <Button asChild variant="outline" className="border-yellow-300/30 text-yellow-200"><Link href={gateHref}>{gateLabel}</Link></Button>
              {carrierAccess.reason && <p className="mt-2 text-[9px] leading-4 text-slate-600">{carrierAccess.reason}</p>}
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setActiveGame('all')} className={`whitespace-nowrap border-b px-3 py-2 text-[10px] font-black uppercase tracking-widest ${activeGame === 'all' ? 'border-yellow-300 text-white' : 'border-white/10 text-slate-500'}`}>All live games</button>
          {GAMES.map(game => (
            <button key={game.id} onClick={() => setActiveGame(game.id)} className={`flex items-center gap-2 whitespace-nowrap border-b px-3 py-2 text-[10px] font-black uppercase tracking-widest ${activeGame === game.id ? 'border-yellow-300 text-white' : 'border-white/10 text-slate-500'}`}>
              <game.icon className="h-3 w-3" />{game.name}
            </button>
          ))}
        </div>
      </header>

      <div className="px-3 py-5 sm:px-6">
        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-yellow-400" /></div>
        ) : visible.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center border-y border-dashed border-white/10 text-center">
            <Gamepad2 className="h-10 w-10 text-slate-700" />
            <p className="mt-3 text-sm font-black text-slate-400">NO ACE IS LIVE HERE</p>
            <p className="mt-1 text-xs text-slate-600">The ground opens when an Ace schedules a streamed game.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {visible.map((match: any) => {
              const live = match.status === 'live'
              const upcoming = match.status === 'upcoming'
              const settling = match.status === 'settling'
              const complete = match.status === 'completed' || match.status === 'cancelled'
              const isAce = String(match.host?.id || '') === String(user?.id || '')
              const canControl = user?.role === 'admin' || isAce
              const settleReady = match.settlementAvailableAt ? new Date(match.settlementAvailableAt).getTime() <= Date.now() : false

              return (
                <article key={match.id} data-arena-lane={match.id} className="overflow-hidden border-y border-white/10 bg-black/15 sm:border">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-4 py-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {live && <span className="inline-flex items-center gap-1 bg-red-500 px-2 py-1 text-[8px] font-black text-white"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />LIVE</span>}
                        {settling && <span className="bg-yellow-400/10 px-2 py-1 text-[8px] font-black text-yellow-300">20-MINUTE VERIFY</span>}
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{match.gameKey || match.category}</span>
                      </div>
                      <h2 className="mt-2 text-xl font-black text-white">{match.title}</h2>
                      <p className="mt-1 text-xs text-slate-400">ACE · <strong className="text-yellow-200">{match.aceName || match.host?.displayName || 'Ace'}</strong></p>
                    </div>
                    <div className="text-right"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Live calls</p><p className="text-xl font-black text-white">{Number(match.predictionCount || 0)}</p></div>
                  </div>

                  {match.streamUrl && (live || settling || complete) && (
                    <div className="aspect-video w-full bg-black"><iframe src={match.streamUrl} title={`${match.title} live stream`} className="h-full w-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div>
                  )}

                  <div className="grid grid-cols-3 border-y border-white/10 text-center">
                    <div className="px-2 py-3"><p className="text-[8px] font-black uppercase tracking-widest text-slate-600">Ace wins</p><p className="mt-1 text-sm font-black text-emerald-300">{Number(match.aceWinPredictions || 0)}</p></div>
                    <div className="border-x border-white/10 px-2 py-3"><p className="text-[8px] font-black uppercase tracking-widest text-slate-600">Ace falls</p><p className="mt-1 text-sm font-black text-red-300">{Number(match.aceLosePredictions || 0)}</p></div>
                    <div className="px-2 py-3"><p className="text-[8px] font-black uppercase tracking-widest text-slate-600">Status</p><p className="mt-1 text-sm font-black text-white">{String(match.status || '').toUpperCase()}</p></div>
                  </div>

                  {live && !isAce && (
                    <div className="flex flex-wrap gap-2 px-4 py-4">
                      <Button disabled={predicting === match.id} onClick={() => predict(match.id, 'ACE_WIN')} className="bg-emerald-500 font-black text-black hover:bg-emerald-400">ACE WINS</Button>
                      <Button disabled={predicting === match.id} onClick={() => predict(match.id, 'ACE_LOSE')} variant="outline" className="border-red-400/30 font-black text-red-300">ACE FALLS</Button>
                      <p className="w-full text-[10px] leading-4 text-slate-500">Calls remain open while the game is live and resolve after the 20-minute verification window.</p>
                    </div>
                  )}

                  {canControl && (
                    <div className="flex flex-wrap gap-2 border-t border-white/10 px-4 py-4">
                      {upcoming && <Button disabled={moving === match.id} onClick={() => move(match.id, { action: 'start' }, 'Arena game is live')} className="bg-emerald-500 font-black text-black hover:bg-emerald-400"><Play className="mr-2 h-4 w-4" />START STREAMED GAME</Button>}
                      {live && <>
                        <Button disabled={moving === match.id} onClick={() => move(match.id, { action: 'end', aceWon: true }, 'Game locked. Verification opens in 20 minutes.')} className="bg-yellow-400 font-black text-black hover:bg-yellow-300"><Trophy className="mr-2 h-4 w-4" />ACE WON</Button>
                        <Button disabled={moving === match.id} onClick={() => move(match.id, { action: 'end', aceWon: false }, 'Game locked. Ace loss recorded after verification.')} variant="outline" className="border-red-400/30 font-black text-red-300">ACE LOST</Button>
                      </>}
                      {settling && <Button disabled={moving === match.id || !settleReady} onClick={() => move(match.id, { action: 'settle' }, 'Arena result resolved')} className="bg-cyan-400 font-black text-black hover:bg-cyan-300"><ShieldCheck className="mr-2 h-4 w-4" />{settleReady ? 'RESOLVE RESULT' : 'WAITING 20 MINUTES'}</Button>}
                    </div>
                  )}

                  {complete && <div className="border-t border-white/10 px-4 py-3 text-xs font-bold text-slate-400">{match.settlementReason || (match.status === 'cancelled' ? 'Game cancelled.' : 'Game resolved.')}</div>}
                </article>
              )
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto border border-yellow-300/20 bg-[#0b0f17] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><p className="text-[9px] font-black uppercase tracking-[0.25em] text-yellow-300">Carrier · Ace Entry</p><h2 className="text-xl font-black text-white">CHOOSE GAME · OPEN STREAM</h2></div><button onClick={() => setShowCreate(false)}><X className="h-5 w-5 text-slate-500" /></button></div>
            <div className="space-y-4 p-5">
              <div><label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Game</label><select value={newGame.category} onChange={event => setNewGame(current => ({ ...current, category: event.target.value, gameKey: event.target.value }))} className="mt-1 w-full border border-white/10 bg-black/30 px-3 py-2 text-sm text-white">{GAMES.map(game => <option key={game.id} value={game.id}>{game.name}</option>)}</select></div>
              <div><label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Arena title</label><Input value={newGame.title} onChange={event => setNewGame(current => ({ ...current, title: event.target.value }))} className="mt-1 border-white/10 bg-black/30 text-white" /></div>
              <div><label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Start</label><Input type="datetime-local" value={newGame.startsAt} onChange={event => setNewGame(current => ({ ...current, startsAt: event.target.value }))} className="mt-1 border-white/10 bg-black/30 text-white" /></div>
              <div><label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Stream URL</label><Input value={newGame.streamUrl} onChange={event => setNewGame(current => ({ ...current, streamUrl: event.target.value }))} placeholder="Live stream / embed URL" className="mt-1 border-white/10 bg-black/30 text-white" /></div>
              <div className="border-y border-white/10 py-3 text-xs leading-5 text-slate-400">Your main Weave role remains unchanged outside Carrier. Inside Carrier your identity is Ace, and each result joins your seasonal Ace record.</div>
              <Button disabled={creating || !newGame.startsAt} onClick={createGame} className="w-full bg-yellow-400 font-black text-black hover:bg-yellow-300">{creating ? <Loader2 className="h-5 w-5 animate-spin" /> : 'ENTER AS ACE'}</Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}