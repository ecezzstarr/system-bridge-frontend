'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FolderOpen, ShieldCheck } from 'lucide-react'
import SystemSwitchWorld from '@/components/system-switch/system-switch-world'
import { getClientToken, getClientUser } from '@/lib/client-auth'

interface ClientSystemContext {
  id: string
  name: string
  email: string
  business_name: string
  file_number: string | null
}

export default function ClientSystemSwitchPage() {
  const router = useRouter()
  const [client, setClient] = useState<ClientSystemContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const localClient = getClientUser()
    const token = getClientToken()

    if (!localClient || !token) {
      router.replace('/client/login')
      return
    }

    fetch('/api/client/system-switch', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to load File Folder')
        return data
      })
      .then((data) => {
        if (!data.verified) {
          setError('Your File Folder is awaiting company verification.')
          return
        }
        setClient(data.client)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load System Switch'))
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return <main className="min-h-screen bg-black text-white flex items-center justify-center"><p className="text-sm text-slate-400">Opening your File Folder...</p></main>
  }

  if (error || !client) {
    return (
      <main className="min-h-screen bg-black text-white p-4 flex items-center justify-center">
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950 p-8 text-center">
          <FolderOpen className="mx-auto h-10 w-10 text-sky-400" />
          <h1 className="mt-5 text-2xl font-semibold">File Folder</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">{error}</p>
          <Link href="/client/dashboard" className="mt-6 inline-flex rounded-full border border-white/10 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em]">Return to Portal</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black p-3 md:p-6 text-white">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-4 rounded-3xl border border-white/10 bg-slate-950/90 px-5 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-3"><FolderOpen className="h-6 w-6 text-sky-300" /></div>
              <div>
                <p className="text-[9px] uppercase tracking-[0.3em] text-slate-500">Client File Folder</p>
                <h1 className="mt-1 text-lg font-semibold">{client.name}</h1>
                <p className="text-xs text-slate-500">{client.business_name || client.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-right">
                <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">File Number</p>
                <p className="font-mono text-xs text-slate-200">{client.file_number}</p>
              </div>
              <div className="hidden sm:flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-[10px] uppercase tracking-[0.15em] text-emerald-300">
                <ShieldCheck className="h-4 w-4" /> Verified
              </div>
            </div>
          </div>
        </div>

        <SystemSwitchWorld fileNumber={client.file_number} />

        <div className="mt-4">
          <Link href="/client/dashboard" className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs text-slate-400 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> Portal
          </Link>
        </div>
      </div>
    </main>
  )
}
