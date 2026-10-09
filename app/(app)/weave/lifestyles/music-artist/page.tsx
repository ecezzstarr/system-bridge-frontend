'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Mic2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { visiblePoll } from '@/lib/visible-poll'
import { ARTIST_DUTY, ARTIST_TIME_ZONE, type ArtistPerformance, type MusicArtistProfile } from '@/lib/music-artist-rules'
import { ArtistField, ArtistPerformanceControl, ArtistProgramme, artistButtonClass, artistInputClass, artistRequest } from '@/components/music-artist-shared'

type ArtistState = { artist: MusicArtistProfile | null; performances: ArtistPerformance[]; access: { active: boolean; role: string } }

export default function MusicArtistPage() {
  const { user } = useAuth()
  const [state, setState] = useState<ArtistState | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [signature, setSignature] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [form, setForm] = useState({ stageName: '', experience: 'upcoming', genre: '', sampleUrl: '', availability: '', timeZone: ARTIST_TIME_ZONE, introduction: '' })
  const eligible = Boolean(user && ['agent', 'bridger', 'client'].includes(user.role || ''))
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await artistRequest('/api/music-artist', undefined, undefined, signal)
      if (!signal?.aborted) setState(data)
    } catch (err) { if (!signal?.aborted) setError(err instanceof Error ? err.message : 'Could not load your artist application.') }
    finally { if (!signal?.aborted) setLoading(false) }
  }, [])
  useEffect(() => {
    if (!eligible) { setLoading(false); return }
    return visiblePoll(signal => load(signal), 10000)
  }, [eligible, load])
  // Acceptance belongs to the exact offer the person read, never a replacement.
  useEffect(() => { setSignature(''); setAccepted(false) }, [state?.artist?.offer_version])

  const submit = async (body: Record<string, unknown>, performance = false) => {
    if (busy) return
    setBusy(true); setError(''); setMessage('')
    try {
      await artistRequest(performance ? '/api/music-artist/performances' : '/api/music-artist', performance ? 'PATCH' : 'POST', body)
      setMessage(body.action === 'apply' ? 'Application sent to Administration.' : body.action === 'accept_offer' ? 'Offer accepted. Administration can now schedule your performances.' : 'Performance updated.')
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not complete the request.') }
    finally { setBusy(false) }
  }
  const artist = state?.artist
  const canApply = state?.access.active && (!artist || ['rejected', 'ended'].includes(artist.status))
  const active = Boolean(state?.access.active && artist?.status === 'active')

  return <main className="mx-auto max-w-4xl space-y-6 rounded-3xl border border-white/10 bg-[#080b12]/85 p-4 sm:p-7" data-lifestyle-home="music-artist">
    <header className="space-y-3"><Link href="/weave/lifestyles" className="text-xs text-slate-400 underline">Lifestyle</Link>
      <h1 className="flex items-center gap-3 text-3xl font-black text-white"><Mic2 className="h-8 w-8 text-cyan-300" />Music Artist</h1>
      <p className="max-w-2xl text-sm leading-6 text-slate-300">Established and upcoming artists perform live across WEAVE through DJ broadcasting. Apply from your Client, Bridger or Agent account.</p>
    </header>
    {error && <p role="alert" className="rounded-xl border border-red-300/20 p-3 text-sm text-red-200">{error}</p>}
    {message && <p role="status" className="text-sm text-emerald-200">{message}</p>}
    {user?.role === 'admin' ? <Link className={artistButtonClass} href="/admin/dj-workshop">Manage artists in DJ Workshop</Link> : loading ? <p role="status" className="text-slate-400">Loading your artist place…</p> : <>
      {state && !state.access.active && <p className="text-sm text-amber-200">Renew your {state.access.role} monthly subscription to apply or perform. Music Artist uses the same Lifestyle access.</p>}
      {artist && <section className="space-y-2 border-y border-white/10 py-4"><p className="text-xs font-bold uppercase tracking-widest text-cyan-300">{artist.status}</p>
        <h2 className="text-xl font-bold text-white">{artist.stage_name}</h2>
        {artist.status === 'pending' && <p className="text-sm text-slate-300">Administration is reviewing your music and availability.</p>}
        {artist.review_note && <p className="whitespace-pre-wrap text-sm text-slate-300">{artist.review_note}</p>}
      </section>}
      {canApply && <form className="space-y-4" onSubmit={e => { e.preventDefault(); void submit({ action: 'apply', ...form, accepted }) }}>
        <h2 className="text-xl font-bold text-white">Apply to perform</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ArtistField label="Stage name"><input className={artistInputClass} required minLength={2} maxLength={80} value={form.stageName} onChange={e => setForm({ ...form, stageName: e.target.value })} /></ArtistField>
          <ArtistField label="Artist experience"><select className={artistInputClass} value={form.experience} onChange={e => setForm({ ...form, experience: e.target.value })}><option value="upcoming">Upcoming artist</option><option value="established">Established artist</option></select></ArtistField>
          <ArtistField label="Music style / genre"><input className={artistInputClass} required minLength={2} maxLength={120} value={form.genre} onChange={e => setForm({ ...form, genre: e.target.value })} /></ArtistField>
          <ArtistField label="Music sample link (optional)"><input type="url" className={artistInputClass} maxLength={2048} placeholder="https://" value={form.sampleUrl} onChange={e => setForm({ ...form, sampleUrl: e.target.value })} /></ArtistField>
        </div>
        <ArtistField label="Days and times you can perform"><textarea className={artistInputClass} required minLength={5} maxLength={1000} value={form.availability} onChange={e => setForm({ ...form, availability: e.target.value })} placeholder="For example: Monday to Friday, 18:00–21:00" /></ArtistField>
        <ArtistField label="Your time zone"><input className={artistInputClass} required maxLength={80} value={form.timeZone} onChange={e => setForm({ ...form, timeZone: e.target.value })} /></ArtistField>
        <ArtistField label="Introduce your music (optional)"><textarea className={artistInputClass} maxLength={2000} value={form.introduction} onChange={e => setForm({ ...form, introduction: e.target.value })} /></ArtistField>
        <p className="text-sm leading-6 text-slate-400">{ARTIST_DUTY} Administration will review your application and send employment and payment terms for you to accept.</p>
        <label className="flex items-start gap-3 text-sm text-slate-300"><input className="mt-1" type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} required />I am applying to perform live music on WEAVE.</label>
        <button className={artistButtonClass} disabled={busy || !accepted}>Submit artist application</button>
      </form>}
      {artist?.offer_terms && <section className="space-y-4"><h2 className="text-xl font-bold text-white">Your employment offer</h2>
        <p className="whitespace-pre-wrap rounded-xl border border-white/10 p-4 text-sm leading-6 text-slate-200">{artist.offer_terms}</p>
        {artist.status === 'offered' && <form className="space-y-3" onSubmit={e => { e.preventDefault(); void submit({ action: 'accept_offer', offerVersion: artist.offer_version, signature, accepted }) }}>
          <ArtistField label="Sign with the full name on your account"><input className={artistInputClass} required value={signature} onChange={e => setSignature(e.target.value)} maxLength={160} /></ArtistField>
          <label className="flex items-start gap-3 text-sm text-slate-300"><input className="mt-1" type="checkbox" required checked={accepted} onChange={e => setAccepted(e.target.checked)} />I have read and accept these employment and payment terms.</label>
          <button className={artistButtonClass} disabled={busy || !accepted || !state?.access.active}>Accept artist offer</button>
        </form>}
        {artist.accepted_at && <p className="text-xs text-slate-400">Accepted by {artist.accepted_name} · {new Date(artist.accepted_at).toLocaleDateString()}</p>}
      </section>}
      {artist?.status === 'active' && <section className="space-y-3"><h2 className="text-xl font-bold text-white">Your performance desk</h2>
        <p className="text-sm leading-6 text-slate-400">Start your live audio source, save its listener URL and choose Go live when your slot opens. Your sound enters the shared floating DJ player. Your slot ends automatically at its scheduled finish.</p>
        {state?.performances.length ? state.performances.map(slot => <ArtistPerformanceControl key={slot.id} slot={slot} active={active} busy={busy} operate={body => submit(body, true)} />) : <p className="text-sm text-slate-400">Administration has not assigned your first performance yet.</p>}
      </section>}
    </>}
    <ArtistProgramme />
  </main>
}
