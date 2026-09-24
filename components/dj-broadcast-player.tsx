'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { Music2, Play, GripVertical, Volume2 } from 'lucide-react'

const POSITION_KEY = 'ssb_dj_player_pos'
const LIVE_SOUND_KEY = 'weave_live_sound_joined'
const LEGACY_EVENT_SOUND_KEY = 'weave_flame_event_sound_joined'
const WIDGET_WIDTH = 290
const WIDGET_HEIGHT = 68

function getDefaultPosition() {
  if (typeof window === 'undefined') return { x: 0, y: 0 }
  return { x: window.innerWidth - WIDGET_WIDTH - 16, y: window.innerHeight - WIDGET_HEIGHT - 16 }
}

function clamp(pos: { x: number; y: number }) {
  if (typeof window === 'undefined') return pos
  return {
    x: Math.min(Math.max(0, pos.x), Math.max(0, window.innerWidth - WIDGET_WIDTH)),
    y: Math.min(Math.max(0, pos.y), Math.max(0, window.innerHeight - WIDGET_HEIGHT)),
  }
}

export function DJBroadcastPlayer() {
  const { user } = useAuth()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentUrlRef = useRef<string | null>(null)
  const autoplayAttemptedRef = useRef(false)
  const syncInFlightRef = useRef(false)

  const [live, setLive] = useState(false)
  const [flameEventLive, setFlameEventLive] = useState(false)
  const [trackTitle, setTrackTitle] = useState<string | null>(null)
  const [trackArtist, setTrackArtist] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState<string | null>(null)
  const [joined, setJoined] = useState(false)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)

  const dragState = useRef({ dragging: false, offsetX: 0, offsetY: 0 })

  useEffect(() => {
    let initial = getDefaultPosition()
    try {
      const saved = localStorage.getItem(POSITION_KEY)
      if (saved) initial = clamp(JSON.parse(saved))
      const remembered =
        localStorage.getItem(LIVE_SOUND_KEY) === '1' ||
        localStorage.getItem(LEGACY_EVENT_SOUND_KEY) === '1'
      setJoined(remembered)
      if (remembered) localStorage.setItem(LIVE_SOUND_KEY, '1')
    } catch {}
    setPosition(initial)

    const handleResize = () => setPosition(p => (p ? clamp(p) : p))
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const authHeaders = () => {
    const token = localStorage.getItem('ssb_auth_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const beginPlayback = useCallback(async (remember = false) => {
    const audio = audioRef.current
    if (!audio || !audio.src) return false
    try {
      audio.muted = false
      await audio.play()
      setJoined(true)
      if (remember) {
        try {
          localStorage.setItem(LIVE_SOUND_KEY, '1')
          localStorage.setItem(LEGACY_EVENT_SOUND_KEY, '1')
        } catch {}
      }
      return true
    } catch {
      setJoined(false)
      return false
    }
  }, [])

  const syncBroadcast = useCallback(async () => {
    if (!user || syncInFlightRef.current) return
    syncInFlightRef.current = true

    try {
      const res = await fetch('/api/dj/broadcast', {
        headers: authHeaders(),
        cache: 'no-store',
      })
      const data = await res.json()

      setFlameEventLive(Boolean(data.flameEventLive))

      const audio = audioRef.current
      if (!data.success || !data.live || !data.track?.fileUrl) {
        setLive(false)
        setTrackTitle(null)
        setTrackArtist(null)
        setAnnouncement(null)
        if (audio && !audio.paused) audio.pause()
        return
      }

      setLive(true)
      setTrackTitle(data.track.title || null)
      setTrackArtist(data.track.artist || null)
      setAnnouncement(data.announcementText || null)

      if (!audio) return

      const desiredSeconds = Math.max(0, Number(data.elapsedSeconds || 0))
      const isNewTrack = currentUrlRef.current !== data.track.fileUrl

      const seekAndPlay = async () => {
        try {
          if (Number.isFinite(desiredSeconds)) audio.currentTime = desiredSeconds
        } catch {}

        if (joined) {
          await beginPlayback(false)
        } else if (!autoplayAttemptedRef.current) {
          autoplayAttemptedRef.current = true
          await beginPlayback(true)
        }
      }

      if (isNewTrack) {
        currentUrlRef.current = data.track.fileUrl
        audio.src = data.track.fileUrl
        audio.load()
        if (audio.readyState >= 1) {
          await seekAndPlay()
        } else {
          audio.addEventListener('loadedmetadata', () => { void seekAndPlay() }, { once: true })
        }
      } else {
        if (audio.readyState >= 1 && Math.abs(audio.currentTime - desiredSeconds) > 2.5) {
          try { audio.currentTime = desiredSeconds } catch {}
        }
        if (joined && audio.paused) await beginPlayback(false)
      }
    } catch {
      // Live sound must never make the rest of WEAVE unusable.
    } finally {
      syncInFlightRef.current = false
    }
  }, [user?.id, joined, beginPlayback])

  const eligibleRole = Boolean(user && ['admin', 'agent', 'bridger', 'client'].includes(user.role))

  useEffect(() => {
    if (!eligibleRole) return
    void syncBroadcast()
    const interval = window.setInterval(() => void syncBroadcast(), 4000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncBroadcast()
    }
    const onOnline = () => void syncBroadcast()

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [eligibleRole, syncBroadcast])

  const handleJoin = async () => {
    autoplayAttemptedRef.current = true
    await beginPlayback(true)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (!position) return
    dragState.current.dragging = true
    dragState.current.offsetX = e.clientX - position.x
    dragState.current.offsetY = e.clientY - position.y
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current.dragging) return
    setPosition(clamp({
      x: e.clientX - dragState.current.offsetX,
      y: e.clientY - dragState.current.offsetY,
    }))
  }

  const onPointerUp = () => {
    if (!dragState.current.dragging) return
    dragState.current.dragging = false
    setPosition(p => {
      if (p) {
        try { localStorage.setItem(POSITION_KEY, JSON.stringify(p)) } catch {}
      }
      return p
    })
  }

  const canShow = eligibleRole && live && Boolean(position)

  return (
    <>
      <audio
        ref={audioRef}
        preload="auto"
        onEnded={() => void syncBroadcast()}
        onError={() => void syncBroadcast()}
      />

      {canShow && position && (
        <div
          className={`fixed z-[85] flex max-w-xs select-none items-center gap-2 rounded-2xl border px-3 py-3 shadow-2xl backdrop-blur-xl touch-none ${
            flameEventLive
              ? 'border-sky-300/25 bg-[#03101e]/95 shadow-sky-950/40'
              : 'border-slate-800 bg-slate-900/90'
          }`}
          style={{ left: position.x, top: position.y, width: WIDGET_WIDTH }}
        >
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="flex-shrink-0 cursor-grab text-slate-600 transition hover:text-slate-400 active:cursor-grabbing"
            title="Drag to move"
          >
            <GripVertical className="h-4 w-4" />
          </div>

          <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
            flameEventLive ? 'bg-gradient-to-b from-sky-500/20 to-red-500/15' : 'bg-cyan-500/20'
          }`}>
            {joined ? <Volume2 className="h-4 w-4 text-sky-300" /> : <Music2 className="h-4 w-4 text-sky-300" />}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-sky-300">
              {flameEventLive ? 'Flame Event Sound · Loop 1' : 'Weave Live · DJ'}
            </p>
            <p className="truncate text-xs text-white">{announcement || trackTitle || 'Broadcasting'}</p>
            {!announcement && trackArtist && <p className="truncate text-[9px] text-slate-500">{trackArtist}</p>}
          </div>

          {!joined && (
            <button
              onClick={handleJoin}
              className="flex-shrink-0 rounded-full border border-sky-300/25 bg-sky-500/15 px-3 py-2 text-[8px] font-black uppercase tracking-[0.12em] text-sky-200 transition hover:bg-sky-500/25"
              title="Browser autoplay is blocked until you enter sound"
            >
              <Play className="mr-1 inline h-3 w-3" />
              Enter Sound
            </button>
          )}
        </div>
      )}
    </>
  )
}
