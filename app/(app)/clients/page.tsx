'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Clock3,
  MessageSquare,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { useClients } from '@/lib/hooks'
import { ClientBuildPull } from '@/components/world/client-build-pull'

const STATUS_TONE: Record<string, string> = {
  active: 'border-emerald-300/20 bg-emerald-400/[0.05] text-emerald-200',
  pending: 'border-amber-300/20 bg-amber-400/[0.05] text-amber-200',
  inactive: 'border-slate-300/10 bg-white/[0.025] text-slate-300',
}

export default function ClientPresenceRegistryPage() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const { data: clientsData, isLoading } = useClients({
    status: statusFilter === 'all' ? undefined : statusFilter,
  })

  const clients: any[] = (clientsData as any)?.data || []
  const filteredClients = useMemo(() => clients.filter((client) => {
    const name = String(client?.user?.displayName || client?.user?.name || '')
    const email = String(client?.user?.email || '')
    const q = search.toLowerCase()
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q)
  }), [clients, search])

  const stats = useMemo(() => ({
    total: clients.length,
    active: clients.filter(client => client.status === 'active').length,
    pending: clients.filter(client => client.status === 'pending').length,
    inactive: clients.filter(client => client.status === 'inactive').length,
  }), [clients])

  const continuityHref =
    user?.role === 'bridger' ? '/bridger/clients'
      : user?.role === 'agent' || user?.role === 'admin' ? '/client-interactions'
        : '/weave'

  const staffRole = user?.role === 'agent' || user?.role === 'bridger' || user?.role === 'admin'
    ? user.role
    : null

  return (
    <main className="mx-auto w-full max-w-6xl p-3 md:p-6">
      <section className="weave-system-depth overflow-hidden rounded-[2rem] border border-emerald-300/15 bg-[#030a15]/72">
        <header className="border-b border-white/10 bg-[radial-gradient(circle_at_14%_0%,rgba(16,185,129,.13),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(56,189,248,.08),transparent_28%)] p-5 md:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-emerald-300">Client Presence Registry</p>
              <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">A Client record is a relationship state, not a CRM row.</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                This registry shows Client relationship state returned by the WEAVE core service. Conversation, File Folder support and Client movement continue through their canonical operating surfaces.
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <StateCount label="Total" value={stats.total} tone="text-sky-300 border-sky-300/15 bg-sky-400/[0.04]"/>
              <StateCount label="Active" value={stats.active} tone="text-emerald-300 border-emerald-300/15 bg-emerald-400/[0.04]"/>
              <StateCount label="Pending" value={stats.pending} tone="text-amber-300 border-amber-300/15 bg-amber-400/[0.04]"/>
              <StateCount label="Inactive" value={stats.inactive} tone="text-slate-300 border-white/10 bg-white/[0.025]"/>
            </div>
          </div>
        </header>

        <div className="grid gap-4 p-4 md:p-6 lg:grid-cols-[1fr_320px]">
          <section className="weave-reading-surface rounded-3xl p-4 md:p-5">
            <div className="flex flex-col gap-3 border-b border-white/10 pb-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">Recorded relationships</p>
                <p className="mt-1 text-xs text-slate-400">Filter the registry without inventing actions the Client service has not authorized.</p>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"/>
                  <input
                    value={search}
                    onChange={event=>setSearch(event.target.value)}
                    placeholder="Search Client"
                    className="h-11 rounded-xl border border-white/10 bg-black/25 pl-9 pr-3 text-xs text-white outline-none focus:border-sky-300/30"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={event=>setStatusFilter(event.target.value)}
                  className="h-11 rounded-xl border border-white/10 bg-[#07101d] px-3 text-xs text-slate-200 outline-none"
                >
                  <option value="all">All states</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="py-20 text-center text-slate-400">Reading Client registry…</div>
            ) : filteredClients.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-8 text-center">
                <Users className="mx-auto h-8 w-8 text-slate-500"/>
                <p className="mt-3 text-sm font-black text-white">No Client relationship matches this view.</p>
                <p className="mt-2 text-xs text-slate-400">This registry does not create Clients. Client identity is established through the WEAVE File Number and Client path.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {filteredClients.map((client:any)=>{
                  const state = String(client.status || 'inactive')
                  const tone = STATUS_TONE[state] || STATUS_TONE.inactive
                  const name = client?.user?.displayName || client?.user?.name || 'Client'
                  const email = client?.user?.email || ''
                  const presence = client?.user?.presence || 'unknown'
                  const created = client.createdAt ? new Date(client.createdAt).toLocaleDateString() : 'Recorded'
                  return (
                    <div key={client.id} className={`rounded-2xl border p-4 ${tone}`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/25">
                            {state === 'active' ? <UserCheck className="h-5 w-5"/> : state === 'pending' ? <Clock3 className="h-5 w-5"/> : <UserX className="h-5 w-5"/>}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-white">{name}</p>
                            <p className="mt-1 truncate text-[10px] text-slate-400">{email}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-[0.08em]">
                          <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1">{state}</span>
                          <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1">Presence {presence}</span>
                          <span className="text-slate-400">{created}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-cyan-300/15 bg-cyan-400/[0.04] p-4">
              <div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-cyan-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300">Continue the relationship</p></div>
              <p className="mt-3 text-xs leading-5 text-slate-300">The registry observes state. Conversation and Client support continue in the role-appropriate continuity system.</p>
              <Link href={continuityHref} className="mt-4 inline-flex w-full items-center justify-between rounded-xl border border-cyan-300/15 bg-cyan-400/[0.06] px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100">Open continuity <ArrowRight className="h-3.5 w-3.5"/></Link>
            </section>

            <section className="rounded-3xl border border-violet-300/15 bg-violet-400/[0.04] p-4">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-violet-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-300">Truth rule</p></div>
              <p className="mt-3 text-xs leading-5 text-slate-300">No Add, Edit or Remove buttons appear here because this surface does not own those authorized transitions. A mature interface exposes only real system actions.</p>
            </section>

            {staffRole && <ClientBuildPull role={staffRole}/>}
          </aside>
        </div>
      </section>
    </main>
  )
}

function StateCount({ label, value, tone }: { label:string; value:number; tone:string }) {
  return (
    <div className={`rounded-xl border px-3 py-3 ${tone}`}>
      <p className="text-[8px] font-black uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  )
}
