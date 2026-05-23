'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, ArrowLeft } from 'lucide-react'
import { getClientUser } from '@/lib/client-auth'

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

  const [client, setClient] = useState<ClientUser | null>(null)
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
    const clientData = getClientUser()
    
    if (!clientData) {
      router.push('/client/login')
      return
    }
    
    setClient(clientData)
    fetchMessages(clientData.id)
    
    // Poll for new messages every 3 seconds
    const interval = setInterval(() => {
      if (clientData) {
        fetchMessages(clientData.id, true)
      }
    }, 3000)
    
    return () => clearInterval(interval)
  }, [router, position])

  const fetchMessages = async (clientId: string, silent = false) => {
    if (!silent) setIsLoading(true)
    try {
      const response = await fetch(`/api/client/messages?clientId=${clientId}&position=${position}`)
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          clientName: client.name,
          position,
          content,
          senderType: 'client',
        }),
      })

      const data = await response.json()
      if (data.success && data.message) {
        setMessages(prev => [...prev, data.message])
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      setMessageInput(content) // Restore message on error
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mb-4"></div>
          <p className="text-slate-400">Loading chat...</p>
        </div>
      </div>
    )
  }

  if (!client) return null

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className={`bg-gradient-to-r ${posInfo.color} p-[1px]`}>
        <div className="bg-slate-900 px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/client/dashboard')}
              className="p-2 hover:bg-slate-800 rounded transition"
            >
              <ArrowLeft className="h-5 w-5 text-slate-400" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-white">{posInfo.icon} {posInfo.name}</h1>
              <p className="text-xs text-slate-400">Live chat support</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-xs text-green-400">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">{posInfo.icon}</div>
            <p className="text-slate-400">Start a conversation with {posInfo.name}</p>
            <p className="text-xs text-slate-500 mt-2">Your messages will be answered in real-time</p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${msg.sender_type === 'client' ? 'order-2' : 'order-1'}`}>
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    msg.sender_type === 'client'
                      ? 'bg-cyan-600 text-white rounded-br-md'
                      : 'bg-slate-800 text-slate-100 rounded-bl-md'
                  }`}
                >
                  {msg.sender_type === 'admin' && (
                    <p className="text-xs font-semibold mb-1 text-cyan-400">{posInfo.name}</p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
                <p className={`text-xs text-slate-500 mt-1 px-1 ${msg.sender_type === 'client' ? 'text-right' : 'text-left'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {msg.sender_type === 'client' && msg.is_read && <span className="ml-2 text-cyan-400">Read</span>}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-slate-800 bg-slate-900 p-4">
        <div className="flex gap-2">
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder={`Message ${posInfo.name}...`}
            className="bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-cyan-500"
            disabled={isSending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isSending || !messageInput.trim()}
            className={`bg-gradient-to-r ${posInfo.color} text-white border-0 hover:opacity-90`}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
