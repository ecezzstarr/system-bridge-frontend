'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Headphones, Link2, ListMusic, Music2, Pause, Play, Plus, Upload, X } from 'lucide-react'

type DjTrack = {
  id: string
  title: string
  url: string
  source: 'url' | 'device'
}

function storageKey(fileNumber: string) {
  return `weave_client_dj_${fileNumber}`
}

export function ClientPremiumDJ({ fileNumber }: { fileNumber: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlsRef = useRef<string[]>([])
  const [tracks, setTracks] = useState<DjTrack[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [personalMode, setPersonalMode] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(fileNumber))
      const stored = raw ? JSON.parse(raw) : []
      if (Array.isArray(stored)) {
        setTracks(stored.filter((track: any) => track?.url && track?.title).map((track: any) => ({
          id: String(track.id),
          title: String(track.title),
          url: String(track.url),
          source: 'url' as const,
        })))
      }
    } catch {}

    return () => {
      window.dispatchEvent(new CustomEvent('weave:personal-dj', { detail: { active: false } }))
      for (const objectUrl of objectUrlsRef.current) URL.revokeObjectURL(objectUrl)
    }
  }, [fileNumber])

  const currentIndex = useMemo(
    () => tracks.findIndex(track => track.id === currentId),
    [tracks, currentId],
  )

  const persistUrlTracks = (next: DjTrack[]) => {
    try {
      localStorage.setItem(
        storageKey(fileNumber),
        JSON.stringify(next.filter(track => track.source === 'url')),
      )
    } catch {}
  }

  const enterPersonalMode = () => {
    setPersonalMode(true)
    window.dispatchEvent(new CustomEvent('weave:personal-dj', { detail: { active: true } }))
  }

  const leavePersonalMode = () => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    setPlaying(false)
    setCurrentId(null)
    setPersonalMode(false)
    window.dispatchEvent(new CustomEvent('weave:personal-dj', { detail: { active: false } }))
  }

  const playTrack = async (track: DjTrack) => {
    const audio = audioRef.current
    if (!audio) return
    enterPersonalMode()
    if (currentId !== track.id || audio.src !== track.url) {
      audio.src = track.url
      audio.load()
      setCurrentId(track.id)
    }
    try {
      await audio.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
    }
  }

  const playNext = () => {
    if (!tracks.length) {
      leavePersonalMode()
      return
    }
    const index = currentIndex < 0 ? 0 : (currentIndex + 1) % tracks.length
    void playTrack(tracks[index])
  }

  const addUrlTrack = () => {
    const cleanUrl = url.trim()
    if (!cleanUrl) return
    const track: DjTrack = {
      id: `url-${Date.now()}`,
      title: title.trim() || 'My track',
      url: cleanUrl,
      source: 'url',
    }
    const next = [...tracks, track]
    setTracks(next)
    persistUrlTracks(next)
    setTitle('')
    setUrl('')
  }

  const addDeviceTracks = (files: FileList | null) => {
    if (!files?.length) return
    const nextTracks = Array.from(files).map((file, index) => {
      const objectUrl = URL.createObjectURL(file)
      objectUrlsRef.current.push(objectUrl)
      return {
        id: `device-${Date.now()}-${index}`,
        title: file.name.replace(/\.[^.]+$/, ''),
        url: objectUrl,
        source: 'device' as const,
      }
    })
    setTracks(previous => [...previous, ...nextTracks])
  }

  const removeTrack = (id: string) => {
    const target = tracks.find(track => track.id === id)
    if (target?.source === 'device') {
      try { URL.revokeObjectURL(target.url) } catch {}
      objectUrlsRef.current = objectUrlsRef.current.filter(value => value !== target.url)
    }
    const next = tracks.filter(track => track.id !== id)
    setTracks(next)
    persistUrlTracks(next)
    if (currentId === id) {
      if (next.length) void playTrack(next[0])
      else leavePersonalMode()
    }
  }

  return (
    <section className="mb-5 rounded-3xl border border-fuchsia-300/20 bg-gradient-to-br from-fuchsia-500/[0.08] via-slate-950/80 to-cyan-400/[0.06] p-5 shadow-2xl backdrop-blur-xl">
      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={playNext}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-fuchsia-200">
            <Headphones className="h-5 w-5" />
            <p className="text-sm font-black uppercase tracking-[0.16em]">Premium File Folder DJ</p>
          </div>
          <h2 className="mt-2 text-2xl font-black text-white">Your music inside your File Folder</h2>
          <p className="mt-2 max-w-2xl text-base leading-7 text-slate-300">
            Premium gives this File Folder its own DJ. When you play one of your tracks, your personal sound replaces the WEAVE platform broadcast for you until you return to WEAVE Live.
          </p>
        </div>
        {personalMode && (
          <button
            onClick={leavePersonalMode}
            className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/[0.08]"
          >
            Return to WEAVE Live
          </button>
        )}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-300/25 bg-cyan-300/[0.04] p-5 text-center hover:bg-cyan-300/[0.07]">
          <Upload className="h-6 w-6 text-cyan-300" />
          <span className="mt-2 text-base font-bold text-white">Choose songs from this device</span>
          <span className="mt-1 text-sm text-slate-400">Audio files stay on this device/session.</span>
          <input type="file" accept="audio/*" multiple className="hidden" onChange={event => addDeviceTracks(event.target.files)} />
        </label>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2 text-slate-200">
            <Link2 className="h-4 w-4 text-fuchsia-300" />
            <p className="text-sm font-bold">Add your own audio link</p>
          </div>
          <div className="mt-3 grid gap-2">
            <input value={title} onChange={event => setTitle(event.target.value)} placeholder="Track title" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-base text-white" />
            <div className="flex gap-2">
              <input value={url} onChange={event => setUrl(event.target.value)} placeholder="https://.../song.mp3" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-base text-white" />
              <button onClick={addUrlTrack} className="inline-flex items-center gap-1 rounded-xl bg-fuchsia-500 px-4 py-2 text-sm font-black text-white">
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-center gap-2">
          <ListMusic className="h-5 w-5 text-cyan-300" />
          <h3 className="text-base font-black text-white">My File Folder playlist</h3>
        </div>
        {tracks.length === 0 ? (
          <p className="mt-3 text-base text-slate-400">Add a device song or audio link to begin.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {tracks.map(track => {
              const active = currentId === track.id
              return (
                <div key={track.id} className={`flex items-center gap-3 rounded-xl border p-3 ${active ? 'border-fuchsia-300/30 bg-fuchsia-300/[0.06]' : 'border-white/5 bg-white/[0.02]'}`}>
                  <button
                    onClick={() => {
                      if (active && playing) audioRef.current?.pause()
                      else void playTrack(track)
                    }}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white"
                    aria-label={active && playing ? 'Pause track' : 'Play track'}
                  >
                    {active && playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <Music2 className="h-4 w-4 text-fuchsia-300" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-bold text-white">{track.title}</p>
                    <p className="text-sm text-slate-500">{track.source === 'device' ? 'This device' : 'Saved audio link'}</p>
                  </div>
                  <button onClick={() => removeTrack(track.id)} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-white/[0.05] hover:text-white" aria-label="Remove track">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
