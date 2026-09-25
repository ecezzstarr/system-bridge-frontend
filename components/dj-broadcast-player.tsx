'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { Music2, Play, Pause, GripVertical, Volume2 } from 'lucide-react'

const POSITION_KEY = 'ssb_dj_player_pos'
const LIVE_SOUND_KEY = 'weave_live_sound_joined'
const LEGACY_EVENT_SOUND_KEY = 'weave_flame_event_sound_joined'
const USER_PAUSED_KEY = 'weave_live_sound_user_paused'
const WIDGET_WIDTH = 260
const WIDGET_HEIGHT = 56

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
  const userPausedRef = useRef(false)

  const [live, setLive] = useState(false)
  const [flameEventLive, setFlameEventLive] = useState(false)
  const [trackTitle, setTrackTitle] = useState<string | null>(null)
  const [trackArtist, setTrackArtist] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState<string | null>(null)
  const [joined, setJoined] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
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
      const pausedByUser = localStorage.getItem(USER_PAUSED_KEY) === '1'

      setJoined(remembered)
      setUserPaused(pausedByUser)
      userPausedRef.current = pausedByUser

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

  const beginPlayback = useCallback(async (remember = false, force = false) => {
    const audio = audioRef.current
    if (!audio || !audio.src) return false
    if (userPausedRef.current && !force) return false

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

      const seekAndRespectListener = async () => {
        try {
          if (Number.isFinite(desiredSeconds)) audio.currentTime = desiredSeconds
        } catch {}

        if (userPausedRef.current) {
          if (!audio.paused) audio.pause()
          return
        }

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
          await seekAndRespectListener()
        } else {
          audio.addEventListener('loadedmetadata', () => { void seekAndRespectListener() }, { once: true })
        }
      } else {
        if (audio.readyState >= 1 && Math.abs(audio.currentTime - desiredSeconds) > 2.5) {
          try { audio.currentTime = desiredSeconds } catch {}
        }

        if (userPausedRef.current) {
          if (!audio.paused) audio.pause()
        } else if (joined && audio.paused) {
          await beginPlayback(false)
        }
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
    userPausedRef.current = false
    setUserPaused(false)
    try { localStorage.removeItem(USER_PAUSED_KEY) } catch {}
    await beginPlayback(true, true)
  }

  const handlePause = () => {
    const audio = audioRef.current
    if (audio && !audio.paused) audio.pause()

    userPausedRef.current = true
    setUserPaused(true)
    setJoined(true)
    try {
      localStorage.setItem(LIVE_SOUND_KEY, '1')
      localStorage.setItem(USER_PAUSED_KEY, '1')
    } catch {}
  }

  const handleResume = async () => {
    userPausedRef.current = false
    setUserPaused(false)
    autoplayAttemptedRef.current = true
    try { localStorage.removeItem(USER_PAUSED_KEY) } catch {}

    await beginPlayback(false, true)
    void syncBroadcast()
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
          className={`fixed z-[85] flex select-none items-center gap-1.5 overflow-hidden rounded-2xl border px-2 py-2 backdrop-blur-md touch-none ${
            flameEventLive
              ? 'border-sky-100/20 bg-white/[0.045]'
              : 'border-white/15 bg-white/[0.035]'
          }`}
          style={{
            left: position.x,
            top: position.y,
            width: WIDGET_WIDTH,
            boxShadow: '0 10px 28px rgba(2,8,23,.22), inset 0 1px 0 rgba(255,255,255,.18), inset 0 -1px 0 rgba(255,255,255,.03)',
          }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,.13)_0%,rgba(255,255,255,.035)_28%,transparent_46%,rgba(125,211,252,.045)_72%,rgba(255,255,255,.08)_100%)]" />
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />

          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="relative z-10 flex-shrink-0 cursor-grab text-white/25 transition hover:text-white/55 active:cursor-grabbing"
            title="Drag to move"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>

          <div className={`relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/10 backdrop-blur-sm ${
            userPaused
              ? 'bg-black/10'
              : flameEventLive
                ? 'bg-gradient-to-b from-sky-200/10 to-red-200/[0.06]'
                : 'bg-sky-200/[0.07]'
          }`}>
            {joined ? <Volume2 className={`h-4 w-4 ${userPaused ? 'text-slate-500' : 'text-sky-300'}`} /> : <Music2 className="h-4 w-4 text-sky-300" />}
          </div>

          <div className="relative z-10 min-w-0 flex-1">
            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-sky-200/80">
              {flameEventLive ? 'Flame Event Sound · Loop 1' : 'WEAVE Live · DJ'}
            </p>
            <p className="truncate text-[10px] font-medium text-white/85">
              {userPaused ? 'Paused by you' : announcement || trackTitle || 'Broadcasting'}
            </p>
            {!userPaused && !announcement && trackArtist && <p className="truncate text-[8px] text-white/35">{trackArtist}</p>}
          </div>

          {!joined ? (
            <button
              onClick={handleJoin}
              className="relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-sky-100/20 bg-white/[0.055] text-sky-100/85 shadow-inner transition hover:bg-white/[0.10]"
              title="Enter the live sound"
            >
              <Play className="h-3.5 w-3.5" />
            </button>
          ) : userPaused ? (
            <button
              onClick={handleResume}
              className="relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-emerald-100/20 bg-white/[0.055] text-emerald-100/85 shadow-inner transition hover:bg-white/[0.10]"
              title="Resume live sound"
            >
              <Play className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.045] text-white/70 shadow-inner transition hover:bg-white/[0.10] hover:text-white"
              title="Pause live sound for you"
            >
              <Pause className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </>
  )
}
