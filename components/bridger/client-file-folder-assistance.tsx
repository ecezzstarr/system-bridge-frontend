'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bot, MessageSquare, Send } from 'lucide-react'

type ClientSummary = { client_id: string; client_name: string }
type SharedMessage = {
  id: string
  sender_type: 'client' | 'bridger' | 'bridge_ai'
  content: string
  created_at: string
}

function authHeaders(): HeadersInit {
  return { Authorization: 'Bearer ' + (localStorage.getItem('ssb_auth_token') || '') }
}

/** Assigned Bridgers can assist Clients, never operate or spend from their File Folders. */
export function ClientFileFolderAssistance() {
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [messages, setMessages] = useState<SharedMessage[]>([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true
    const run = async () => {
      try {
        const res = await fetch('/api/client/messages', { headers: authHeaders(), cache: 'no-store' })
        const body = await res.json()
        if (!res.ok) throw new Error(body.error || 'Unable to load assigned Clients')
        if (!live) return
        const list: ClientSummary[] = (body.summary || []).map((row: any) => ({
          client_id: String(row.client_id),
          client_name: String(row.client_name || 'Client'),
        }))
        setClients(list)
        setSelectedId(current => current || list[0]?.client_id || '')
      } catch (cause) {
        if (live) setError(cause instanceof Error ? cause.message : 'Unable to load assigned Clients')
      } finally {
        if (live) setLoading(false)
      }
    }
    void run()
    return () => { live = false }
  }, [])

  const loadMessages = useCallback(async (clientId: string) => {
    if (!clientId) return
    try {
      const url = '/api/client/messages?clientId=' + encodeURIComponent(clientId) + '&position=bridge_ai'
      const res = await fetch(url, { headers: authHeaders(), cache: 'no-store' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Unable to load assistance')
      setMessages((body.messages || []).filter((row: SharedMessage) =>
        row.sender_type === 'client' || row.sender_type === 'bridger' || row.sender_type === 'bridge_ai'
      ))
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load assistance')
    }
  }, [])

  useEffect(() => {
    setMessages([])
    if (!selectedId) return
    void loadMessages(selectedId)
    const interval = window.setInterval(() => {
      if (!document.hidden) void loadMessages(selectedId)
    }, 15000)
    return () => window.clearInterval(interval)
  }, [selectedId, loadMessages])

  const send = async () => {
    const content = text.trim()
    if (!selectedId || !content || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/client/messages', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedId, position: 'bridge_ai', content }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Unable to send assistance')
      setText('')
      await loadMessages(selectedId)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to send assistance')
    } finally {
      setSending(false)
    }
  }

  const selected = clients.find(client => client.client_id === selectedId)
  return (
    <section className="border-t border-sky-300/15 bg-sky-950/10 px-5 py-6 md:px-7" data-bridge-ai-station="client-file-folder-assistance">
      <div className="flex items-start gap-3">
        <Bot className="mt-1 h-5 w-5 text-sky-300" />
        <div>
          <h2 className="text-lg font-bold text-white">Client File Folder Assistance</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
            Support your assigned Clients in one conversation with Bridge AI. The Client directs and owns every build; your messages provide human guidance and do not change a build or charge their wallet.
          </p>
        </div>
      </div>
      {loading ? <p className="mt-4 text-sm text-slate-400">Loading assigned Clients…</p> : clients.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">Clients assigned to you will appear here when they enter Weave.</p>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-[minmax(150px,230px)_minmax(0,1fr)]">
          <nav aria-label="Assigned Clients" className="flex gap-2 overflow-x-auto md:flex-col">
            {clients.map(client => (
              <button type="button" key={client.client_id} onClick={() => setSelectedId(client.client_id)}
                className={'rounded-xl border px-3 py-3 text-left text-xs font-semibold ' + (selectedId === client.client_id ? 'border-sky-300/50 bg-sky-400/10 text-white' : 'border-white/10 text-slate-300')}>
                {client.client_name}
              </button>
            ))}
          </nav>
          <div className="min-w-0 rounded-2xl border border-white/10 bg-black/25 p-3">
            <p className="mb-3 flex items-center gap-2 text-xs font-bold text-sky-200">
              <MessageSquare className="h-4 w-4" />
              {selected?.client_name || 'Client'} · Bridger · Bridge AI
            </p>
            <div className="max-h-72 min-h-40 space-y-2 overflow-y-auto" aria-live="polite">
              {messages.length === 0 && <p className="text-xs text-slate-400">No assistance messages yet. Begin with practical guidance on their File Folder.</p>}
              {messages.map(message => (
                <div key={message.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs">
                  <p className="mb-1 font-bold text-sky-300">{message.sender_type === 'bridge_ai' ? 'Bridge AI' : message.sender_type === 'bridger' ? 'You / Bridger' : selected?.client_name || 'Client'}</p>
                  <p className="whitespace-pre-wrap leading-5 text-slate-200">{message.content}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-end gap-2">
              <textarea value={text} onChange={event => setText(event.target.value)} rows={2}
                placeholder="Guide this Client in their File Folder…" aria-label="Message to Client File Folder"
                className="min-w-0 flex-1 resize-none rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-sky-300" />
              <button type="button" onClick={() => void send()} disabled={sending || !text.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-300 text-slate-950 disabled:opacity-40" aria-label="Send assistance">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
    </section>
  )
}
