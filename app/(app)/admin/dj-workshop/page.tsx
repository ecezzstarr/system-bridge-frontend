'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { Radio, Upload, Play, Square, SkipForward, Loader2, Music, Mic, Megaphone } from 'lucide-react'

type Track = {
  id: string
  title: string
  artist: string | null
  file_url: string
  duration_seconds: number
  track_type: 'music' | 'voice' | 'announcement'
}

type Playlist = {
  id: string
  name: string
  tracks: Track[]
}

export default function DJWorkshopPage() {
  const { user } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tracks, setTracks] = useState<Track[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [broadcast, setBroadcast] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadArtist, setUploadArtist] = useState('')
  const [uploadType, setUploadType] = useState<'music' | 'voice' | 'announcement'>('music')

  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([])

  const [announcementDraft, setAnnouncementDraft] = useState('')

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [user, router])

  const authHeaders = (): Record<string, string> => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('ssb_auth_token')
        : null

    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const loadAll = async () => {
    setLoading(true)
    try {
      const [tracksRes, playlistsRes, broadcastRes] = await Promise.all([
        fetch('/api/admin/dj/tracks', { headers: authHeaders() }),
        fetch('/api/admin/dj/playlists', { headers: authHeaders() }),
        fetch('/api/admin/dj/broadcast', { headers: authHeaders() }),
      ])
      const tracksData = await tracksRes.json()
      const playlistsData = await playlistsRes.json()
      const broadcastData = await broadcastRes.json()
      if (tracksData.success) setTracks(tracksData.tracks)
      if (playlistsData.success) setPlaylists(playlistsData.playlists)
      if (broadcastData.success) {
        setBroadcast(broadcastData.broadcast)
        setAnnouncementDraft(broadcastData.broadcast?.announcement_text || '')
      }
    } catch {
      setError('Failed to load DJ Workshop data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') loadAll()
  }, [user])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const audio = document.createElement('audio')
      const durationSeconds: number = await new Promise((resolve) => {
        audio.src = URL.createObjectURL(file)
        audio.onloadedmetadata = () => resolve(Math.round(audio.duration) || 0)
        audio.onerror = () => resolve(0)
      })

      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', uploadTitle || file.name)
      formData.append('artist', uploadArtist)
      formData.append('trackType', uploadType)
      formData.append('durationSeconds', String(durationSeconds))

      const res = await fetch('/api/admin/dj/tracks', {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        setUploadTitle('')
        setUploadArtist('')
        loadAll()
      } else {
        setError(data.error || 'Upload failed')
      }
    } catch {
      setError('Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const toggleTrackSelection = (id: string) => {
    setSelectedTrackIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])
  }

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim() || selectedTrackIds.length === 0) return
    try {
      const res = await fetch('/api/admin/dj/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ name: newPlaylistName.trim(), trackIds: selectedTrackIds }),
      })
      const data = await res.json()
      if (data.success) {
        setNewPlaylistName('')
        setSelectedTrackIds([])
        loadAll()
      } else {
        setError(data.error || 'Failed to create playlist')
      }
    } catch {
      setError('Failed to create playlist')
    }
  }

  const handleGoLive = async (playlistId: string) => {
    try {
      const res = await fetch('/api/admin/dj/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ playlistId }),
      })
      const data = await res.json()
      if (data.success) loadAll()
      else setError(data.error || 'Failed to go live')
    } catch {
      setError('Failed to go live')
    }
  }

  const handleStop = async () => {
    await fetch('/api/admin/dj/broadcast', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ action: 'stop' }),
    })
    loadAll()
  }

  const handleSkip = async (trackId: string) => {
    await fetch('/api/admin/dj/broadcast', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ action: 'skip', trackId }),
    })
    loadAll()
  }

  const handleAnnounce = async () => {
    await fetch('/api/admin/dj/broadcast', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ action: 'announce', announcementText: announcementDraft.trim() || null }),
    })
    loadAll()
  }

  if (!user || user.role !== 'admin') return null

  const typeIcon = { music: Music, voice: Mic, announcement: Megaphone }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Radio className="h-6 w-6 text-cyan-400" />
          DJ Workshop
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Set the institution's rhythm. Anyone joining mid-broadcast hears the current moment, not the start.
        </p>
      </div>

      {error && <div className="text-sm text-red-400">{error}</div>}

      {/* Now Playing */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Broadcast Status</h2>
          {broadcast?.is_live && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> LIVE
            </span>
          )}
        </div>
        {broadcast?.is_live ? (
          <div className="space-y-3">
            <div>
              <p className="text-white font-bold">{broadcast.track_title || 'No track'}</p>
              <p className="text-sm text-slate-500">{broadcast.track_artist}</p>
            </div>
            <button onClick={handleStop} className="flex items-center gap-2 text-sm bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg px-3 py-1.5 hover:bg-red-500/20 transition">
              <Square className="h-3.5 w-3.5" /> Stop Broadcast
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Not live. Go live with a playlist below.</p>
        )}

        <div className="mt-4 pt-4 border-t border-slate-800">
          <label className="text-xs text-slate-500 block mb-2">Institutional Announcement</label>
          <div className="flex gap-2">
            <input
              value={announcementDraft}
              onChange={(e) => setAnnouncementDraft(e.target.value)}
              placeholder="e.g. Markets open in 10 minutes..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500"
            />
            <button onClick={handleAnnounce} className="text-sm bg-slate-800 hover:bg-slate-700 text-white rounded-lg px-4 py-2 transition">
              Set
            </button>
          </div>
        </div>
      </div>

      {/* Upload */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Upload Track</h2>
        <div className="grid grid-cols-2 gap-2">
          <input
            placeholder="Title"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500"
          />
          <input
            placeholder="Artist (optional)"
            value={uploadArtist}
            onChange={(e) => setUploadArtist(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500"
          />
        </div>
        <select
          value={uploadType}
          onChange={(e) => setUploadType(e.target.value as any)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="music">Music</option>
          <option value="voice">Voice Message</option>
          <option value="announcement">Announcement</option>
        </select>
        <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleUpload} disabled={uploading} className="text-sm text-slate-400" />
        {uploading && <p className="text-xs text-slate-500 flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Uploading...</p>}
      </div>

      {/* Track Library + Playlist Builder */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Library — select tracks to build a playlist</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : tracks.length === 0 ? (
          <p className="text-sm text-slate-500">No tracks uploaded yet.</p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {tracks.map((t) => {
              const Icon = typeIcon[t.track_type]
              return (
                <label key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTrackIds.includes(t.id)}
                    onChange={() => toggleTrackSelection(t.id)}
                  />
                  <Icon className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-white">{t.title}</span>
                  <span className="text-xs text-slate-500">{t.artist}</span>
                  <span className="text-xs text-slate-600 ml-auto">{t.duration_seconds}s</span>
                </label>
              )
            })}
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <input
            placeholder="New playlist name"
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500"
          />
          <button
            onClick={handleCreatePlaylist}
            disabled={!newPlaylistName.trim() || selectedTrackIds.length === 0}
            className="text-sm bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-lg px-4 py-2 transition"
          >
            Create Playlist
          </button>
        </div>
      </div>

      {/* Playlists */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Playlists</h2>
        {playlists.length === 0 ? (
          <p className="text-sm text-slate-500">No playlists yet.</p>
        ) : (
          <div className="space-y-2">
            {playlists.map((p) => (
              <div key={p.id} className="border border-slate-800 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold text-sm">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.tracks.length} tracks</p>
                  </div>
                  <button
                    onClick={() => handleGoLive(p.id)}
                    className="flex items-center gap-1.5 text-xs bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg px-3 py-1.5 hover:bg-green-500/20 transition"
                  >
                    <Play className="h-3 w-3" /> Go Live
                  </button>
                </div>
                {broadcast?.is_live && broadcast?.playlist_id === p.id && (
                  <div className="mt-2 pt-2 border-t border-slate-800 flex flex-wrap gap-1">
                    {p.tracks.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleSkip(t.id)}
                        className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border transition ${
                          broadcast.current_track_id === t.id
                            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        <SkipForward className="h-2.5 w-2.5" /> {t.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
