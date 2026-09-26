'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { ArrowRight, Loader2, Users, FileText, ChevronRight, Search, ShieldCheck, Orbit } from 'lucide-react'
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
  client_name?: string | null
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
    const pass=Number(state.crossing.currentPass || 0)
    const progress=Math.max(0,Math.min(100,pass*25))
    return (
      <main className="mx-auto w-full max-w-4xl p-3 md:p-6">
        <section className="weave-system-depth overflow-hidden rounded-[2rem] border border-sky-300/15 bg-[#030a15]/72">
          <header className="border-b border-white/10 bg-[radial-gradient(circle_at_14%_0%,rgba(14,165,233,.13),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(139,92,246,.08),transparent_28%)] p-5 md:p-7">
            <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-sky-300">Client Player · System Switch</p>
            <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">The Crossing is a recorded transition into the Client world.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{crossingMessage[state.crossing.phase] ?? 'Your crossing is being prepared.'}</p>
          </header>

          <div className="grid gap-4 p-4 md:p-6 lg:grid-cols-[1fr_300px]">
            <section className="weave-reading-surface rounded-3xl p-5 md:p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-sky-300/15 bg-sky-400/[0.04] p-5">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">Current pass</p>
                  <p className="mt-3 text-3xl font-black text-white">{pass || 'Not started'}</p>
                  <p className="mt-2 text-xs text-slate-400">Recorded System Switch progress.</p>
                </div>
                <div className="rounded-2xl border border-violet-300/15 bg-violet-400/[0.04] p-5">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-300">File Number</p>
                  <p className="mt-3 break-all font-mono text-sm font-black text-white">{state.crossing.fileNumber ?? 'Pending issue'}</p>
                  <p className="mt-2 text-xs text-slate-400">Persistent Client identity when issued.</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-amber-300/15 bg-amber-400/[0.035] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">Crossing state</p>
                    <p className="mt-1 text-sm font-black capitalize text-white">{String(state.crossing.phase || 'preparing').replaceAll('_',' ')}</p>
                  </div>
                  <span className="text-sm font-black text-amber-200">{progress}%</span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/30"><div className="h-full rounded-full bg-amber-300" style={{width:`${progress}%`}}/></div>
                <p className="mt-3 text-[10px] leading-5 text-slate-400">The bar reflects recorded passes only. It does not simulate completed movement.</p>
              </div>
            </section>

            <aside className="space-y-4">
              <section className="rounded-3xl border border-emerald-300/15 bg-emerald-400/[0.04] p-4">
                <div className="flex items-center gap-2"><Orbit className="h-4 w-4 text-emerald-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">Crossing causality</p></div>
                <div className="mt-3 space-y-2 text-xs font-semibold text-slate-300">
                  <p>Connection → recognition.</p>
                  <p>Recognition → File identity.</p>
                  <p>File identity → Client world.</p>
                  <p>Client world → build + operate.</p>
                </div>
              </section>
              <section className="rounded-3xl border border-violet-300/15 bg-violet-400/[0.04] p-4">
                <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-violet-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-300">Truth rule</p></div>
                <p className="mt-3 text-xs leading-5 text-slate-300">Bridge Plaza opens when the recorded Client state reaches that district. The interface does not bypass the crossing.</p>
              </section>
            </aside>
          </div>
        </section>
      </main>
    )
  }

  const filteredFolders = folders.filter(f => 
    f.file_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.identity_data?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-3 md:p-6">
      <header className="weave-system-depth rounded-[2rem] border border-sky-300/15 bg-[#030a15]/72 p-5 md:p-7">
        <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-sky-300">Bridge Plaza · World Router</p>
        <h1 className="mt-2 text-3xl font-black text-white md:text-5xl">One world. Distinct districts. Recorded movement between them.</h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
          Interaction in motion. The subject remains WEAVE while Client movement, workshops, problems, builds, discovery and participation become functional topics inside the same world.
        </p>
      </header>

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
          <p className="text-center text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Select an active district portal to create navigation movement.</p>
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
                        {folder.client_name || folder.identity_data?.name || 'Unnamed Client'}
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
    </main>
  )
}

