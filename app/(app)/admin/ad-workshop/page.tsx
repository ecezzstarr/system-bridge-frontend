'use client'

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { Archive, Image as ImageIcon, Loader2, Megaphone, Pencil, Play, Upload, Video } from 'lucide-react'

type Ad = {
  id: string
  title: string
  body: string
  media_url: string | null
  media_type: 'none' | 'image' | 'video'
  target_roles: string[]
  placements: string[]
  action_label: string | null
  action_url: string | null
  event_key: string | null
  start_at: string
  end_at: string | null
  frequency: 'once' | 'daily' | 'every_login' | 'persistent'
  priority: number
  status: 'draft' | 'published' | 'paused' | 'archived'
  updated_at: string
}

const ROLES = ['all', 'client', 'agent', 'bridger', 'admin', 'lord', 'lady', 'legion']
const PLACEMENTS = ['all', 'dashboard', 'event', 'marketplace', 'system-switch', 'app', 'login']
const FREQUENCIES = [
  ['once', 'Once per participant'],
  ['daily', 'Once per day'],
  ['every_login', 'Once per login session'],
  ['persistent', 'Persistent until Administration stops it'],
] as const

function localDateTime(value?: string | null) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return ''
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return shifted.toISOString().slice(0, 16)
}

const blankForm = () => ({
  id: '',
  title: '',
  body: '',
  mediaUrl: '',
  mediaType: 'none' as 'none' | 'image' | 'video',
  targetRoles: ['all'] as string[],
  placements: ['dashboard'] as string[],
  actionLabel: '',
  actionUrl: '',
  eventKey: '',
  startAt: localDateTime(),
  endAt: '',
  frequency: 'every_login' as 'once' | 'daily' | 'every_login' | 'persistent',
  priority: 0,
  status: 'draft' as 'draft' | 'published' | 'paused' | 'archived',
})

export default function AdWorkshopPage() {
  const { user } = useAuth()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [ads, setAds] = useState<Ad[]>([])
  const [form, setForm] = useState(blankForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    if (user.role !== 'admin') router.replace('/dashboard')
  }, [user, router])

  const authHeaders = () => {
    const token = localStorage.getItem('ssb_auth_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const loadAds = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/ads', { headers: authHeaders(), cache: 'no-store' })
      const data = await response.json()
      if (data.success) setAds(data.ads || [])
      else setMessage(data.error || 'Unable to load ads')
    } catch {
      setMessage('Unable to load ads')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') loadAds()
  }, [user?.role])

  const publishedCount = useMemo(() => ads.filter(ad => ad.status === 'published').length, [ads])

  const toggleChoice = (field: 'targetRoles' | 'placements', value: string) => {
    setForm(current => {
      const existing = current[field]
      if (value === 'all') return { ...current, [field]: ['all'] }
      const withoutAll = existing.filter(item => item !== 'all')
      const next = withoutAll.includes(value)
        ? withoutAll.filter(item => item !== value)
        : [...withoutAll, value]
      return { ...current, [field]: next.length ? next : [value] }
    })
  }

  const handleMedia = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setMessage(null)
    try {
      const body = new FormData()
      body.append('file', file)
      const response = await fetch('/api/admin/ads/upload', {
        method: 'POST',
        headers: authHeaders(),
        body,
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Upload failed')
      setForm(current => ({ ...current, mediaUrl: data.url, mediaType: data.mediaType }))
      setMessage('Media uploaded. Publish the ad when ready.')
    } catch (error: any) {
      setMessage(error.message || 'Media upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const payload = (statusOverride?: Ad['status']) => ({
    ...(form.id ? { id: form.id } : {}),
    title: form.title,
    body: form.body,
    mediaUrl: form.mediaUrl || null,
    mediaType: form.mediaUrl ? form.mediaType : 'none',
    targetRoles: form.targetRoles,
    placements: form.placements,
    actionLabel: form.actionLabel || null,
    actionUrl: form.actionUrl || null,
    eventKey: form.eventKey || null,
    startAt: form.startAt ? new Date(form.startAt).toISOString() : new Date().toISOString(),
    endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
    frequency: form.frequency,
    priority: form.priority,
    status: statusOverride || form.status,
  })

  const save = async (statusOverride?: Ad['status']) => {
    if (!form.title.trim()) {
      setMessage('Give the ad a title before publishing.')
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/ads', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload(statusOverride)),
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Save failed')
      setMessage((statusOverride || form.status) === 'published'
        ? 'Published. Intended participant surfaces now receive this ad from live data.'
        : 'Ad saved.')
      setForm(blankForm())
      await loadAds()
    } catch (error: any) {
      setMessage(error.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = async (ad: Ad, status: Ad['status']) => {
    setMessage(null)
    try {
      const response = await fetch('/api/admin/ads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ id: ad.id, status }),
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Update failed')
      setMessage(status === 'published' ? 'Ad is live.' : status === 'paused' ? 'Ad paused.' : 'Ad updated.')
      await loadAds()
    } catch (error: any) {
      setMessage(error.message || 'Update failed')
    }
  }

  const edit = (ad: Ad) => {
    setForm({
      id: ad.id,
      title: ad.title,
      body: ad.body || '',
      mediaUrl: ad.media_url || '',
      mediaType: ad.media_type || 'none',
      targetRoles: ad.target_roles?.length ? ad.target_roles : ['all'],
      placements: ad.placements?.length ? ad.placements : ['dashboard'],
      actionLabel: ad.action_label || '',
      actionUrl: ad.action_url || '',
      eventKey: ad.event_key || '',
      startAt: localDateTime(ad.start_at),
      endAt: ad.end_at ? localDateTime(ad.end_at) : '',
      frequency: ad.frequency,
      priority: ad.priority || 0,
      status: ad.status,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const archive = async (ad: Ad) => {
    try {
      const response = await fetch(`/api/admin/ads?id=${encodeURIComponent(ad.id)}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Archive failed')
      setMessage('Ad archived.')
      await loadAds()
    } catch (error: any) {
      setMessage(error.message || 'Archive failed')
    }
  }

  if (!user || user.role !== 'admin') return null

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      <section className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-slate-950 to-slate-950 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
              <Megaphone className="h-3.5 w-3.5" />
              Administration Workshop
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">Ad Workshop</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Create the message, choose the participant position and placement, then publish. After this workshop is installed,
              ad changes travel through live platform data and do not require a new Cloud Run deployment.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live ads</p>
            <p className="text-3xl font-black text-cyan-300">{publishedCount}</p>
            <p className="text-[10px] text-slate-600">20-second live refresh</p>
          </div>
        </div>
      </section>

      {message && (
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-sm text-cyan-100">{message}</div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <section className="space-y-5 rounded-3xl border border-slate-800 bg-slate-900/55 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white">{form.id ? 'Edit Advertisement' : 'Create Advertisement'}</h2>
              <p className="text-xs text-slate-500">Words and media become a live placement for the intended position.</p>
            </div>
            {form.id && (
              <button onClick={() => setForm(blankForm())} className="text-xs font-bold text-slate-400 hover:text-white">New ad</button>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Title</label>
            <input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="What should the participant see first?"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Message</label>
            <textarea
              rows={5}
              value={form.body}
              onChange={e => setForm({ ...form, body: e.target.value })}
              placeholder="Write the movement of the advertisement..."
              className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
            />
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Media</p>
                <p className="text-xs text-slate-600">Image or video from the existing Weave Google Cloud media bucket.</p>
              </div>
              {form.mediaType === 'image' ? <ImageIcon className="h-5 w-5 text-cyan-400" /> : form.mediaType === 'video' ? <Video className="h-5 w-5 text-cyan-400" /> : null}
            </div>
            <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm,video/quicktime" onChange={handleMedia} disabled={uploading} className="hidden" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:border-cyan-500 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? 'Uploading...' : form.mediaUrl ? 'Replace media' : 'Upload media'}
            </button>
            {form.mediaUrl && (
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-800 bg-black">
                {form.mediaType === 'video'
                  ? <video src={form.mediaUrl} controls className="max-h-64 w-full" />
                  : <img src={form.mediaUrl} alt="" className="max-h-64 w-full object-contain" />}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Action label</label>
              <input value={form.actionLabel} onChange={e => setForm({ ...form, actionLabel: e.target.value })} placeholder="Enter event" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Action destination</label>
              <input value={form.actionUrl} onChange={e => setForm({ ...form, actionUrl: e.target.value })} placeholder="/event" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Intended user position</label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map(role => (
                <button
                  type="button"
                  key={role}
                  onClick={() => toggleChoice('targetRoles', role)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold capitalize transition ${form.targetRoles.includes(role) ? 'border-cyan-400 bg-cyan-400/15 text-cyan-200' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Where it appears</label>
            <div className="flex flex-wrap gap-2">
              {PLACEMENTS.map(place => (
                <button
                  type="button"
                  key={place}
                  onClick={() => toggleChoice('placements', place)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold capitalize transition ${form.placements.includes(place) ? 'border-violet-400 bg-violet-400/15 text-violet-200' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
                >
                  {place.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Starts</label>
              <input type="datetime-local" value={form.startAt} onChange={e => setForm({ ...form, startAt: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Ends · optional</label>
              <input type="datetime-local" value={form.endAt} onChange={e => setForm({ ...form, endAt: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Frequency</label>
              <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value as any })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white">
                {FREQUENCIES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Priority</label>
              <input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-slate-800 pt-5">
            <button onClick={() => save('published')} disabled={saving || uploading} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Publish live
            </button>
            <button onClick={() => save('draft')} disabled={saving || uploading} className="rounded-xl border border-slate-700 bg-slate-950 px-5 py-3 text-sm font-bold text-slate-300 hover:border-slate-500 disabled:opacity-50">
              Save draft
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/55 p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-xl font-black text-white">Published & Draft Ads</h2>
            <p className="text-xs text-slate-500">Pause, resume, edit or archive without touching repository code.</p>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading advertisements...</div>
          ) : ads.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">No workshop ads yet.</div>
          ) : (
            <div className="space-y-3">
              {ads.map(ad => (
                <article key={ad.id} className="rounded-2xl border border-slate-800 bg-slate-950/65 p-4">
                  <div className="flex items-start gap-3">
                    {ad.media_url && ad.media_type === 'image' ? (
                      <img src={ad.media_url} alt="" className="h-16 w-20 rounded-lg object-cover" />
                    ) : ad.media_url && ad.media_type === 'video' ? (
                      <div className="flex h-16 w-20 items-center justify-center rounded-lg bg-slate-900"><Video className="h-5 w-5 text-slate-500" /></div>
                    ) : (
                      <div className="flex h-16 w-20 items-center justify-center rounded-lg bg-cyan-400/10"><Megaphone className="h-5 w-5 text-cyan-400" /></div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-black text-white">{ad.title}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${ad.status === 'published' ? 'bg-emerald-400/10 text-emerald-300' : ad.status === 'paused' ? 'bg-amber-400/10 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>{ad.status}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{ad.body || 'No body text'}</p>
                      <p className="mt-2 text-[10px] text-slate-600">{ad.target_roles.join(', ')} · {ad.placements.join(', ')} · priority {ad.priority}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => edit(ad)} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 hover:border-cyan-500"><Pencil className="h-3 w-3" /> Edit</button>
                    {ad.status === 'published'
                      ? <button onClick={() => changeStatus(ad, 'paused')} className="rounded-lg border border-amber-500/30 px-3 py-1.5 text-xs font-bold text-amber-300">Pause</button>
                      : ad.status !== 'archived' && <button onClick={() => changeStatus(ad, 'published')} className="rounded-lg border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-300">Publish</button>}
                    {ad.status !== 'archived' && (
                      <button onClick={() => archive(ad)} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-800 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-300"><Archive className="h-3 w-3" /> Archive</button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
