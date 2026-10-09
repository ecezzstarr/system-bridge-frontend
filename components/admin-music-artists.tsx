'use client'

import { useCallback, useEffect, useState } from 'react'
import { Mic2 } from 'lucide-react'
import { visiblePoll } from '@/lib/visible-poll'
import { ARTIST_TIME_ZONE, type ArtistPerformance, type MusicArtistProfile } from '@/lib/music-artist-rules'
import { ArtistField, ArtistPerformanceControl, artistButtonClass, artistInputClass, artistRequest, performanceTime } from '@/components/music-artist-shared'

export function AdminMusicArtists() {
  const [artists, setArtists] = useState<MusicArtistProfile[]>([])
  const [performances, setPerformances] = useState<ArtistPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [tab, setTab] = useState<'artists' | 'schedule'>('artists')
  const [schedule, setSchedule] = useState({ artistId: '', title: '', startLocal: '', timeZone: ARTIST_TIME_ZONE, durationMinutes: 30, days: 1 })
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await artistRequest('/api/admin/dj/artists', undefined, undefined, signal)
      if (!signal?.aborted) { setArtists(data.artists); setPerformances(data.performances) }
    } catch (err) { if (!signal?.aborted) setError(err instanceof Error ? err.message : 'Could not load artists.') }
    finally { if (!signal?.aborted) setLoading(false) }
  }, [])
  useEffect(() => visiblePoll(signal => load(signal), 15000), [load])
  const operate = async (body: Record<string, unknown>, method = 'POST') => {
    if (busy) return
    setBusy(true); setError(''); setMessage('')
    try {
      await artistRequest('/api/admin/dj/artists', method, body)
      setMessage(body.action === 'schedule' ? 'Performance timetable saved. The artist has been notified.' : 'Artist programme updated.')
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not update artists.') }
    finally { setBusy(false) }
  }
  const activeArtists = artists.filter(artist => artist.status === 'active')
  return <section className="space-y-4 rounded-2xl border border-cyan-300/20 bg-slate-900/60 p-4 sm:p-5" aria-label="Artist employment and performances">
    <div><h2 className="flex items-center gap-2 text-xl font-bold text-white"><Mic2 className="h-5 w-5 text-cyan-300" />Artists & daily performances</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">Employ established and upcoming artists from Client, Bridger and Agent accounts. Review applications, send terms and assign daily DJ time slots after the artist accepts.</p></div>
    <div className="flex flex-wrap gap-2">
      <button type="button" className={artistButtonClass} aria-pressed={tab === 'artists'} onClick={() => setTab('artists')}>Artist applications</button>
      <button type="button" className={artistButtonClass} aria-pressed={tab === 'schedule'} onClick={() => setTab('schedule')}>Performance timetable</button>
    </div>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {message && <p role="status" className="text-sm text-emerald-200">{message}</p>}
    {loading ? <p className="text-sm text-slate-400">Loading artist programme…</p> : tab === 'artists' ? <div>
      {!artists.length && <p className="text-sm text-slate-400">No applications yet. Members can apply through Lifestyle → Music Artist.</p>}
      {artists.map(artist => <ArtistReview key={artist.user_id} artist={artist} busy={busy} operate={operate} />)}
    </div> : <div className="space-y-6">
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); void operate({ action: 'schedule', ...schedule }) }}>
        <h3 className="font-bold text-white">Assign performance slots</h3>
        {!activeArtists.length && <p className="text-sm text-slate-400">An artist must accept an offer before you can schedule performances.</p>}
        <ArtistField label="Employed artist"><select required className={artistInputClass} value={schedule.artistId} onChange={e => {
          const artist = activeArtists.find(a => a.user_id === e.target.value)
          setSchedule({ ...schedule, artistId: e.target.value, timeZone: artist?.time_zone || ARTIST_TIME_ZONE })
        }}><option value="">Choose an artist</option>{activeArtists.map(artist => <option key={artist.user_id} value={artist.user_id}>{artist.stage_name}</option>)}</select></ArtistField>
        <ArtistField label="Performance title"><input required minLength={2} maxLength={120} className={artistInputClass} value={schedule.title} onChange={e => setSchedule({ ...schedule, title: e.target.value })} /></ArtistField>
        <div className="grid gap-4 sm:grid-cols-2">
          <ArtistField label="First date and start time"><input type="datetime-local" required className={artistInputClass} value={schedule.startLocal} onChange={e => setSchedule({ ...schedule, startLocal: e.target.value })} /></ArtistField>
          <ArtistField label="Schedule time zone"><input required className={artistInputClass} value={schedule.timeZone} onChange={e => setSchedule({ ...schedule, timeZone: e.target.value })} maxLength={80} /></ArtistField>
          <ArtistField label="Minutes per performance"><input type="number" min={1} max={360} required className={artistInputClass} value={schedule.durationMinutes} onChange={e => setSchedule({ ...schedule, durationMinutes: Number(e.target.value) })} /></ArtistField>
          <ArtistField label="Consecutive days (1 for one performance)"><input type="number" min={1} max={31} required className={artistInputClass} value={schedule.days} onChange={e => setSchedule({ ...schedule, days: Number(e.target.value) })} /></ArtistField>
        </div>
        <p className="text-xs leading-5 text-slate-400">Daily slots keep the same local start time. The whole booking is saved only if every slot is available. Each artist presses Go live during their slot.</p>
        <button className={artistButtonClass} disabled={busy || !schedule.artistId}>Save performance timetable</button>
      </form>
      <div><h3 className="font-bold text-white">Current and upcoming slots</h3>
        {!performances.length && <p className="mt-2 text-sm text-slate-400">No performances scheduled yet.</p>}
        {performances.map(slot => <details key={slot.id} className="border-b border-white/10 py-3" open={slot.status === 'live'}>
          <summary className="cursor-pointer text-sm text-slate-200"><span className="font-bold">{slot.stage_name}</span> · {slot.status}<span className="mt-1 block text-xs text-slate-400">{performanceTime(slot)}</span></summary>
          <ArtistPerformanceControl slot={slot} active={true} admin busy={busy} operate={body => operate(body, 'PATCH')} />
        </details>)}
      </div>
    </div>}
  </section>
}

function ArtistReview({ artist, busy, operate }: { artist: MusicArtistProfile; busy: boolean; operate: (body: Record<string, unknown>) => Promise<void> }) {
  const [terms, setTerms] = useState(artist.offer_terms || '')
  const [note, setNote] = useState('')
  const [action, setAction] = useState(artist.status === 'active' ? 'end' : 'offer')
  useEffect(() => { setTerms(artist.offer_terms || '') }, [artist.offer_version, artist.offer_terms])
  useEffect(() => { setAction(artist.status === 'active' ? 'end' : 'offer') }, [artist.status])
  const reviewable = ['pending', 'offered', 'active'].includes(artist.status)
  return <details className="border-t border-white/10 py-4">
    <summary className="cursor-pointer text-sm text-white"><strong>{artist.stage_name}</strong> · {artist.experience} · {artist.status}<span className="mt-1 block text-xs text-slate-400">{artist.name} · {artist.source_role}</span></summary>
    <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300"><p>{artist.genre}</p><p className="whitespace-pre-wrap">{artist.introduction}</p>
      <p className="whitespace-pre-wrap">Available: {artist.availability} · {artist.time_zone}</p>
      {artist.sample_url && <a className="inline-block text-cyan-200 underline" href={artist.sample_url} target="_blank" rel="noopener noreferrer">Listen to music sample</a>}
      {artist.offer_terms && <p className="whitespace-pre-wrap border-l border-white/20 pl-3">{artist.offer_terms}</p>}
      {artist.accepted_at && <p className="text-xs text-slate-400">Accepted by {artist.accepted_name} · {new Date(artist.accepted_at).toLocaleString()}</p>}
      {reviewable && <form className="space-y-3" onSubmit={e => { e.preventDefault(); void operate({ action, artistId: artist.user_id, terms, note }) }}>
        <ArtistField label="Review decision"><select className={artistInputClass} value={action} onChange={e => setAction(e.target.value)}>{artist.status === 'active' ? <option value="end">End artist employment and cancel remaining slots</option> : <><option value="offer">Send employment offer</option><option value="reject">Reject application</option></>}</select></ArtistField>
        {action === 'offer' && <ArtistField label="Employment and payment terms"><textarea className={artistInputClass} required minLength={20} maxLength={5000} rows={5} value={terms} onChange={e => setTerms(e.target.value)} placeholder="Set the artist's pay, currency, payment timing, performance duties and employment period." /></ArtistField>}
        <ArtistField label={action === 'offer' ? 'Message to artist (optional)' : 'Reason for this decision'}><textarea className={artistInputClass} required={action !== 'offer'} minLength={action === 'offer' ? undefined : 5} maxLength={2000} value={note} onChange={e => setNote(e.target.value)} /></ArtistField>
        <button className={artistButtonClass} disabled={busy}>{action === 'offer' ? 'Send offer for artist acceptance' : action === 'reject' ? 'Reject application' : 'End employment'}</button>
      </form>}
    </div>
  </details>
}
