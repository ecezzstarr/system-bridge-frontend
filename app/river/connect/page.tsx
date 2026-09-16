'use client'

import { useEffect, useMemo, useState } from 'react'

interface Message { role: 'user' | 'assistant'; content: string }

export default function RiverConnectPage() {
  const token = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search).get('token') || '', [])
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'I am River, the voice to a system-making platform. You are outside the Weave right now. Tell me what you are trying to understand or what you wish existed.' },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function send() {
    const content = input.trim()
    if (!content || !token || busy) return
    const next = [...messages, { role: 'user' as const, content }]
    setMessages(next)
    setInput('')
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/river/external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, messages: next }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'River is unavailable.')
      setMessages([...next, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'River is unavailable.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 24, minHeight: '100vh' }}>
      <header style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.65 }}>River</div>
        <h1 style={{ margin: '6px 0' }}>System voice</h1>
        <p style={{ opacity: 0.75 }}>A conversation with River before you enter the Weave.</p>
      </header>

      <section aria-label="River conversation" style={{ display: 'grid', gap: 12, marginBottom: 18 }}>
        {messages.map((message, index) => (
          <div key={`${index}-${message.role}`} style={{ padding: 14, borderRadius: 12, border: '1px solid rgba(127,127,127,.25)' }}>
            <strong>{message.role === 'assistant' ? 'River' : 'You'}</strong>
            <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{message.content}</div>
          </div>
        ))}
      </section>

      {error && <p role="alert">{error}</p>}

      <form onSubmit={(event) => { event.preventDefault(); void send() }} style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Tell River what you are trying to understand..."
          disabled={!token || busy}
          style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid rgba(127,127,127,.4)' }}
        />
        <button type="submit" disabled={!token || busy || !input.trim()} style={{ padding: '12px 16px', borderRadius: 10 }}>
          {busy ? 'Listening...' : 'Speak'}
        </button>
      </form>

      {!token && <p style={{ marginTop: 16 }}>This River invitation is missing. Ask the person who shared it for a valid invitation.</p>}
    </main>
  )
}
