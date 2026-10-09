'use client'

import { useEffect, useState } from 'react'
import { visiblePoll } from '@/lib/visible-poll'
import { ARTIST_TIME_ZONE, canStartArtistSlot, type ArtistPerformance } from '@/lib/music-artist-rules'

export const artistInputClass = 'mt-1 w-full min-w-0 rounded-xl border border-white/15 bg-slate-950/80 px-3 py-2.5 text-sm text-white'
export const artistButtonClass = 'rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-2.5 text-sm font-bold text-cyan-100 disabled:opacity-40'

export function artistHeaders(): Record<string, string> {
  const token = localStorage.getItem('ssb_auth_token')
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

export async function artistRequest(url: string, method?: string, body?: Record<string, unknown>, signal?: AbortSignal) {
  const response = await fetch(url, { headers: artistHeaders(), cache: 'no-store', method,
    ...(body ? { body: JSON.stringify(body) } : {}), signal })
  const data = await response.json()
  if (!response.ok || !data.success) throw new Error(data.error || 'Could not complete Music Artist request.')
  return data
}

export function performanceTime(slot: Pick<ArtistPerformance, 'starts_at' | 'ends_at' | 'time_zone'>, zone = slot.time_zone) {
  const start = new Date(slot.starts_at).toLocaleString('en-GB', { timeZone: zone, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
  const end = new Date(slot.ends_at).toLocaleString('en-GB', { timeZone: zone, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
  return `${start} – ${end} · ${zone}`
}

export function ArtistField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block min-w-0 text-xs font-semibold text-slate-300">{label}{children}</label>
}

export function ArtistPerformanceControl({ slot, active, admin = false, busy, operate }: {
  slot: ArtistPerformance; active: boolean; admin?: boolean; busy: boolean
  operate: (body: Record<string, unknown>) => Promise<void>
}) {
  const [source, setSource] = useState(slot.stream_url || '')
  useEffect(() => { setSource(slot.stream_url || '') }, [slot.stream_url])
  const action = (name: string, extra = {}) => operate({ action: name, performanceId: slot.id, ...extra })
  return <article className="space-y-3 border-t border-white/10 py-4">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><h3 className="font-bold text-white">{slot.title}</h3><p className="text-sm text-cyan-100">{slot.stage_name}</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">{performanceTime(slot)}</p></div>
      <span className={slot.status === 'live' ? 'text-xs font-bold uppercase text-emerald-300' : 'text-xs uppercase text-slate-400'}>{slot.status}</span>
    </div>
    {slot.status === 'scheduled' && <>
      <ArtistField label="Live audio listener URL"><input className={artistInputClass} type="url" value={source} onChange={e => setSource(e.target.value)} placeholder="https://your-station.com/live.mp3" maxLength={2048} disabled={!active || busy} /></ArtistField>
      <p className="text-xs leading-5 text-slate-400">Use a direct live MP3, AAC or Ogg listener URL. It is shared with listeners. A video page or broadcasting key will not play here.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={artistButtonClass} disabled={busy || !active || !source.trim()} onClick={() => void action('source', { streamUrl: source })}>Save audio source</button>
        <button type="button" className={artistButtonClass} disabled={busy || !active || !slot.stream_url || !canStartArtistSlot(slot)} onClick={() => void action('start')}>Go live</button>
        {slot.stream_url && <a href={slot.stream_url} target="_blank" rel="noopener noreferrer" className="px-2 py-2.5 text-sm text-slate-300 underline">Test saved audio</a>}
        {admin && <button type="button" className="px-2 py-2.5 text-sm text-red-300 disabled:opacity-40" disabled={busy} onClick={() => void action('cancel')}>Cancel slot</button>}
      </div>
      {!canStartArtistSlot(slot) && <p className="text-xs text-slate-500">Go live opens at your assigned start time and closes at the end.</p>}
    </>}
    {slot.status === 'live' && <button type="button" className={artistButtonClass} disabled={busy} onClick={() => void action('stop')}>End performance</button>}
  </article>
}

export function ArtistProgramme() {
  const [date, setDate] = useState(() => new Intl.DateTimeFormat('en-CA', { timeZone: ARTIST_TIME_ZONE }).format())
  const [performances, setPerformances] = useState<ArtistPerformance[]>([])
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    setLoaded(false)
    setPerformances([])
    return visiblePoll(async signal => {
      try {
        const data = await artistRequest(`/api/dj/schedule?date=${encodeURIComponent(date)}`, undefined, undefined, signal)
        if (signal.aborted) return
        setPerformances(data.performances); setError(''); setLoaded(true)
      } catch (err) { if (!signal.aborted) { setError(err instanceof Error ? err.message : 'Could not load the programme.'); setLoaded(true) } }
    }, 15000)
  }, [date])
  return <section className="space-y-4 border-t border-white/10 pt-6" aria-label="Daily music programme">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold text-white">Daily performances</h2><p className="text-xs text-slate-400">Programme times · {ARTIST_TIME_ZONE}</p></div>
      <ArtistField label="Programme date"><input type="date" className={artistInputClass} value={date} onChange={e => { if (e.target.value) setDate(e.target.value) }} /></ArtistField></div>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {!loaded ? <p className="text-sm text-slate-400">Loading programme…</p> : !performances.length && !error ? <p className="text-sm text-slate-400">No artist performances scheduled for this day.</p> : performances.map(slot => <div key={slot.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-3">
      <div><p className="font-bold text-white">{slot.stage_name} · {slot.title}</p><p className="mt-1 text-xs text-slate-400">{performanceTime(slot, ARTIST_TIME_ZONE)}</p></div>
      {slot.status === 'live' ? <button type="button" className={artistButtonClass} onClick={() => window.dispatchEvent(new Event('weave:dj-request-play'))}>Listen live</button> : <span className="text-xs uppercase text-slate-400">{slot.status}</span>}
    </div>)}
  </section>
}
