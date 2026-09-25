'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, ArrowLeft } from 'lucide-react'

interface Message {
  id: string
  client_id: string
  client_name: string
  position: string
  sender_type: 'client' | 'admin'
  content: string
  is_read: boolean
  created_at: string
}

const POSITION_INFO: Record<string, { name: string; icon: string }> = {
  mandate: { name: 'Mandate Officer', icon: '📋' },
  lawyer: { name: 'Legal Counsel', icon: '⚖️' },
  forensic: { name: 'Forensic Expert', icon: '🔍' },
  admin: { name: 'Administrator', icon: '👤' },
}

export default function AgentChatPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const params = useParams()
  const clientId = params.clientId as string
  const position = params.position as string
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [clientName, setClientName] = useState('Client')

  const posInfo = POSITION_INFO[position] || { name: 'Position', icon: '🔘' }

  useEffect(() => {
    if (!user || user.role !== 'agent') {
      router.push('/login')
      return
    }
    fetchMessages(true)
    const interval = setInterval(() => fetchMessages(false), 3000)
    return () => clearInterval(interval)
  }, [user, router, clientId, position])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchMessages = async (isInitial: boolean) => {
    if (isInitial) setIsLoading(true)
    try {
      const res = await fetch(`/api/client/messages?clientId=${clientId}&position=${encodeURIComponent(position)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      const data = await res.json()
      if (data.success) {
        setMessages(data.messages || [])
        if (data.messages?.length > 0) setClientName(data.messages[0].client_name || 'Client')
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    } finally {
      if (isInitial) setIsLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !user || isSending) return
    setIsSending(true)
    const content = messageInput.trim()
    setMessageInput('')
    try {
      const res = await fetch('/api/client/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          clientId,
          position,
          content,
        }),
      })
      const data = await res.json()
      if (data.success) setMessages(prev => [...prev, data.message])
    } catch (error) {
      console.error('Failed to send:', error)
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading conversation...</div>
      </div>
    )
  }

  if (!user || user.role !== 'agent') return null

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/client-interactions')} className="p-2 hover:bg-slate-800 rounded transition">
            <ArrowLeft className="h-5 w-5 text-slate-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">{posInfo.icon} {clientName}</h1>
            <p className="text-xs text-slate-400">Via {posInfo.name}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-2xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="text-center text-slate-500 text-sm mt-8">No messages yet.</div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs rounded-lg p-3 ${msg.sender_type === 'admin' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-100'}`}>
                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                <p className="text-xs mt-1 opacity-70">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-slate-800 bg-slate-900 p-4">
        <div className="max-w-2xl mx-auto flex gap-2">
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your response..."
            className="bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-cyan-500"
            disabled={isSending}
          />
          <Button onClick={handleSendMessage} disabled={isSending || !messageInput.trim()} className="bg-cyan-600 hover:bg-cyan-700 text-white border-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
