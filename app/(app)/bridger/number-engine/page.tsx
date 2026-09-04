'use client'

import { useAuth } from '@/lib/auth-provider'
import { useEffect, useState } from 'react'
import { MessageCircle, Smartphone, Send, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'

interface WeaveNumber {
  id: string
  phone_number: string
  country_code: string
  provider: string
  status: string
  whatsapp_status: string
  sms_status: string
  created_at: string
}

interface Conversation {
  id: string
  prospect_phone: string
  channel: 'whatsapp' | 'sms'
  last_message_at: string
  last_body?: string
}

interface Message {
  id: string
  direction: 'inbound' | 'outbound'
  channel: 'whatsapp' | 'sms'
  body: string
  created_at: string
}

export default function BridgerNumberEnginePage() {
  const { user } = useAuth()
  const [number, setNumber] = useState<WeaveNumber | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [body, setBody] = useState('')
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp')
  const [loading, setLoading] = useState(true)
  const [provisioning, setProvisioning] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    if (!user?.id) return
    setLoading(true)
    setError('')
    try {
      const r = await fetch(`/api/number-engine?bridgerId=${encodeURIComponent(user.id)}`)
      const data = await r.json()
      if (!r.ok || !data.success) throw new Error(data.error || 'Unable to load number')
      setNumber(data.number)
      if (data.number) {
        const c = await fetch(`/api/number-engine/messages?bridgerId=${encodeURIComponent(user.id)}&numberId=${encodeURIComponent(data.number.id)}`)
        const cd = await c.json()
        if (!c.ok || !cd.success) throw new Error(cd.error || 'Unable to load conversations')
        setConversations(cd.conversations || [])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load number')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user?.id])

  const provision = async () => {
    if (!user?.id) return
    setProvisioning(true)
    setError('')
    try {
      const r = await fetch('/api/number-engine', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bridgerId: user.id, countryCode: 'NG' }),
      })
      const data = await r.json()
      if (!r.ok || !data.success) throw new Error(data.error || 'Number provisioning failed')
      setNumber(data.number)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Number provisioning failed')
    } finally { setProvisioning(false) }
  }

  const openConversation = async (conversation: Conversation) => {
    setSelected(conversation)
    if (!user?.id) return
    const r = await fetch(`/api/number-engine/messages?bridgerId=${encodeURIComponent(user.id)}&conversationId=${encodeURIComponent(conversation.id)}`)
    const data = await r.json()
    if (r.ok && data.success) setMessages(data.messages || [])
  }

  const send = async () => {
    if (!user?.id || !number || !selected || !body.trim()) return
    setSending(true); setError('')
    try {
      const r = await fetch('/api/number-engine/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bridgerId: user.id, numberId: number.id, to: selected.prospect_phone, channel, body }),
      })
      const data = await r.json()
      if (!r.ok || !data.success) throw new Error(data.error || 'Message failed')
      setBody('')
      await openConversation(selected)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Message failed')
    } finally { setSending(false) }
  }

  if (!user || user.role !== 'bridger') return null

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-emerald-400 text-sm font-semibold tracking-wide">WEAVE COMMUNICATIONS</p>
            <h1 className="text-3xl md:text-4xl font-bold mt-1">Number Engine</h1>
            <p className="text-slate-400 mt-2">One persistent number for your continuing prospect work.</p>
          </div>
          <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-900">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        {error && <div className="mb-5 rounded-lg border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-300 flex gap-2"><AlertCircle className="h-4 w-4 mt-0.5" />{error}</div>}

        {!number && !loading && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 md:p-8 mb-6">
            <Smartphone className="h-9 w-9 text-emerald-400 mb-4" />
            <h2 className="text-xl font-semibold">Your persistent number</h2>
            <p className="text-slate-400 mt-2 max-w-2xl">Provision your Weave number once. It is assigned to you rather than to an individual prospect, so new marketplace prospects can continue to be contacted from the same identity.</p>
            <button onClick={provision} disabled={provisioning} className="mt-6 rounded-lg bg-emerald-600 px-5 py-3 font-semibold hover:bg-emerald-500 disabled:opacity-50">
              {provisioning ? 'Provisioning…' : 'Get my Weave number'}
            </button>
          </section>
        )}

        {number && (
          <>
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 md:p-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">Your Weave Number</p>
                  <p className="text-3xl font-bold mt-1 tracking-tight">{number.phone_number}</p>
                  <p className="text-xs text-slate-500 mt-2">Persistent identity · {number.provider}</p>
                </div>
                <div className="flex gap-3">
                  <Status label="WhatsApp" active={number.whatsapp_status === 'active'} />
                  <Status label="SMS" active={number.sms_status === 'active'} />
                </div>
              </div>
            </section>

            <section className="grid lg:grid-cols-[330px_1fr] gap-5 min-h-[560px]">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden">
                <div className="p-4 border-b border-slate-800">
                  <p className="font-semibold">Prospect conversations</p>
                  <p className="text-xs text-slate-500 mt-1">Purchased prospects stay connected to this number.</p>
                </div>
                <div className="divide-y divide-slate-800 max-h-[500px] overflow-y-auto">
                  {conversations.length === 0 && <p className="p-5 text-sm text-slate-500">No conversations yet.</p>}
                  {conversations.map(c => (
                    <button key={c.id} onClick={() => openConversation(c)} className={`w-full text-left p-4 hover:bg-slate-800/60 ${selected?.id === c.id ? 'bg-slate-800' : ''}`}>
                      <div className="flex items-center justify-between gap-2"><span className="font-medium">{c.prospect_phone}</span><span className="text-[10px] uppercase text-slate-500">{c.channel}</span></div>
                      <p className="text-xs text-slate-500 mt-1 truncate">{c.last_body || 'No message text'}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 flex flex-col overflow-hidden">
                {!selected ? (
                  <div className="flex-1 flex items-center justify-center text-slate-500"><div className="text-center"><MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-40" /><p>Select a prospect conversation.</p></div></div>
                ) : (
                  <>
                    <div className="p-4 border-b border-slate-800"><p className="font-semibold">{selected.prospect_phone}</p><p className="text-xs text-slate-500">Communicating from {number.phone_number}</p></div>
                    <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                      {messages.map(m => <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${m.direction === 'outbound' ? 'bg-emerald-700' : 'bg-slate-800'}`}><p>{m.body}</p><p className="text-[10px] opacity-60 mt-1">{m.channel}</p></div></div>)}
                    </div>
                    <div className="p-4 border-t border-slate-800">
                      <div className="flex gap-2 mb-2">
                        <button onClick={() => setChannel('whatsapp')} className={`px-3 py-1.5 rounded-md text-xs ${channel === 'whatsapp' ? 'bg-emerald-700' : 'bg-slate-800 text-slate-400'}`}>WhatsApp</button>
                        <button onClick={() => setChannel('sms')} className={`px-3 py-1.5 rounded-md text-xs ${channel === 'sms' ? 'bg-emerald-700' : 'bg-slate-800 text-slate-400'}`}>SMS</button>
                      </div>
                      <div className="flex gap-2"><textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write to this prospect…" rows={2} className="flex-1 resize-none rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm outline-none focus:border-emerald-600" /><button onClick={send} disabled={sending || !body.trim()} className="self-stretch rounded-lg bg-emerald-600 px-4 hover:bg-emerald-500 disabled:opacity-40"><Send className="h-5 w-5" /></button></div>
                    </div>
                  </>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}

function Status({ label, active }: { label: string; active: boolean }) {
  return <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs"><span className={`h-2 w-2 rounded-full ${active ? 'bg-emerald-400' : 'bg-amber-400'}`} /><span>{label}</span>{active ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <span className="text-slate-500">pending</span>}</div>
}
