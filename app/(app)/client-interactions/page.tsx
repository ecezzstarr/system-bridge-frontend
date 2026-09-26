'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-provider'
import { ArrowRight, Clock3, MessageSquare, ShieldCheck, Users } from 'lucide-react'
import Link from 'next/link'
import { ClientBuildPull } from '@/components/world/client-build-pull'

interface ClientChat {
  client_id: string
  client_name: string
  position: string
  unread_count?: number
  last_message_at?: string
}

const POSITION_LABEL: Record<string, string> = {
  mandate: 'Mandate',
  lawyer: 'Attorney',
  forensic: 'Forensics',
  admin: 'Administration',
  bridger: 'Bridger',
}

const POSITION_TONE: Record<string, string> = {
  mandate: 'border-sky-300/20 bg-sky-400/[0.04] text-sky-200',
  lawyer: 'border-violet-300/20 bg-violet-400/[0.04] text-violet-200',
  forensic: 'border-emerald-300/20 bg-emerald-400/[0.04] text-emerald-200',
  admin: 'border-amber-300/20 bg-amber-400/[0.04] text-amber-200',
  bridger: 'border-cyan-300/20 bg-cyan-400/[0.04] text-cyan-200',
}

export default function ClientInteractionsPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const [chats, setChats] = useState<ClientChat[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    if (user.role !== 'admin' && user.role !== 'agent') {
      router.push('/dashboard')
      return
    }
    void fetchChats()
  }, [user, token])

  const fetchChats = async () => {
    if (!user) return
    try {
      const res = await fetch('/api/client/messages', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json()
      if (data.success) setChats(data.summary || [])
    } catch (error) {
      console.error('Failed to fetch client interactions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const unread = useMemo(() => chats.reduce((sum, chat) => sum + Number(chat.unread_count || 0), 0), [chats])
  const clients = useMemo(() => new Set(chats.map(chat => chat.client_id)).size, [chats])
  const positions = useMemo(() => new Set(chats.map(chat => chat.position)).size, [chats])

  if (!user || (user.role !== 'admin' && user.role !== 'agent')) return null

  const linkBase = user.role === 'agent' ? '/agent-chat' : '/admin/client-messages'

  return (
    <main className="mx-auto w-full max-w-6xl p-3 md:p-6">
      <section className="weave-system-depth overflow-hidden rounded-[2rem] border border-cyan-300/15 bg-[#030a15]/72">
        <header className="border-b border-white/10 bg-[radial-gradient(circle_at_14%_0%,rgba(34,211,238,.13),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(139,92,246,.07),transparent_30%)] p-5 md:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-cyan-300">Client Service Queue</p>
              <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">Conversation is part of the Client process.</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                A message is not isolated chat. It belongs to a Client, a company position, a recorded relationship and a next movement.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-cyan-300/15 bg-cyan-400/[0.05] px-4 py-3"><p className="text-[8px] font-black uppercase tracking-wider text-cyan-300">Clients</p><p className="mt-1 text-2xl font-black text-white">{clients}</p></div>
              <div className="rounded-xl border border-violet-300/15 bg-violet-400/[0.05] px-4 py-3"><p className="text-[8px] font-black uppercase tracking-wider text-violet-300">Positions</p><p className="mt-1 text-2xl font-black text-white">{positions}</p></div>
              <div className="rounded-xl border border-amber-300/15 bg-amber-400/[0.05] px-4 py-3"><p className="text-[8px] font-black uppercase tracking-wider text-amber-300">Unread</p><p className="mt-1 text-2xl font-black text-white">{unread}</p></div>
            </div>
          </div>
        </header>

        <div className="grid gap-4 p-4 md:p-6 lg:grid-cols-[1fr_320px]">
          <section className="weave-reading-surface rounded-3xl p-4 md:p-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">Active service movement</p>
                <h2 className="mt-1 text-lg font-black text-white">Open the Client at the position where movement is waiting.</h2>
              </div>
              <MessageSquare className="h-5 w-5 text-sky-300"/>
            </div>

            {isLoading ? (
              <div className="py-20 text-center text-slate-400">Reading Client movement…</div>
            ) : chats.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-8 text-center">
                <ShieldCheck className="mx-auto h-7 w-7 text-slate-500"/>
                <p className="mt-3 text-sm font-black text-white">No Client service movement is waiting.</p>
                <p className="mt-2 text-xs text-slate-400">New Client conversations will appear here with the position responsible for the next response.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {chats.map((chat) => {
                  const tone = POSITION_TONE[chat.position] || 'border-white/10 bg-white/[0.025] text-slate-200'
                  return (
                    <Link
                      key={`${chat.client_id}-${chat.position}`}
                      href={user.role === 'agent'
                        ? `${linkBase}/${chat.client_id}/${chat.position}`
                        : `${linkBase}?clientId=${encodeURIComponent(chat.client_id)}&position=${encodeURIComponent(chat.position)}`}
                      className={`flex flex-col gap-3 rounded-2xl border p-4 transition hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between ${tone}`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/25"><Users className="h-4 w-4"/></div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white">{chat.client_name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.09em]">
                            <span>{POSITION_LABEL[chat.position] || chat.position}</span>
                            {chat.last_message_at && <span className="inline-flex items-center gap-1 text-slate-400"><Clock3 className="h-3 w-3"/>{new Date(chat.last_message_at).toLocaleString()}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {Number(chat.unread_count || 0) > 0 && <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2.5 py-1 text-[9px] font-black text-amber-200">{chat.unread_count} waiting</span>}
                        <ArrowRight className="h-4 w-4"/>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-emerald-300/15 bg-emerald-400/[0.04] p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">Service chain</p>
              <div className="mt-3 space-y-2 text-xs font-semibold text-slate-300">
                <p>Connection → clarity.</p>
                <p>Clarity → action.</p>
                <p>Action → execution.</p>
                <p>Execution → confirmation.</p>
                <p>Confirmation → Administration when needed.</p>
              </div>
            </section>
            {user.role === 'agent' && <ClientBuildPull role="agent" />}
          </aside>
        </div>
      </section>
    </main>
  )
}
