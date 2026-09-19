'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, ArrowLeft, MessageCircle, Users, RefreshCw, ClipboardList, Scale, Search, UserCog } from 'lucide-react'
import { EcosystemNav } from '@/components/ecosystem-nav'

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

interface ChatSummary {
  client_id: string
  client_name: string
  position: string
  total_messages: number
  unread_count: number
  last_message_at: string
}

const POSITIONS = [
  { id: 'registration', name: 'Registration', icon: UserCog, accent: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30', solid: 'bg-cyan-500' },
  { id: 'mandate', name: 'Mandate Officer', icon: ClipboardList, accent: 'bg-blue-500/15 text-blue-400 border-blue-500/30', solid: 'bg-blue-500' },
  { id: 'lawyer', name: 'Legal Counsel', icon: Scale, accent: 'bg-purple-500/15 text-purple-400 border-purple-500/30', solid: 'bg-purple-500' },
  { id: 'forensic', name: 'Forensic Expert', icon: Search, accent: 'bg-orange-500/15 text-orange-400 border-orange-500/30', solid: 'bg-orange-500' },
  { id: 'admin', name: 'Administrator', icon: UserCog, accent: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', solid: 'bg-emerald-500' },
]

export default function AdminClientMessagesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [chatSummaries, setChatSummaries] = useState<ChatSummary[]>([])
  const [selectedChat, setSelectedChat] = useState<{ clientId: string; position: string; clientName: string } | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [replyAsPosition, setReplyAsPosition] = useState<string>('mandate')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/admin/dashboard')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    fetchSummaries()
    const interval = setInterval(fetchSummaries, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selectedChat) {
      fetchMessages()
      setReplyAsPosition(selectedChat.position)
      const interval = setInterval(fetchMessages, 3000)
      return () => clearInterval(interval)
    }
  }, [selectedChat])

  const fetchSummaries = async () => {
    try {
      const response = await fetch('/api/client/messages?admin=true')
      const data = await response.json()
      if (data.success) {
        setChatSummaries(data.summary || [])
      }
    } catch (error) {
      console.error('Failed to fetch summaries:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMessages = async () => {
    if (!selectedChat) return
    try {
      const response = await fetch(`/api/client/messages?admin=true&clientId=${selectedChat.clientId}&position=${selectedChat.position}`)
      const data = await response.json()
      if (data.success) {
        setMessages(data.messages || [])
        await fetch('/api/client/messages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: selectedChat.clientId,
            position: selectedChat.position,
            senderType: 'client',
          }),
        })
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChat || isSending) return

    setIsSending(true)
    const content = messageInput.trim()
    setMessageInput('')

    try {
      const response = await fetch('/api/client/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedChat.clientId,
          clientName: selectedChat.clientName,
          position: replyAsPosition,
          content,
          senderType: 'admin',
        }),
      })

      const data = await response.json()
      if (data.success && data.message) {
        setMessages(prev => [...prev, data.message])
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      setMessageInput(content)
    } finally {
      setIsSending(false)
    }
  }

  const getPositionInfo = (positionId: string) => {
    return POSITIONS.find(p => p.id === positionId) || POSITIONS[0]
  }

  const totalUnread = chatSummaries.reduce((sum, chat) => sum + (parseInt(String(chat.unread_count)) || 0), 0)

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mb-4"></div>
          <p className="text-slate-400 text-sm">Loading conversations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <div className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="p-2 hover:bg-slate-800 rounded-xl transition"
          >
            <ArrowLeft className="h-5 w-5 text-slate-400" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-cyan-400" />
              Client Messages
            </h1>
            <p className="text-xs text-slate-500">
              {totalUnread > 0 ? `${totalUnread} unread message${totalUnread > 1 ? 's' : ''}` : 'All caught up'}
            </p>
          </div>
          <button
            onClick={fetchSummaries}
            className="p-2 hover:bg-slate-800 rounded-xl transition"
            title="Refresh conversations"
          >
            <RefreshCw className="h-5 w-5 text-slate-400" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className={`${selectedChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r border-slate-800 bg-slate-900/30`}>
          <div className="p-3 border-b border-slate-800 flex items-center gap-2 text-xs text-slate-500">
            <Users className="h-4 w-4" />
            <span>{chatSummaries.length} conversation{chatSummaries.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {chatSummaries.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle className="h-12 w-12 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400 text-sm font-medium">No conversations yet</p>
                <p className="text-slate-600 text-xs mt-1">Client messages will appear here as they come in.</p>
              </div>
            ) : (
              chatSummaries.map((chat) => {
                const posInfo = getPositionInfo(chat.position)
                const PosIcon = posInfo.icon
                const isSelected = selectedChat?.clientId === chat.client_id && selectedChat?.position === chat.position
                const unread = parseInt(String(chat.unread_count)) || 0

                return (
                  <button
                    key={`${chat.client_id}-${chat.position}`}
                    onClick={() => setSelectedChat({
                      clientId: chat.client_id,
                      position: chat.position,
                      clientName: chat.client_name
                    })}
                    className={`w-full p-4 text-left border-b border-slate-800/60 hover:bg-slate-800/40 transition ${
                      isSelected ? 'bg-slate-800/70' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${posInfo.accent}`}>
                        <PosIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-white text-sm truncate">{chat.client_name}</p>
                          {unread > 0 && (
                            <span className="flex-shrink-0 px-2 py-0.5 bg-cyan-500 text-white text-[10px] font-bold rounded-full">
                              {unread}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{posInfo.name}</p>
                        <p className="text-[10px] text-slate-600 mt-1">
                          {new Date(chat.last_message_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div className={`${selectedChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
          {selectedChat ? (
            <>
              <div className="bg-slate-900/50 border-b border-slate-800 px-4 py-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedChat(null)}
                    className="md:hidden p-2 hover:bg-slate-800 rounded-xl transition"
                  >
                    <ArrowLeft className="h-5 w-5 text-slate-400" />
                  </button>
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${getPositionInfo(selectedChat.position).accent}`}>
                    {(() => { const Icon = getPositionInfo(selectedChat.position).icon; return <Icon className="h-4 w-4" /> })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{selectedChat.clientName}</p>
                    <p className="text-xs text-slate-400">{getPositionInfo(selectedChat.position).name}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(msg => {
                  const posInfo = getPositionInfo(msg.position)
                  return (
                    <div key={msg.id} className={`flex gap-3 ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] ${msg.sender_type === 'admin' ? 'order-2' : 'order-1'}`}>
                        <div
                          className={`rounded-2xl px-4 py-3 ${
                            msg.sender_type === 'admin'
                              ? 'bg-cyan-600 text-white rounded-br-md'
                              : 'bg-slate-800 text-slate-100 rounded-bl-md'
                          }`}
                        >
                          {msg.sender_type === 'admin' && (
                            <p className="text-xs font-semibold mb-1 opacity-75">You as {posInfo.name}</p>
                          )}
                          {msg.sender_type === 'client' && (
                            <p className="text-xs font-semibold mb-1 text-cyan-400">{msg.client_name}</p>
                          )}
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        </div>
                        <p className={`text-[10px] text-slate-600 mt-1 px-1 ${msg.sender_type === 'admin' ? 'text-right' : 'text-left'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-slate-800 bg-slate-900/50 p-4">
                <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                  <span className="text-xs text-slate-500 whitespace-nowrap self-center">Reply as</span>
                  {POSITIONS.map(pos => {
                    const Icon = pos.icon
                    return (
                      <button
                        key={pos.id}
                        onClick={() => setReplyAsPosition(pos.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition border ${
                          replyAsPosition === pos.id
                            ? `${pos.solid} text-white border-transparent`
                            : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{pos.name}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="flex gap-2">
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder={`Reply as ${getPositionInfo(replyAsPosition).name}...`}
                    className="bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-cyan-500"
                    disabled={isSending}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={isSending || !messageInput.trim()}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white border-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-xs px-6">
                <MessageCircle className="h-16 w-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-300 font-medium">Select a conversation</p>
                <p className="text-slate-600 text-sm mt-1">Choose a client from the list to view and reply to their messages.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
