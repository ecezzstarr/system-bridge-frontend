'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { Radio, Play, GripVertical } from 'lucide-react'

const POSITION_KEY = 'ssb_dj_player_pos'
const WIDGET_WIDTH = 260
const WIDGET_HEIGHT = 64

function getDefaultPosition() {
  if (typeof window === 'undefined') return { x: 0, y: 0 }
  return { x: window.innerWidth - WIDGET_WIDTH - 16, y: window.innerHeight - WIDGET_HEIGHT - 16 }
}

function clamp(pos: { x: number; y: number }) {
  if (typeof window === 'undefined') return pos
  const maxX = window.innerWidth - WIDGET_WIDTH
  const maxY = window.innerHeight - WIDGET_HEIGHT
  return { x: Math.min(Math.max(0, pos.x), Math.max(0, maxX)), y: Math.min(Math.max(0, pos.y), Math.max(0, maxY)) }
}

// The institution's continuous broadcast. Silent by default (browsers block
// autoplay with sound), so it shows a small "tap to join" prompt until the
// person opts in — after that it syncs to the current moment automatically.
// The widget is a movable, app-like tab the user can drag anywhere on screen;
// its position persists across reloads.
export function DJBroadcastPlayer() {
  const { user } = useAuth()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [live, setLive] = useState(false)
  const [trackTitle, setTrackTitle] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState<string | null>(null)
  const [joined, setJoined] = useState(false)
  const currentUrlRef = useRef<string | null>(null)

  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const dragState = useRef<{ dragging: boolean; offsetX: number; offsetY: number }>({ dragging: false, offsetX: 0, offsetY: 0 })
  const hasDraggedRef = useRef(false)

  useEffect(() => {
    let initial = getDefaultPosition()
    try {
      const saved = localStorage.getItem(POSITION_KEY)
      if (saved) initial = clamp(JSON.parse(saved))
    } catch {}
    setPosition(initial)

    const handleResize = () => setPosition((p) => (p ? clamp(p) : p))
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const authHeaders = () => {
    const token = localStorage.getItem('ssb_auth_token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }

  const syncBroadcast = async () => {
    try {
      const res = await fetch('/api/dj/broadcast', { headers: authHeaders() })
      const data = await res.json()
      if (!data.success || !data.live) {
        setLive(false)
        return
      }
      setLive(true)
      setTrackTitle(data.track?.title || null)
      setAnnouncement(data.announcementText || null)

      if (!joined || !audioRef.current) return

      if (currentUrlRef.current !== data.track?.fileUrl) {
        currentUrlRef.current = data.track?.fileUrl
        audioRef.current.src = data.track.fileUrl
        audioRef.current.currentTime = data.elapsedSeconds || 0
        audioRef.current.play().catch(() => {})
      } else if (Math.abs(audioRef.current.currentTime - data.elapsedSeconds) > 3) {
        // Drift correction — keep everyone on the same moment.
        audioRef.current.currentTime = data.elapsedSeconds
      }
    } catch {
      // stay quiet on transient errors
    }
  }

  const canHearBroadcast = user && ['admin', 'agent', 'bridger'].includes(user.role)

  useEffect(() => {
    if (!canHearBroadcast) return
    syncBroadcast()
    const interval = setInterval(syncBroadcast, 8000)
    return () => clearInterval(interval)
  }, [canHearBroadcast, joined])

  const handleJoin = () => {
    setJoined(true)
    if (audioRef.current) audioRef.current.muted = false
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (!position) return
    dragState.current.dragging = true
    hasDraggedRef.current = false
    dragState.current.offsetX = e.clientX - position.x
    dragState.current.offsetY = e.clientY - position.y
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current.dragging) return
    hasDraggedRef.current = true
    const next = clamp({
      x: e.clientX - dragState.current.offsetX,
      y: e.clientY - dragState.current.offsetY,
    })
    setPosition(next)
  }

  const onPointerUp = () => {
    if (!dragState.current.dragging) return
    dragState.current.dragging = false
    setPosition((p) => {
      if (p) {
        try {
          localStorage.setItem(POSITION_KEY, JSON.stringify(p))
        } catch {}
      }
      return p
    })
  }

  if (!canHearBroadcast || !live || !position) return null

  return (
    <div
      className="fixed z-40 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl px-3 py-3 shadow-2xl flex items-center gap-2 max-w-xs select-none touch-none"
      style={{ left: position.x, top: position.y, width: WIDGET_WIDTH }}
    >
      <audio ref={audioRef} muted={!joined} />
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 transition"
        title="Drag to move"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
        <Radio className="h-4 w-4 text-cyan-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Live</p>
        <p className="text-xs text-white truncate">{announcement || trackTitle || 'Broadcasting'}</p>
      </div>
      {!joined && (
        <button
          onClick={handleJoin}
          className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-600 hover:bg-cyan-500 flex items-center justify-center transition"
          title="Join broadcast"
        >
          <Play className="h-3.5 w-3.5 text-white" />
        </button>
      )}
    </div>
  )
}
