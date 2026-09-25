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
  const trackTypeRef = useRef<'music' | 'voice' | 'announcement'>('music')
  const audienceContextRef = useRef<AudioContext | null>(null)
  const audienceGainRef = useRef<GainNode | null>(null)
  const audienceSourcesRef = useRef<Array<AudioBufferSourceNode | OscillatorNode>>([])

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

  const stopHarmonyAudience = useCallback((immediate = false) => {
    const context = audienceContextRef.current
    const master = audienceGainRef.current
    if (!context) return

    const sources = [...audienceSourcesRef.current]
    audienceSourcesRef.current = []

    try {
      if (master) {
        const now = context.currentTime
        master.gain.cancelScheduledValues(now)
        master.gain.setValueAtTime(master.gain.value, now)
        master.gain.linearRampToValueAtTime(0, now + (immediate ? 0.01 : 0.32))
      }
    } catch {}

    window.setTimeout(() => {
      for (const source of sources) {
        try { source.stop() } catch {}
        try { source.disconnect() } catch {}
      }
      if (audienceContextRef.current === context) {
        audienceContextRef.current = null
        audienceGainRef.current = null
        try { void context.close() } catch {}
      }
    }, immediate ? 20 : 360)
  }, [])

  const startHarmonyAudience = useCallback(async () => {
    if (
      typeof window === 'undefined' ||
      trackTypeRef.current !== 'music' ||
      userPausedRef.current
    ) return

    const existing = audienceContextRef.current
    if (existing) {
      try {
        if (existing.state === 'suspended') await existing.resume()
      } catch {}
      return
    }

    try {
      const context = new AudioContext()
      const master = context.createGain()
      const now = context.currentTime

      master.gain.setValueAtTime(0, now)
      master.gain.linearRampToValueAtTime(0.052, now + 0.8)
      master.connect(context.destination)

      audienceContextRef.current = context
      audienceGainRef.current = master

      const layers = [
        { frequency: 240, q: 0.55, gain: 0.34, rate: 0.93, pan: -0.75, lfo: 0.08 },
        { frequency: 430, q: 0.65, gain: 0.30, rate: 0.98, pan: -0.22, lfo: 0.11 },
        { frequency: 760, q: 0.75, gain: 0.24, rate: 1.03, pan: 0.24, lfo: 0.14 },
        { frequency: 1320, q: 0.85, gain: 0.17, rate: 1.07, pan: 0.72, lfo: 0.17 },
      ]

      for (const layer of layers) {
        const seconds = 7
        const buffer = context.createBuffer(1, Math.floor(context.sampleRate * seconds), context.sampleRate)
        const data = buffer.getChannelData(0)
        let smoothed = 0

        for (let index = 0; index < data.length; index += 1) {
          const white = Math.random() * 2 - 1
          smoothed = smoothed * 0.78 + white * 0.22
          const drift =
            0.72 +
            0.18 * Math.sin(index / context.sampleRate * Math.PI * 2 * 0.37) +
            0.10 * Math.sin(index / context.sampleRate * Math.PI * 2 * 0.83)
          data[index] = smoothed * drift
        }

        const source = context.createBufferSource()
        const band = context.createBiquadFilter()
        const softener = context.createBiquadFilter()
        const layerGain = context.createGain()
        const panner = context.createStereoPanner()
        const lfo = context.createOscillator()
        const lfoDepth = context.createGain()

        source.buffer = buffer
        source.loop = true
        source.playbackRate.value = layer.rate

        band.type = 'bandpass'
        band.frequency.value = layer.frequency
        band.Q.value = layer.q

        softener.type = 'lowpass'
        softener.frequency.value = 3200

        layerGain.gain.value = layer.gain
        panner.pan.value = layer.pan

        lfo.frequency.value = layer.lfo
        lfoDepth.gain.value = layer.gain * 0.14
        lfo.connect(lfoDepth)
        lfoDepth.connect(layerGain.gain)

        source.connect(band)
        band.connect(softener)
        softener.connect(layerGain)
        layerGain.connect(panner)
        panner.connect(master)

        source.start()
        lfo.start()
        audienceSourcesRef.current.push(source, lfo)
      }

      if (context.state === 'suspended') await context.resume()
    } catch {
      // Harmony is atmosphere only. The DJ track must keep playing if Web Audio is unavailable.
      stopHarmonyAudience(true)
    }
  }, [stopHarmonyAudience])

  const applyPersonalPause = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.muted = true
    stopHarmonyAudience()
  }, [stopHarmonyAudience])

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
      if (trackTypeRef.current === 'music') {
        await startHarmonyAudience()
      } else {
        stopHarmonyAudience()
      }
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
  }, [startHarmonyAudience, stopHarmonyAudience])

  useEffect(() => () => stopHarmonyAudience(true), [stopHarmonyAudience])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== USER_PAUSED_KEY) return
      const paused = event.newValue === '1'
      userPausedRef.current = paused
      setUserPaused(paused)

      if (paused) {
        applyPersonalPause()
      } else {
        const audio = audioRef.current
        if (audio) audio.muted = false
        if (joined) void beginPlayback(false, true)
      }
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [applyPersonalPause, beginPlayback, joined])

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
        stopHarmonyAudience()
        return
      }

      setLive(true)
      setTrackTitle(data.track.title || null)
      setTrackArtist(data.track.artist || null)
      setAnnouncement(data.announcementText || null)
      trackTypeRef.current = data.track.type || 'music'
      if (trackTypeRef.current !== 'music') stopHarmonyAudience()

      if (!audio) return

      if (userPausedRef.current) {
        applyPersonalPause()
      }

      const desiredSeconds = Math.max(0, Number(data.elapsedSeconds || 0))
      const isNewTrack = currentUrlRef.current !== data.track.fileUrl

      const seekAndRespectListener = async () => {
        try {
          if (Number.isFinite(desiredSeconds)) audio.currentTime = desiredSeconds
        } catch {}

        if (userPausedRef.current) {
          applyPersonalPause()
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
          applyPersonalPause()
        } else if (joined && audio.paused) {
          await beginPlayback(false)
        }
      }
    } catch {
      // Live sound must never make the rest of WEAVE unusable.
    } finally {
      syncInFlightRef.current = false
    }
  }, [user?.id, joined, beginPlayback, applyPersonalPause, stopHarmonyAudience])

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
    const audio = audioRef.current
    if (audio) audio.muted = false
    await beginPlayback(true, true)
  }

  const handlePause = () => {
    userPausedRef.current = true
    applyPersonalPause()
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

    const audio = audioRef.current
    if (audio) audio.muted = false
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
        onPlay={() => {
          if (userPausedRef.current) {
            applyPersonalPause()
          } else if (trackTypeRef.current === 'music') {
            void startHarmonyAudience()
          }
        }}
        onPlaying={() => {
          if (userPausedRef.current) {
            applyPersonalPause()
          } else if (trackTypeRef.current === 'music') {
            void startHarmonyAudience()
          }
        }}
        onPause={() => stopHarmonyAudience()}
        onEnded={() => {
          stopHarmonyAudience()
          void syncBroadcast()
        }}
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
