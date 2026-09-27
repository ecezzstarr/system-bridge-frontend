'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Flame, FolderOpen, ShieldCheck, Waves } from 'lucide-react'
import ClientFileFolderGate from '@/components/system-switch/client-file-folder-gate'
import ClientFileFolderOperatingEnvironment from '@/components/system-switch/client-file-folder-operating-environment'
import { FileFolderEnvironmentLoader } from '@/components/system-switch/file-folder-environment-loader'
import { getClientToken, getClientUser } from '@/lib/client-auth'
import { WEAVE_ARCHITECTURE } from '@/lib/weave-architecture'
import { FLAME_EVENT, resolveEventStatus } from '@/lib/weave-event'

export default function ClientSystemSwitchPage() {
  const router = useRouter()
  const [entry, setEntry] = useState<any>(null)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const flameStatus = resolveEventStatus(FLAME_EVENT, new Date())
  const flameState = flameStatus === 'active' ? 'LIVE' : flameStatus === 'planned' ? 'PREPARING' : 'CLOSED'

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
        setLoading(false)
      }
    }

    void load()
    return()=>{
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [router])

  if (loading) return <FileFolderEnvironmentLoader />

  if (entry && !entry.active) return <ClientFileFolderGate entry={entry} />

  if (error || !data?.verified || !data?.workshop) {
    return <main className="min-h-screen bg-transparent text-white p-4 flex items-center justify-center"><div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950 p-8 text-center"><FolderOpen className="mx-auto h-10 w-10 text-sky-400" /><h1 className="mt-5 text-2xl font-semibold">File Folder</h1><p className="mt-3 text-sm leading-6 text-slate-400">{error || 'Your File Folder could not be opened.'}</p><Link href="/client/dashboard" className="mt-6 inline-flex rounded-full border border-white/10 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em]">Return to Portal</Link></div></main>
  }

  return (
    <main className="min-h-screen bg-transparent p-3 md:p-6 text-white">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-4 overflow-hidden border-y border-orange-200/15 bg-[#0b0706]/78 backdrop-blur-xl" data-system-switch-flame-event="burning-river">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-200/10 bg-orange-300/[.035] px-5 py-2.5">
            <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[.2em] text-orange-200">
              <Flame className="h-3.5 w-3.5" />
              <span>FLAME EVENT</span>
              <span className="text-white/20">·</span>
              <Waves className="h-3.5 w-3.5" />
              <span>Burning River</span>
            </div>
            <p className="text-[8px] font-bold uppercase tracking-[.16em] text-rose-100/50">The River that Burns · {flameState}</p>
          </div>
          <div className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4"><div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-3"><FolderOpen className="h-6 w-6 text-sky-300" /></div><div><p className="text-[9px] uppercase tracking-[0.3em] text-sky-300">System Switch → Main File Folder</p><h1 className="mt-1 text-lg font-semibold">{data.client.name}</h1><p className="text-xs text-slate-500">{data.client.business_name || data.client.email}</p><p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">Current Topic · {data.workshop.title}</p></div></div>
            <div className="flex items-center gap-3"><div className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-right"><p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">File Number</p><p className="font-mono text-xs text-slate-200">{data.client.file_number}</p></div><div className="hidden sm:flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-[10px] uppercase tracking-[0.15em] text-emerald-300"><ShieldCheck className="h-4 w-4" /> Active</div></div>
          </div>
        </div>

        <ClientFileFolderOperatingEnvironment data={data} />

        <div className="mt-4"><Link href="/client/dashboard" className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs text-slate-400 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /> Portal</Link></div>
      </div>
    </main>
  )
}
