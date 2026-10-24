'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Flame, FolderOpen, Menu, PackageOpen, Volume2 } from 'lucide-react'
import SharedSystemSwitchWorld from '@/components/system-switch/shared-system-switch-world'
import ClientFileFolderGate from '@/components/system-switch/client-file-folder-gate'
import ClientFileFolderOperatingEnvironment from '@/components/system-switch/client-file-folder-operating-environment'
import { FileFolderEnvironmentLoader } from '@/components/system-switch/file-folder-environment-loader'
import { getClientToken, getClientUser } from '@/lib/client-auth'
import './file-folder-phone.css'

export default function ClientSystemSwitchPage() {
  const router = useRouter()
  const [privateWorkshop,setPrivateWorkshop]=useState(false)
  const [entry, setEntry] = useState<any>(null)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [soundAvailable,setSoundAvailable]=useState(false)
  const [soundPlaying,setSoundPlaying]=useState(false)
  const [arrivedFromEvent,setArrivedFromEvent]=useState(false)
  useEffect(()=>{setArrivedFromEvent(new URLSearchParams(window.location.search).get('via')==='system-switch')},[])
  useEffect(()=>{
    const availability=(event:Event)=>setSoundAvailable(Boolean((event as CustomEvent).detail?.available))
    const playback=(event:Event)=>setSoundPlaying(Boolean((event as CustomEvent).detail?.playing))
    window.addEventListener('weave:live-sound-availability',availability)
    window.addEventListener('weave:dj-audio-state',playback)
    window.dispatchEvent(new Event('weave:request-live-sound-state'))
    return()=>{window.removeEventListener('weave:live-sound-availability',availability);window.removeEventListener('weave:dj-audio-state',playback)}
  },[])

  useEffect(() => {
    const controller=new AbortController()
    const timeout=window.setTimeout(()=>controller.abort(),12000)
    const localClient = getClientUser()
    const token = getClientToken()
    if (!localClient || !token) {
      window.clearTimeout(timeout)
      router.replace('/client/login')
      return () => controller.abort()
    }

    const headers = { Authorization: `Bearer ${token}` }

    const load = async () => {
      const bootStartedAt=Date.now()
      try {
        const entryResponse = await fetch('/api/client/file-folder-entry', { headers, cache: 'no-store', signal:controller.signal })
        const entryBody = await entryResponse.json()
        if (!entryResponse.ok) throw new Error(entryBody.error || 'Unable to resolve File Folder entry')

        setEntry(entryBody)

        if (!entryBody.active) return

        const response = await fetch('/api/client/system-switch', { headers, cache: 'no-store', signal:controller.signal })
        const body = await response.json()
        if (!response.ok) {
          if (body.gate) {
            setEntry({
              ...entryBody,
              active: false,
              gate: {
                stage: body.gate,
                title: body.gate === 'personalization' ? 'Workshop Formation Gate' : 'File Folder Gate',
                detail: body.error,
              },
            })
            return
          }
          throw new Error(body.error || 'Unable to open System Switch')
        }
        setData(body)
      } catch (err) {
        if(controller.signal.aborted){
          setError('The File Folder took too long to form. Refresh or return to the Client World and enter again.')
        }else{
          setError(err instanceof Error ? err.message : 'Unable to open System Switch')
        }
      } finally {
        window.clearTimeout(timeout)
        const remainingBoot=Math.max(0,2200-(Date.now()-bootStartedAt))
        if(remainingBoot>0)await new Promise(resolve=>window.setTimeout(resolve,remainingBoot))
        setLoading(false)
      }
    }

    void load()
    return()=>{
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [router])

  // Administration can publish new equipment/theme packs without an app deployment.
  // Keep the Client's current 3D/working state; update only the release settings.
  useEffect(()=>{
    if(!data?.verified)return
    let mounted=true
    const synchronize=async()=>{
      if(document.visibilityState!=='visible')return
      const token=getClientToken()
      if(!token)return
      try{
        const response=await fetch('/api/client/file-folder-release',{
          headers:{Authorization:'Bearer '+token},cache:'no-store',
        })
        if(!response.ok)return
        const release=await response.json()
        if(!mounted||!release.success)return
        setData((previous:any)=>{
          if(!previous || Number(previous.file_folder_world_release?.version)===Number(release.version))return previous
          return {...previous,file_folder_world_release:{version:release.version,config:release.config}}
        })
      }catch{}
    }
    const timer=window.setInterval(()=>{void synchronize()},45000)
    const onVisible=()=>{void synchronize()}
    document.addEventListener('visibilitychange',onVisible)
    return()=>{mounted=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',onVisible)}
  },[Boolean(data?.verified)])

  if (loading) return <div className="relative" data-client-loading-with-open-world-return="true">
    <FileFolderEnvironmentLoader />
    <Link href="/system-switch/world" className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-[150] inline-flex min-h-12 -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-sky-200/40 bg-[#06182a]/95 px-5 text-xs font-bold text-white shadow-xl backdrop-blur-lg">
      <ArrowLeft className="h-4 w-4"/> Return to Weave Open World
    </Link>
  </div>

  if (entry && !entry.active) return <ClientFileFolderGate entry={entry} />

  if (error || !data?.verified || !data?.workshop) {
    return <main className="min-h-screen bg-transparent text-white p-4 flex items-center justify-center"><div className="w-full max-w-lg border-y border-cyan-200/10 bg-[#040a12]/92 p-8 text-center backdrop-blur-xl"><FolderOpen className="mx-auto h-10 w-10 text-sky-400" /><h1 className="mt-5 text-2xl font-semibold">File Folder</h1><p className="mt-3 text-sm leading-6 text-slate-400">{error || 'Your File Folder could not be opened.'}</p><Link href="/system-switch/world" className="mt-6 inline-flex rounded-full border border-white/10 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em]">Return to Weave Open World</Link></div></main>
  }

  return (
    <main className="weave-file-folder-page min-h-dvh bg-transparent pt-16 text-white sm:pt-0" data-client-file-folder-entry="crossing-to-open-world" data-system-switch-gate="crossed" data-system-switch-flame-event="burning-river" data-weave-world="file-folder">
      <Link href="/system-switch/world" data-client-return-weave-open-world="true"
        className="fixed left-3 top-[max(4.25rem,env(safe-area-inset-top))] z-[90] inline-flex min-h-11 max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full border border-sky-200/35 bg-[#06182a]/95 px-3 py-2 text-[11px] font-bold text-sky-100 shadow-xl backdrop-blur-xl sm:left-5">
        <ArrowLeft className="h-4 w-4 shrink-0"/> Return to Weave Open World
      </Link>
      {privateWorkshop&&data?.file_folder_world_release?.config&&<section
        className="mx-3 mb-3 rounded-xl border border-cyan-200/20 bg-[#071927]/85 p-3 text-white sm:mx-5"
        data-global-file-folder-release={String(data.file_folder_world_release.version)}>
        <p className="text-[10px] font-black uppercase tracking-widest text-cyan-200">{String(data.file_folder_tier||'standard').toUpperCase()} File Folder · World update {data.file_folder_world_release.version}</p>
        <h2 className="mt-1 text-sm font-bold">{data.file_folder_world_release.config.headline}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-300">{data.file_folder_world_release.config.tierMessages?.[data.file_folder_tier]||data.file_folder_world_release.config.description}</p>
      </section>}

      {privateWorkshop&&<section className="mx-2 mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/25 bg-[linear-gradient(120deg,rgba(74,111,133,.23),rgba(8,23,40,.93)_52%,rgba(158,102,39,.16))] px-3 py-3 text-white sm:mx-5" data-system-switch-client-continuation="real-file-folder">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[.15em] text-amber-200">{arrivedFromEvent?'Arrived from Flame Event · System Switch':'System Switch · Client-owned File Folder'}</p>
          <h1 className="mt-1 text-sm font-black text-white">The crossing continues as your own operating world.</h1>
          <p className="mt-1 max-w-2xl text-[11px] leading-5 text-sky-100/75">The same physical avatar and Switch arch continue here. Your actual builds, systems, Customer Door and work determine what this ground can do. This is your private formation space, not the public Customer Market.</p>
        </div>
        <Link href="/client/system-switch/flame-event" className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-amber-200/35 px-3 py-2 text-[10px] font-bold text-amber-100"><Flame className="h-3.5 w-3.5"/> Return to Burning River</Link>
      </section>}
      {privateWorkshop?<ClientFileFolderOperatingEnvironment data={data} />:<SharedSystemSwitchWorld role="client" getToken={getClientToken} onPrivateWorkshop={()=>setPrivateWorkshop(true)}/>}
      <details className="ff-page-actions">
        <summary aria-label="File Folder menu"><Menu aria-hidden="true" className="h-5 w-5"/></summary>
        <nav aria-label="File Folder actions">
          <p>File Folder</p>
          {privateWorkshop&&<button type="button" onClick={()=>setPrivateWorkshop(false)}>Return to shared System Switch</button>}
          <Link href="/system-switch/world"><ArrowLeft className="h-4 w-4"/>Return to Weave Open World</Link>
          <Link href="/client/system-store" data-file-folder-publish-system="true"><PackageOpen className="h-4 w-4"/>Publish System</Link>
          <Link href="/client/system-switch/flame-event" data-file-folder-flame-event="inside"><Flame className="h-4 w-4"/>Flame Event</Link>
          <button type="button" disabled={!soundAvailable} onClick={()=>window.dispatchEvent(new Event('weave:toggle-live-sound'))}><Volume2 className="h-4 w-4"/>{!soundAvailable?'Live sound is offline':soundPlaying?'Pause live sound':'Play live sound'}</button>
        </nav>
      </details>
    </main>
  )
}
