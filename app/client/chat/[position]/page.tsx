'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'

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

interface ClientUser {
  id: string
  name: string
  business_name: string
}

const POSITION_INFO: Record<string, { name: string; color: string; icon: string }> = {
  mandate: { name: 'Mandate Officer', color: 'from-blue-500 to-cyan-500', icon: '📋' },
  lawyer: { name: 'Legal Counsel', color: 'from-purple-500 to-pink-500', icon: '⚖️' },
  forensic: { name: 'Forensic Expert', color: 'from-orange-500 to-red-500', icon: '🔍' },
  admin: { name: 'Administrator', color: 'from-green-500 to-emerald-500', icon: '👤' },
}

export default function ClientChatPage() {
  const router = useRouter()
  const params = useParams()
  const position = params.position as string
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { user: client, token } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)

  const posInfo = POSITION_INFO[position] || { name: 'Service', color: 'from-slate-500 to-slate-600', icon: '🔘' }

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load client and messages
  useEffect(() => {
    if (!client) {
      router.push('/client/login')
      return
    }

    fetchMessages(client.id)

    // Poll for new messages every 3 seconds
    const interval = setInterval(() => {
      fetchMessages(client.id, true)
    }, 3000)

    return () => clearInterval(interval)
  }, [router, position, client?.id])

  const fetchMessages = async (clientId: string, silent = false) => {
    if (!silent) setIsLoading(true)
    try {
      const response = await fetch(`/api/client/messages?position=${encodeURIComponent(position)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      const data = await response.json()
      if (data.success) {
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !client || isSending) return
    setIsSending(true)
    const content = messageInput.trim()
    setMessageInput('')
    try {
      const response = await fetch('/api/client/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          position,
          content,
        })
      })
      const data = await response.json()
      if (data.success) {
        setMessages(prev => [...prev, data.message || data])
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading conversation...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className={`bg-gradient-to-r ${posInfo.color} px-4 py-4 flex items-center gap-3 shadow-lg`}>
        <button
          onClick={() => router.back()}
          className="text-white/90 hover:text-white transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{posInfo.icon}</span>
          <div>
            <h1 className="text-white font-semibold text-lg leading-tight">{posInfo.name}</h1>
            <p className="text-white/80 text-xs">Live conversation</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-slate-500 text-sm mt-8">
            No messages yet. Start the conversation below.
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  msg.sender_type === 'client'
                    ? `bg-gradient-to-r ${posInfo.color} text-white`
                    : 'bg-slate-800 text-slate-100 border border-slate-700'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${msg.sender_type === 'client' ? 'text-white/70' : 'text-slate-500'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-slate-800 bg-slate-900 px-4 py-3 flex items-center gap-2">
        <Input
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={isSending}
          className="flex-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
        />
        <Button
          onClick={handleSendMessage}
          disabled={!messageInput.trim() || isSending}
          className={`bg-gradient-to-r ${posInfo.color} text-white hover:opacity-90`}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
