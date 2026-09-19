'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Users, UserCircle, GitBranch, Briefcase } from 'lucide-react'

type TabId = 'prospects' | 'clients' | 'bridgers' | 'agents'

const POSITIONS = [
  { id: 'mandate', name: 'Mandate' },
  { id: 'lawyer', name: 'Legal' },
  { id: 'forensic', name: 'Forensic' },
  { id: 'admin', name: 'Admin' },
]

interface Thread {
  id: string
  name: string
  sub: string
  unread: number
  lastMessage: string
  lastAt: string
}

interface Msg {
  id: string
  content: string
  createdAt: string
  fromAdmin: boolean
}

export default function AdminHubPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isAgent = user?.role === 'agent'

  const [tab, setTab] = useState<TabId>('prospects')
  const [threads, setThreads] = useState<Thread[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [position, setPosition] = useState('mandate')
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'admin' && user.role !== 'agent'))) {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (isAgent) setTab('prospects')
    setSelected(null)
    setMessages([])
    loadList()
    const interval = setInterval(loadList, 6000)
    return () => clearInterval(interval)
  }, [tab, user?.id])

  useEffect(() => {
    if (!selected) return
    loadMessages()
    const interval = setInterval(loadMessages, 3000)
    return () => clearInterval(interval)
  }, [selected, position])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('ssb_auth_token')}`,
  })

  const loadList = async () => {
    if (!user) return
    setLoading(true)
    try {
      if (tab === 'prospects') {
        const url = isAgent ? '/api/agent/support-inbox' : '/api/admin/bridge-support'
        const res = await fetch(url, { headers: authHeaders() })
        const data = await res.json()
        if (data.success) {
          setThreads((data.threads || []).map((t: any) => ({
            id: `${t.sessionId}::${t.position}`,
            name: t.bridgeCode || 'Prospect',
            sub: t.position,
            unread: t.unreadCount,
            lastMessage: t.lastMessage,
            lastAt: t.lastMessageAt,
          })))
        }
      } else if (tab === 'clients') {
        const url = isAgent
          ? `/api/client/messages?agent=true&agentId=${user.id}`
          : '/api/client/messages?admin=true'
        const res = await fetch(url, { headers: authHeaders() })
        const data = await res.json()
        if (data.success) {
          setThreads((data.summary || []).map((s: any) => ({
            id: `${s.client_id}::${s.position}`,
            name: s.client_name,
            sub: s.position,
            unread: Number(s.unread_count) || 0,
            lastMessage: '',
            lastAt: s.last_message_at,
          })))
        }
      } else {
        const res = await fetch('/api/lounge/management-contacts', { headers: authHeaders() })
        const data = await res.json()
        if (data.success) {
          setContacts((data.contacts || []).filter((c: any) => c.role === (tab === 'bridgers' ? 'bridger' : 'agent')))
        }
      }
    } catch (e) {
      console.error('Failed to load list:', e)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async () => {
    if (!user) return
    try {
      if (tab === 'prospects') {
        const [sessionId, pos] = selected.id.split('::')
        const url = isAgent
          ? `/api/agent/support-inbox?sessionId=${sessionId}&position=${pos}`
          : `/api/admin/bridge-support?sessionId=${sessionId}&position=${pos}`
        const res = await fetch(url, { headers: authHeaders() })
        const data = await res.json()
        if (data.success) {
          setMessages(data.messages.map((m: any) => ({ id: m.id, content: m.content, createdAt: m.createdAt, fromAdmin: m.senderType === 'staff' })))
        }
      } else if (tab === 'clients') {
        const [clientId, pos] = selected.id.split('::')
        const url = isAgent
          ? `/api/client/messages?clientId=${clientId}&position=${pos}&agent=true&agentId=${user.id}`
          : `/api/client/messages?clientId=${clientId}&position=${pos}&admin=true`
        const res = await fetch(url, { headers: authHeaders() })
        const data = await res.json()
        if (data.success) {
          setMessages(data.messages.map((m: any) => ({ id: m.id, content: m.content, createdAt: m.created_at, fromAdmin: m.sender_type === 'admin' })))
        }
      } else {
        const roomId = [user.id, selected.id].sort().join('-')
        const res = await fetch(`/api/lounge/messages?roomType=private&roomId=${roomId}&userId=${user.id}`, { headers: authHeaders() })
        const data = await res.json()
        if (data.success) {
          setMessages([...data.messages].reverse().map((m: any) => ({ id: m.id, content: m.content, createdAt: m.timestamp, fromAdmin: m.userId === user.id })))
        }
      }
    } catch (e) {
      console.error('Failed to load messages:', e)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || !selected || sending || !user) return
    setSending(true)
    const content = input.trim()
    setInput('')
    try {
      if (tab === 'prospects') {
        const [sessionId, pos] = selected.id.split('::')
        const url = isAgent ? '/api/agent/support-inbox' : '/api/admin/bridge-support'
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ sessionId, position: pos, content }),
        })
      } else if (tab === 'clients') {
        const [clientId, pos] = selected.id.split('::')
        await fetch('/api/client/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId, clientName: selected.name, position: pos, content, senderType: 'admin',
            ...(isAgent ? { agentId: user.id } : {}),
          }),
        })
      } else {
        const roomId = [user.id, selected.id].sort().join('-')
        await fetch('/api/lounge/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: user.name, senderRole: user.role, content, userId: user.id,
            roomType: 'private', roomId, recipientId: selected.id, recipientName: selected.name,
          }),
        })
      }
      loadMessages()
    } catch (e) {
      console.error('Send failed:', e)
    } finally {
      setSending(false)
    }
  }

  if (!user || (user.role !== 'admin' && user.role !== 'agent')) return null

  const ALL_TABS: { id: TabId; label: string; icon: any }[] = [
    { id: 'prospects', label: 'Prospects', icon: Users },
    { id: 'clients', label: 'Clients', icon: UserCircle },
    { id: 'bridgers', label: 'Bridgers', icon: GitBranch },
    { id: 'agents', label: 'Agents', icon: Briefcase },
  ]
  const TABS = isAgent ? ALL_TABS.filter(t => t.id === 'prospects' || t.id === 'clients') : ALL_TABS

  const listItems = tab === 'bridgers' || tab === 'agents'
    ? contacts.map(c => ({ id: c.id, name: c.name, sub: c.role, unread: 0 }))
    : threads

  return (
    <div className="flex h-[calc(100vh-6rem)] bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
      <div className="w-72 border-r border-slate-800 flex flex-col">
        <div className="flex border-b border-slate-800">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-bold uppercase ${tab === t.id ? 'bg-slate-900 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center text-slate-500 text-sm py-8">Loading...</div>
          ) : listItems.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">Nothing here yet.</div>
          ) : (
            listItems.map((item: any) => (
              <button
                key={item.id}
                onClick={() => { setSelected(item); if (tab !== 'bridgers' && tab !== 'agents') setPosition(item.sub) }}
                className={`w-full text-left px-4 py-3 border-b border-slate-800/50 hover:bg-slate-900 ${selected?.id === item.id ? 'bg-slate-900' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm font-medium">{item.name}</span>
                  {item.unread > 0 && (
                    <span className="text-[10px] font-bold bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full">{item.unread}</span>
                  )}
                </div>
                <span className="text-xs text-slate-500 capitalize">{item.sub}</span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            Select a conversation
          </div>
        ) : (
          <>
            <div className="border-b border-slate-800 px-4 py-3 flex items-center justify-between">
              <div>
                <h2 className="text-white font-semibold">{selected.name}</h2>
                <p className="text-xs text-slate-500 capitalize">{selected.sub || tab}</p>
              </div>
              {tab === 'prospects' && !isAgent && (
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="bg-slate-800 border-0 rounded-md px-2 py-1 text-xs text-white"
                >
                  {POSITIONS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-slate-500 text-sm mt-8">No messages yet.</div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={`flex ${m.fromAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${m.fromAdmin ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-100'}`}>
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      <p className="text-[10px] mt-1 opacity-70">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-slate-800 px-4 py-3 flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type a message..."
                disabled={sending}
                className="flex-1 bg-slate-800 border-slate-700 text-white"
              />
              <Button onClick={handleSend} disabled={!input.trim() || sending} className="bg-cyan-600 hover:bg-cyan-700">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
