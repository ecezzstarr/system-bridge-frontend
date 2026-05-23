'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, ArrowLeft } from 'lucide-react'

interface ChatMessage {
  id: string
  sender: 'client' | 'agent'
  sender_name: string
  content: string
  timestamp: string
  read: boolean
}

const POSITION_INFO: Record<string, { name: string; icon: string }> = {
  mandate: { name: 'Mandate', icon: '📋' },
  lawyer: { name: 'Lawyer', icon: '⚖️' },
  forensic: { name: 'Forensic', icon: '🔍' },
  admin: { name: 'Admin', icon: '👤' },
}

export default function AgentChatPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const clientId = params.clientId as string
  const position = params.position as string

  const [messages, setMessages] = useState<ChatMessage[]>([])
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

    // Mock: Load messages for this client
    const mockMessages: ChatMessage[] = [
      {
        id: '1',
        sender: 'client',
        sender_name: 'John Doe',
        content: 'Hello, I need assistance with my legal matter.',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        read: true,
      },
      {
        id: '2',
        sender: 'agent',
        sender_name: user.name,
        content: 'Hello John, I am your assigned legal counsel. I would be happy to help. Could you provide more details about your case?',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        read: true,
      },
      {
        id: '3',
        sender: 'client',
        sender_name: 'John Doe',
        content: 'It\'s regarding a contract dispute with a vendor. We need your expert opinion.',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        read: false,
      },
    ]

    setMessages(mockMessages)
    setClientName('John Doe')
    setIsLoading(false)
  }, [user, router])

  const handleSendMessage = () => {
    if (!messageInput.trim() || !user) return

    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'agent',
      sender_name: user.name,
      content: messageInput,
      timestamp: new Date().toISOString(),
      read: true,
    }

    setMessages([...messages, newMessage])
    setMessageInput('')
    setIsSending(true)

    // Simulate client response after a delay
    setTimeout(() => {
      const clientResponse: ChatMessage = {
        id: `msg_${Date.now()}_client`,
        sender: 'client',
        sender_name: clientName,
        content: 'Thank you for your response. I\'ll review your recommendations.',
        timestamp: new Date().toISOString(),
        read: false,
      }
      setMessages(prev => [...prev, clientResponse])
      setIsSending(false)
    }, 3000)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mb-4"></div>
          <p className="text-slate-400">Loading conversation...</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== 'agent') return null

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/client-interactions')}
            className="p-2 hover:bg-slate-800 rounded transition"
          >
            <ArrowLeft className="h-5 w-5 text-slate-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">{posInfo.icon} {clientName}</h1>
            <p className="text-xs text-slate-400">Via {posInfo.name}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-2xl mx-auto w-full">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs ${msg.sender === 'agent' ? 'order-2' : 'order-1'}`}>
              <div
                className={`rounded-lg p-3 ${
                  msg.sender === 'agent'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-800 text-slate-100'
                }`}
              >
                <p className="text-xs font-semibold mb-1 opacity-75">{msg.sender_name}</p>
                <p className="text-sm">{msg.content}</p>
              </div>
              <p className="text-xs text-slate-500 mt-1 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {isSending && (
          <div className="flex gap-3 justify-start">
            <div className="flex gap-2 items-center bg-slate-800 rounded-lg p-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t border-slate-800 bg-slate-900 p-4">
        <div className="max-w-2xl mx-auto flex gap-2">
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your response..."
            className="bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-cyan-500"
            disabled={isSending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isSending || !messageInput.trim()}
            className="bg-cyan-600 hover:bg-cyan-700 text-white border-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
