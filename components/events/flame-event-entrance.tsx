'use client'

import { useEffect, useRef, useState } from 'react'
import { Flame, Play } from 'lucide-react'

type EntranceTrack = { title: string; artist: string | null; fileUrl: string }

export default function FlameEventEntrance() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [track, setTrack] = useState<EntranceTrack | null>(null)
  const [needsEntry, setNeedsEntry] = useState(false)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    let active = true
    const open = async () => {
      try {
        const token = localStorage.getItem('ssb_auth_token')
        const res = await fetch('/api/event/entrance-track', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const data = await res.json()
        if (!active || !data.success || !data.available || !data.track?.fileUrl) {
          setEntered(true)
          return
        }
        setTrack(data.track)
      } catch {
        if (active) setEntered(true)
      }
    }
    open()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!track || !audioRef.current) return
    const audio = audioRef.current
    audio.src = track.fileUrl
    audio.currentTime = 0
    audio.muted = false
    audio.play()
      .then(() => setEntered(true))
      .catch(() => setNeedsEntry(true))
  }, [track])

  const enter = async () => {
    if (!audioRef.current || !track) {
      setEntered(true)
      return
    }
    audioRef.current.src = track.fileUrl
    audioRef.current.currentTime = 0
    audioRef.current.muted = false
    try { await audioRef.current.play() } catch {}
    setNeedsEntry(false)
    setEntered(true)
  }

  return <>
    <audio ref={audioRef} preload="auto" />
    {needsEntry && !entered ? (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-6 backdrop-blur-xl">
        <button onClick={enter} className="group flex max-w-sm flex-col items-center rounded-[2rem] border border-red-500/30 bg-gradient-to-br from-blue-600/15 via-black to-red-600/20 px-8 py-10 text-center shadow-[0_0_90px_rgba(239,68,68,.18)]">
          <span className="flex h-20 w-20 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10"><Flame className="h-10 w-10 fill-red-500/20 text-red-400"/></span>
          <span className="mt-6 text-[10px] uppercase tracking-[.32em] text-blue-300">Weave of Presence</span>
          <span className="mt-2 text-2xl font-black tracking-[.14em] text-white">ENTER FLAME EVENT</span>
          <span className="mt-3 text-xs text-slate-400">Your position · your movement · now</span>
          <span className="mt-6 flex items-center gap-2 rounded-full bg-white px-5 py-2 text-xs font-bold text-black"><Play className="h-3.5 w-3.5 fill-black"/> Enter Event</span>
        </button>
      </div>
    ) : null}
  </>
}
