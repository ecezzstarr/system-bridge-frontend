'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Users, FileText, ChevronRight, Search } from 'lucide-react'
import { WEAVE_ARCHITECTURE } from '@/lib/weave-architecture'

const BridgePlazaMap = dynamic(
  () => import('@/components/world/bridge-plaza-map').then((module) => module.BridgePlazaMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[560px] animate-pulse rounded-3xl border border-white/10 bg-slate-950" />
    ),
  },
)

type WorldState = {
  currentDistrict: string | null
  worldRoles: string[]
  crossing: {
    phase: string
    currentPass: number
    fileNumber: string | null
  }
}

interface FileFolder {
  id: string
  file_number: string
  status: string
  bridger_id: string
  bridger_name: string
  identity_data: any
  created_at: string
}

const crossingMessage: Record<string, string> = {
  bridge_contact: 'Begin your crossing through a Bridge AI link.',
  file_folder_issued: 'Your File Folder is issued. Continue with Pass 1.',
  pass_1_active: 'Pass 1 is active: establish your File Number and Bridger connection.',
  pass_2_active: 'Pass 2 is active: complete Human Bridger participation.',
  pass_3_active: 'Pass 3 is active: specialist participation is in progress.',
  awaiting_recognition: 'Your crossing is complete and awaiting Administration recognition.',
}

export default function WeavePage() {
  const { token, user } = useAuth()
  const router = useRouter()
  const [state, setState] = useState<WorldState | null>(null)
  const [loading, setLoading] = useState(true)
  const [folders, setFolders] = useState<FileFolder[]>([])
  const [loadingFolders, setLoadingFolders] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const isSupport = user?.role === 'admin' || user?.role === 'agent' || user?.role === 'bridger'

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }

    // Load World State
    fetch('/api/world/state', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then((data) => setState(data.success ? data.state : null))
      .catch(() => setState(null))
      .finally(() => setLoading(false))

    // Load File Folders if support
    if (isSupport) {
      setLoadingFolders(true)
      fetch('/api/world/file-folders', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => { if (data.success) setFolders(data.folders) })
        .catch(err => console.error('Failed to load folders:', err))
        .finally(() => setLoadingFolders(false))
    }
  }, [token, isSupport])

  if (loading) {
    return <div className="p-8 text-muted-foreground">Entering Weave…</div>
  }

  if (!user || !state) {
    return <div className="p-8 text-muted-foreground">Sign in to enter Weave.</div>
  }

  // Client Crossing View
  if (user.role === 'client' && state.currentDistrict !== 'bridge_plaza') {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-8">
        <div>
          <p className="text-sm font-medium text-primary">CLIENT PLAYER · SYSTEM SWITCH</p>
          <h1 className="mt-2 text-3xl font-bold">The Crossing</h1>
          <p className="mt-2 text-muted-foreground">
            {crossingMessage[state.crossing.phase] ?? 'Your crossing is being prepared.'}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Crossing Record</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Current pass</p>
              <p className="mt-1 text-3xl font-bold">{state.crossing.currentPass || 'Not started'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">File Number</p>
              <p className="mt-1 font-mono">{state.crossing.fileNumber ?? 'Pending issue'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const filteredFolders = folders.filter(f => 
    f.file_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.identity_data?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-8">
      <div>
        <p className="text-sm font-medium text-primary uppercase tracking-[0.2em]">The Weave of Presence · Subject</p>
        <h1 className="mt-2 text-4xl md:text-5xl font-black">Bridge Plaza</h1>
        <p className="mt-2 text-muted-foreground max-w-3xl">
          Interaction in motion. The subject stays fixed while every Client movement, workshop, problem, build, discovery, and participation can become a topic inside Weave.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <p className="text-[9px] uppercase tracking-[0.24em] text-slate-500">School</p>
          <p className="mt-2 text-sm font-semibold">{WEAVE_ARCHITECTURE.school.name}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Earth and beyond: the field in which learning and participation continue.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <p className="text-[9px] uppercase tracking-[0.24em] text-slate-500">Board</p>
          <p className="mt-2 text-sm font-semibold">{WEAVE_ARCHITECTURE.board.name}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">The responsive surface that can turn writing into organized movement.</p>
        </div>
        <div className="rounded-2xl border border-sky-400/20 bg-sky-400/5 p-4">
          <p className="text-[9px] uppercase tracking-[0.24em] text-sky-300">Subject</p>
          <p className="mt-2 text-sm font-semibold">{WEAVE_ARCHITECTURE.subject.name}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">The institutional frame remains constant.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <p className="text-[9px] uppercase tracking-[0.24em] text-slate-500">Topics</p>
          <p className="mt-2 text-sm font-semibold">What we build and do</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Each current interaction becomes a topic that can be made functional through Weave.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
        {/* Map View */}
        <div className="space-y-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-[40px] blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-slate-950 border border-white/10 rounded-[38px] overflow-hidden shadow-2xl">
              <BridgePlazaMap
                currentPass={state.crossing.currentPass}
                worldRoles={state.worldRoles}
                onTravel={(href) => router.push(href)}
              />
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground uppercase tracking-widest animate-pulse">
            Select an active district portal to travel
          </p>
        </div>

        {/* Support: File Folder Selection */}
        {isSupport && (
          <div className="flex flex-col gap-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 flex flex-col h-[560px]">
              <div className="flex items-center gap-2 mb-6">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-bold">Client Player Support</h2>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search file or client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm focus:border-cyan-500/50 outline-none transition-colors"
                />
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                {loadingFolders ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <p className="text-xs uppercase tracking-widest">Scanning folders...</p>
                  </div>
                ) : filteredFolders.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
                    <p className="text-sm text-slate-500">No active movements found.</p>
                  </div>
                ) : (
                  filteredFolders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => router.push(`/weave/file-folder/${encodeURIComponent(folder.file_number)}`)}
                      className="w-full text-left bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/30 p-4 rounded-2xl transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest">
                          File {folder.file_number}
                        </span>
                        <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-cyan-500 transition-colors" />
                      </div>
                      <p className="text-sm font-bold text-white mb-0.5 truncate">
                        {folder.identity_data?.name || 'Unnamed Client'}
                      </p>
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3 text-slate-500" />
                        <span className="text-[10px] text-slate-500 truncate">
                          {folder.bridger_name || 'Assigned Bridger'}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-800">
                <p className="text-[10px] text-slate-500 leading-relaxed italic">
                  Select a Client Player&apos;s File Folder to travel into the same persistent Main File Folder world through Bridge Plaza. The Client remains the player position.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

