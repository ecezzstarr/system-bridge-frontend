'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Flame, FolderOpen, Menu, PackageOpen, Volume2 } from 'lucide-react'
import ClientFileFolderGate from '@/components/system-switch/client-file-folder-gate'
import ClientFileFolderOperatingEnvironment from '@/components/system-switch/client-file-folder-operating-environment'
import { FileFolderEnvironmentLoader } from '@/components/system-switch/file-folder-environment-loader'
import { getClientToken, getClientUser } from '@/lib/client-auth'
import './file-folder-phone.css'

export default function ClientSystemSwitchPage() {
  const router = useRouter()
  const [entry, setEntry] = useState<any>(null)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  if (loading) return <FileFolderEnvironmentLoader />

  if (entry && !entry.active) return <ClientFileFolderGate entry={entry} />

  if (error || !data?.verified || !data?.workshop) {
    return <main className="min-h-screen bg-transparent text-white p-4 flex items-center justify-center"><div className="w-full max-w-lg border-y border-cyan-200/10 bg-[#040a12]/92 p-8 text-center backdrop-blur-xl"><FolderOpen className="mx-auto h-10 w-10 text-sky-400" /><h1 className="mt-5 text-2xl font-semibold">File Folder</h1><p className="mt-3 text-sm leading-6 text-slate-400">{error || 'Your File Folder could not be opened.'}</p><Link href="/client/dashboard" className="mt-6 inline-flex rounded-full border border-white/10 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em]">Return to Portal</Link></div></main>
  }

  return (
    <main className="weave-file-folder-page min-h-dvh bg-transparent pt-16 text-white sm:pt-0" data-client-file-folder-entry="crossing-to-open-world" data-system-switch-gate="crossed" data-system-switch-flame-event="burning-river" data-weave-world="file-folder">
      <ClientFileFolderOperatingEnvironment data={data} />
      <details className="ff-page-actions">
        <summary aria-label="File Folder menu"><Menu aria-hidden="true" className="h-5 w-5"/></summary>
        <nav aria-label="File Folder actions">
          <p>File Folder</p>
          <Link href="/client/dashboard"><ArrowLeft className="h-4 w-4"/>Client World</Link>
          <Link href="/client/system-store" data-file-folder-publish-system="true"><PackageOpen className="h-4 w-4"/>Publish a system</Link>
          <Link href="/client/system-switch/flame-event" data-file-folder-flame-event="inside"><Flame className="h-4 w-4"/>Flame Event</Link>
          <button type="button" onClick={()=>window.dispatchEvent(new Event('weave:toggle-live-sound'))}><Volume2 className="h-4 w-4"/>Play / pause live sound</button>
        </nav>
      </details>
    </main>
  )
}
