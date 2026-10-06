'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Loader2, RefreshCw, Share2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ParticipantSummary = {
  activeProfiles: number
  connectedAccounts: number
  pendingConnections: number
  scheduledContent: number
  publishedDeliveries: number
  socialReach: number
  socialClicks: number
  socialFollows: number
}

type RoleRow = { role: string; profiles: number; content: number; scheduled: number }
type PendingConnection = {
  user_id: string
  name: string | null
  username: string | null
  role: string
  channel_key: string
  account_label: string | null
  updated_at: string
}

type OversightState = {
  participantSummary?: ParticipantSummary
  participantRoles?: RoleRow[]
  pendingConnections?: PendingConnection[]
}

function compact(value: number) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) || 0)
}

export function DistributionParticipantOversight() {
  const [state, setState] = useState<OversightState | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const headers = (): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ssb_auth_token') : null
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const load = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/distribution-studio', { headers: headers(), cache: 'no-store' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success) throw new Error(data.error || 'Participant movement could not load')
      setState(data)
    } catch (error: any) {
      setMessage(error.message || 'Participant movement could not load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const summary = state?.participantSummary
  return (
    <section className="mx-auto mb-6 max-w-7xl space-y-5 border-y border-fuchsia-300/15 bg-black/20 p-5 sm:border sm:p-6" data-distribution-participant-oversight="true">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><Users className="h-4 w-4 text-fuchsia-300" /><p className="text-[9px] font-black uppercase tracking-[0.24em] text-fuchsia-300">PARTICIPANT SOCIAL PRESENCE</p></div>
          <h2 className="mt-2 text-2xl font-black text-white">AGENT · BRIDGER · CLIENT</h2>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">Each participant owns a separate Social Presence workspace and separate social account connections. Administration sees movement and connection state without sharing their social credentials.</p>
        </div>
        <div className="flex gap-2"><Button asChild variant="outline" className="border-white/15 text-white"><Link href="/distribution-studio"><Share2 className="mr-2 h-4 w-4" />MY PRESENCE</Link></Button><Button variant="outline" onClick={() => void load()} disabled={loading} className="border-white/15 text-white"><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />REFRESH</Button></div>
      </div>

      {message && <div className="border border-red-300/20 bg-red-300/[0.04] px-4 py-3 text-xs text-red-100">{message}</div>}
      {loading && !state ? <Loader2 className="h-5 w-5 animate-spin text-slate-500" /> : <>
        <div className="grid grid-cols-2 border-y border-white/10 sm:grid-cols-4 lg:grid-cols-8">
          <Metric label="Presences" value={summary?.activeProfiles || 0} />
          <Metric label="Accounts" value={summary?.connectedAccounts || 0} bordered />
          <Metric label="Pending" value={summary?.pendingConnections || 0} bordered />
          <Metric label="Scheduled" value={summary?.scheduledContent || 0} bordered />
          <Metric label="Published" value={summary?.publishedDeliveries || 0} bordered />
          <Metric label="Reach" value={summary?.socialReach || 0} bordered />
          <Metric label="Clicks" value={summary?.socialClicks || 0} bordered />
          <Metric label="Follows" value={summary?.socialFollows || 0} />
        </div>

        <div className="grid gap-5 lg:grid-cols-[.75fr_1.25fr]">
          <div className="border border-white/10 bg-[#07101a]/45 p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">POSITION MOVEMENT</p>
            <div className="mt-3 space-y-2">{(state?.participantRoles || []).length === 0 ? <p className="text-xs text-slate-600">No participant Social Presence has opened yet.</p> : (state?.participantRoles || []).map(row => <div key={row.role} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-white/5 py-3"><strong className="text-xs uppercase text-white">{row.role}</strong><span className="text-[10px] text-slate-500">{row.profiles} presence</span><span className="text-[10px] text-cyan-200">{row.scheduled} scheduled</span></div>)}</div>
          </div>

          <div className="border border-white/10 bg-[#07101a]/45 p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">CONNECTION REQUESTS</p>
            <div className="mt-3 space-y-2">{(state?.pendingConnections || []).length === 0 ? <p className="text-xs text-slate-600">No external social account is waiting for provider authorization.</p> : (state?.pendingConnections || []).map(connection => <div key={`${connection.user_id}:${connection.channel_key}`} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 py-3"><div><p className="text-xs font-black text-white">{connection.name || connection.username || 'Participant'}</p><p className="mt-1 text-[8px] font-black uppercase tracking-widest text-slate-600">{connection.role} · {connection.channel_key}</p></div><div className="text-right"><p className="text-xs text-yellow-200">{connection.account_label || 'Account'}</p><p className="mt-1 text-[8px] text-slate-600">provider authorization required</p></div></div>)}</div>
          </div>
        </div>
      </>}
    </section>
  )
}

function Metric({ label, value, bordered = false }: { label: string; value: number; bordered?: boolean }) {
  return <div className={`px-2 py-4 text-center ${bordered ? 'border-x border-white/10' : ''}`}><p className="text-lg font-black text-white">{compact(value)}</p><p className="mt-1 text-[7px] font-black uppercase tracking-widest text-slate-600">{label}</p></div>
}
