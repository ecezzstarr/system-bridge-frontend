'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FolderOpen, ShieldCheck } from 'lucide-react'
import ClientFileFolderGate from '@/components/system-switch/client-file-folder-gate'
import ClientFileFolderOperatingEnvironment from '@/components/system-switch/client-file-folder-operating-environment'
import { FileFolderEnvironmentLoader } from '@/components/system-switch/file-folder-environment-loader'
import { getClientToken, getClientUser } from '@/lib/client-auth'
import { WEAVE_ARCHITECTURE } from '@/lib/weave-architecture'

export default function ClientSystemSwitchPage() {
  const router = useRouter()
  const [entry, setEntry] = useState<any>(null)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const localClient = getClientUser()
    const token = getClientToken()
    if (!localClient || !token) {
      router.replace('/client/login')
      return
    }

    const headers = { Authorization: `Bearer ${token}` }

    const load = async () => {
      try {
        const entryResponse = await fetch('/api/client/file-folder-entry', { headers, cache: 'no-store' })
        const entryBody = await entryResponse.json()
        if (!entryResponse.ok) throw new Error(entryBody.error || 'Unable to resolve File Folder entry')

        setEntry(entryBody)

        if (!entryBody.active) return

        const response = await fetch('/api/client/system-switch', { headers, cache: 'no-store' })
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
        setError(err instanceof Error ? err.message : 'Unable to open System Switch')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [router])

  if (loading) return <FileFolderEnvironmentLoader />

  if (entry && !entry.active) return <ClientFileFolderGate entry={entry} />

  if (error || !data?.verified || !data?.workshop) {
    return <main className="min-h-screen bg-transparent text-white p-4 flex items-center justify-center"><div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950 p-8 text-center"><FolderOpen className="mx-auto h-10 w-10 text-sky-400" /><h1 className="mt-5 text-2xl font-semibold">File Folder</h1><p className="mt-3 text-sm leading-6 text-slate-400">{error || 'Your File Folder could not be opened.'}</p><Link href="/client/dashboard" className="mt-6 inline-flex rounded-full border border-white/10 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em]">Return to Portal</Link></div></main>
  }

  return (
    <main className="min-h-screen bg-transparent p-3 md:p-6 text-white">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-4 rounded-3xl border border-white/10 bg-[#030a15]/78 px-5 py-4 backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
