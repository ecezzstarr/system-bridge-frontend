'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, ArrowLeft, MessageCircle, Users, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'
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
  { id: 'mandate', name: 'Mandate Officer', icon: '📋', color: 'bg-blue-500' },
  { id: 'lawyer', name: 'Legal Counsel', icon: '⚖️', color: 'bg-purple-500' },
  { id: 'forensic', name: 'Forensic Expert', icon: '🔍', color: 'bg-orange-500' },
  { id: 'admin', name: 'Administrator', icon: '👤', color: 'bg-green-500' },
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

  // Check auth
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/admin/dashboard')
    }
  }, [user, authLoading, router])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fetch chat summaries
  useEffect(() => {
    fetchSummaries()
    const interval = setInterval(fetchSummaries, 5000)
    return () => clearInterval(interval)
  }, [])

  // Fetch messages when chat selected
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
        // Mark client messages as read
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
          <p className="text-slate-400">Loading messages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="p-2 hover:bg-slate-800 rounded transition"
          >
            <ArrowLeft className="h-5 w-5 text-slate-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-cyan-400" />
              Client Messages
            </h1>
            <p className="text-xs text-slate-400">
              {totalUnread > 0 ? `${totalUnread} unread message${totalUnread > 1 ? 's' : ''}` : 'All caught up'}
            </p>
          </div>
          <button
            onClick={fetchSummaries}
            className="p-2 hover:bg-slate-800 rounded transition"
          >
            <RefreshCw className="h-5 w-5 text-slate-400" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Chat List */}
        <div className={`${selectedChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r border-slate-800 bg-slate-900/50`}>
          <div className="p-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Users className="h-4 w-4" />
              <span>{chatSummaries.length} conversation{chatSummaries.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {chatSummaries.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle className="h-12 w-12 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No client messages yet</p>
              </div>
            ) : (
              chatSummaries.map((chat) => {
                const posInfo = getPositionInfo(chat.position)
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
                    className={`w-full p-4 text-left border-b border-slate-800 hover:bg-slate-800/50 transition ${
                      isSelected ? 'bg-slate-800' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full ${posInfo.color} flex items-center justify-center text-lg`}>
                        {posInfo.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-white text-sm truncate">{chat.client_name}</p>
                          {unread > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-cyan-500 text-white text-xs rounded-full">
                              {unread}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-cyan-400">{posInfo.name}</p>
                        <p className="text-xs text-slate-500 mt-1">
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

        {/* Chat View */}
        <div className={`${selectedChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="bg-slate-900 border-b border-slate-800 px-4 py-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedChat(null)}
                    className="md:hidden p-2 hover:bg-slate-800 rounded transition"
                  >
                    <ArrowLeft className="h-5 w-5 text-slate-400" />
                  </button>
                  <div className="flex-1">
                    <p className="font-semibold text-white">{selectedChat.clientName}</p>
                    <p className="text-xs text-cyan-400">{getPositionInfo(selectedChat.position).name}</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
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
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <p className={`text-xs text-slate-500 mt-1 px-1 ${msg.sender_type === 'admin' ? 'text-right' : 'text-left'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Input */}
              <div className="border-t border-slate-800 bg-slate-900 p-4">
                {/* Position Selector */}
                <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                  <span className="text-xs text-slate-400 whitespace-nowrap self-center">Reply as:</span>
                  {POSITIONS.map(pos => (
                    <button
                      key={pos.id}
                      onClick={() => setReplyAsPosition(pos.id)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition ${
                        replyAsPosition === pos.id
                          ? `${pos.color} text-white`
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      <span>{pos.icon}</span>
                      <span>{pos.name}</span>
                    </button>
                  ))}
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
                    className="bg-cyan-600 hover:bg-cyan-700 text-white border-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500">Select a conversation</p>
                <p className="text-xs text-slate-600 mt-1">Choose a client to view and reply to their messages</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
