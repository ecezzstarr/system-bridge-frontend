'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@/lib/auth-provider'
import { Loader2, Users, Search, ShieldCheck, Orbit, X, MoveRight } from 'lucide-react'
import { useEnvironmentOrganizer } from '@/components/world/environment-organizer-provider'
import { WEAVE_ENVIRONMENT_REGISTRY } from '@/lib/weave-environment-registry'
import { buildBridgePlazaDistricts, type WeavePlaceSurface } from '@/lib/weave-place-map'

const BridgePlazaMap = dynamic(
  () => import('@/components/world/bridge-plaza-map').then((module) => module.BridgePlazaMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[720px] h-[calc(100dvh-1rem)] items-center justify-center bg-transparent">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 animate-[spin_3s_linear_infinite] rounded-full border border-amber-200/10 border-t-amber-200/60"/>
          <p className="mt-4 text-[8px] font-black uppercase tracking-[.24em] text-amber-200">Forming Bridge Plaza</p>
        </div>
      </div>
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
  const [supportOpen, setSupportOpen] = useState(false)
  const [selectedDistrictId,setSelectedDistrictId]=useState<string|null>(null)
  const {items:environmentItems}=useEnvironmentOrganizer()

  const registryFallback=useMemo<WeavePlaceSurface[]>(()=>WEAVE_ENVIRONMENT_REGISTRY.map(surface=>({
    surface_key:surface.key,
    label:surface.label,
    surface_kind:surface.kind,
    route:surface.route,
    area:surface.area,
    scope:surface.scope,
    is_visible:true,
    sort_order:surface.defaultOrder,
    is_protected:Boolean(surface.protected),
  })),[])

  const districtGroups=useMemo(
    ()=>buildBridgePlazaDistricts(user?.role,environmentItems.length?environmentItems as WeavePlaceSurface[]:registryFallback),
    [environmentItems,registryFallback,user?.role],
  )
  const districtPortals=useMemo(()=>districtGroups.map(district=>({
    id:district.key,
    name:district.label,
    subtitle:district.subtitle,
    placeCount:district.places.length,
    position:district.position,
    rotation:district.rotation,
  })),[districtGroups])
  const selectedDistrict=districtGroups.find(district=>district.key===selectedDistrictId)||null

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
    return <div className="min-h-[70vh]" data-environment-pending="true" aria-hidden="true" />
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
            <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-amber-200">Client Player · System Switch</p>
            <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">The Crossing is a recorded transition into the Client world.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{crossingMessage[state.crossing.phase] ?? 'Your crossing is being prepared.'}</p>
          </header>

          <div className="grid gap-4 p-4 md:p-6 lg:grid-cols-[1fr_300px]">
            <section className="weave-reading-surface rounded-3xl p-5 md:p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-sky-300/15 bg-sky-400/[0.04] p-5">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-200">Current pass</p>
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
    <main
      className="relative min-h-[720px] h-[calc(100dvh-1rem)] overflow-hidden bg-transparent"
      data-bridge-plaza-theme="continuous-moving-system"
    >
      <BridgePlazaMap
        districts={districtPortals}
        onOpenDistrict={(districtId)=>setSelectedDistrictId(districtId)}
      />


      <AnimatePresence>
        {selectedDistrict&&(
          <motion.nav
            key={selectedDistrict.key}
            initial={{opacity:0,y:18}}
            animate={{opacity:1,y:0}}
            exit={{opacity:0,y:18}}
            transition={{duration:.28,ease:[.22,1,.36,1]}}
            className="absolute inset-x-3 bottom-28 z-30 border-y border-white/10 bg-[#030a15]/88 px-3 py-3 backdrop-blur-xl sm:inset-x-6"
            data-bridge-plaza-district={selectedDistrict.key}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[7px] font-black uppercase tracking-[.2em] text-orange-200">District entered</p>
                <h2 className="mt-1 truncate text-sm font-black text-white sm:text-base">{selectedDistrict.label}</h2>
              </div>
              <p className="shrink-0 text-[8px] font-black uppercase tracking-[.14em] text-slate-500">{selectedDistrict.places.length} {selectedDistrict.places.length===1?'place':'places'}</p>
            </div>
            <div className="mt-3 flex gap-1 overflow-x-auto pb-1" data-district-place-line="true">
              {selectedDistrict.places.map((place,index)=>(
                <button
                  key={place.key}
                  type="button"
                  onClick={()=>{
                    if(place.route==='/weave#file-folders'){
                      setSupportOpen(true)
                      return
                    }
                    setSupportOpen(false)
                    router.push(place.route)
                  }}
                  className="group flex min-w-[180px] max-w-[260px] items-center gap-3 border-r border-white/10 px-3 py-2 text-left first:pl-0 last:border-r-0"
                  data-bridge-plaza-place={place.key}
                >
                  <span className="font-mono text-[8px] text-slate-600">{String(index+1).padStart(2,'0')}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[10px] font-black text-white group-hover:text-orange-100">{place.label}</span>
                    <span className="mt-1 block text-[7px] font-bold uppercase tracking-[.12em] text-slate-600">{place.kind==='station'?'station inside Bridge Plaza':'functional place'}</span>
                  </span>
                  <MoveRight className="h-3.5 w-3.5 shrink-0 text-slate-700 transition group-hover:translate-x-1 group-hover:text-orange-200"/>
                </button>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSupport && supportOpen && (
          <motion.aside
            initial={{x:'100%',opacity:0}}
            animate={{x:0,opacity:1}}
            exit={{x:'100%',opacity:0}}
            transition={{duration:.42,ease:[.22,1,.36,1]}}
            className="absolute inset-y-0 right-0 z-40 flex w-full max-w-[460px] flex-col border-l border-cyan-100/10 bg-[#08090d]/95 shadow-[-28px_0_90px_rgba(0,0,0,.42)] backdrop-blur-2xl"
            data-bridge-plaza-station="client-support"
          >
            <header className="border-b border-cyan-100/10 px-5 pb-4 pt-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[.23em] text-cyan-200">Bridge Plaza · System Switch</p>
                  <h2 className="mt-2 text-xl font-black text-white">File Folder View</h2>
                  <p className="mt-2 text-[10px] leading-5 text-stone-400">System Switch opens the Client File Folder world from Bridge Plaza. Support enters the same live environment in read-only mode; ownership and Client controls stay with the Client.</p>
                </div>
                <button onClick={()=>setSupportOpen(false)} className="mt-0.5 p-2 text-stone-500 transition hover:text-white" aria-label="Close Client Support Station">
                  <X className="h-4 w-4"/>
                </button>
              </div>

              <div className="relative mt-5 border-y border-cyan-100/10">
                <Search className="absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-600"/>
                <input
                  type="text"
                  placeholder="Search File Number or Client"
                  value={searchQuery}
                  onChange={(event)=>setSearchQuery(event.target.value)}
                  className="w-full bg-transparent py-3 pl-6 pr-2 text-xs text-white outline-none placeholder:text-stone-700"
                />
              </div>
            </header>

            <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
              <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[.14em] text-stone-600">
                <Users className="h-3.5 w-3.5"/>
                System Switch · File Folders
              </div>
              <span className="font-mono text-[9px] text-cyan-200/75">{filteredFolders.length}</span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {loadingFolders ? (
                <div className="flex h-full min-h-60 flex-col items-center justify-center gap-3 text-stone-600">
                  <Loader2 className="h-5 w-5 animate-spin"/>
                  <p className="text-[8px] font-black uppercase tracking-[.18em]">Reading Client movements</p>
                </div>
              ) : filteredFolders.length===0 ? (
                <div className="flex h-full min-h-60 items-center justify-center px-6 text-center text-[10px] leading-5 text-stone-600">
                  No Client File Folder movement matches this station search.
                </div>
              ) : (
                filteredFolders.map((folder,index)=>(
                  <button
                    key={folder.id}
                    onClick={()=>router.push(`/weave/file-folder/${encodeURIComponent(folder.file_number)}`)}
                    className="group grid w-full grid-cols-[34px_minmax(0,1fr)_18px] items-center gap-3 border-b border-white/[.055] px-5 py-4 text-left transition hover:bg-cyan-200/[.035]"
                  >
                    <span className="font-mono text-[8px] text-stone-700">{String(index+1).padStart(2,'0')}</span>
                    <span className="min-w-0">
                      <span className="block break-words font-mono text-[9px] font-black uppercase tracking-[.09em] text-cyan-200/75">{folder.file_number}</span>
                      <span className="mt-1 block break-words text-xs font-black text-white">{folder.client_name||folder.identity_data?.name||'Unnamed Client'}</span>
                      <span className="mt-1 block break-words text-[8px] uppercase tracking-[.08em] text-stone-600">{folder.bridger_name||'Assigned Bridger'} · {folder.status}</span>
                    </span>
                    <MoveRight className="h-3.5 w-3.5 text-stone-700 transition group-hover:translate-x-1 group-hover:text-cyan-200"/>
                  </button>
                ))
              )}
            </div>

            <footer className="border-t border-cyan-100/10 px-5 py-4">
              <p className="text-[8px] leading-4 text-stone-600">Support enters the same persistent Client world. Ownership remains with the Client player.</p>
            </footer>
          </motion.aside>
        )}
      </AnimatePresence>
    </main>
  )
}
