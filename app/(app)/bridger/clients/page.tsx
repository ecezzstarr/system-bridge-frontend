'use client'

import { useAuth } from '@/lib/auth-provider'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useRef, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MessageCircle, Phone, Users, Send, CheckCheck } from 'lucide-react'
import Link from 'next/link'
import { openWhatsAppWithNumber } from '@/components/external-apps-nav'

interface Client {
  id: string
  name: string
  email: string
  phone: string
  business_name: string
  created_at: string
  last_activity?: string
}

interface Message {
  id: string
  client_id: string
  client_name: string
  position: string
  sender_type: 'client' | 'bridger' | 'agent' | 'admin' | 'bridge_ai'
  content: string
  is_read: boolean
  created_at: string
}

const POSITIONS = [
  { id: 'bridger', name: 'General Support', icon: '🌉' },
]

export default function BridgerClientsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div></div>}>
      <BridgerClientsContent />
    </Suspense>
  )
}

function BridgerClientsContent() {
  const { user, token, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialClientId = searchParams.get('clientId')
  const initialPosition = searchParams.get('position')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  
  // Chat state
  const [activePosition, setActivePosition] = useState(initialPosition || 'bridger')
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    if (user?.role !== 'bridger') {
      router.push('/dashboard')
      return
    }

    fetchClients()
  }, [user, authLoading, router])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fetch messages when client or position changes
  useEffect(() => {
    if (selectedClient) {
      fetchMessages(selectedClient.id, activePosition)
      
      // Poll for new messages every 4 seconds
      const interval = setInterval(() => {
        fetchMessages(selectedClient.id, activePosition, true)
      }, 4000)
      
      return () => clearInterval(interval)
    }
  }, [selectedClient, activePosition])

  const fetchClients = async () => {
    if (!user?.id) return
    try {
      const response = await fetch('/api/bridger/clients', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      const data = await response.json()
      setClients(data.clients || [])
      
      // Select client from query param if available
      if (initialClientId && data.clients?.length > 0) {
        const client = data.clients.find((c: any) => c.id === initialClientId)
        if (client) {
          setSelectedClient(client)
        }
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (clientId: string, position: string, silent = false) => {
    if (!silent) setChatLoading(true)
    try {
      const response = await fetch(`/api/client/messages?clientId=${clientId}&position=${encodeURIComponent(position)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      const data = await response.json()
      if (data.success) {
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    } finally {
      if (!silent) setChatLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedClient || isSending) return

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
          clientId: selectedClient.id,
          clientName: selectedClient.name,
          position: activePosition,
          content,
          senderType: 'bridger',
        }),
      })

      const data = await response.json()
      if (data.success && data.message) {
        setMessages(prev => [...prev, data.message])
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      setMessageInput(content) // Restore
    } finally {
      setIsSending(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <div className="bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <Link href="/bridger/dashboard">
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white">Client Service Portal</h1>
              <p className="text-xs text-slate-500">Continue the Client relationship after crossing</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700">
            <Users className="h-4 w-4 text-emerald-400" />
            <span className="text-emerald-400 font-bold text-sm">{clients.length}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden max-w-7xl mx-auto w-full">
        {/* Client Sidebar */}
        <div className="w-80 border-r border-slate-800 flex flex-col bg-slate-900/30 overflow-y-auto hidden md:flex">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Your Clients</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {clients.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <p>No clients yet</p>
              </div>
            ) : (
              clients.map((client) => (
                <div 
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className={`p-4 border-b border-slate-800/50 transition cursor-pointer flex items-center gap-3 ${
                    selectedClient?.id === client.id 
                      ? 'bg-emerald-500/10 border-l-4 border-l-emerald-500' 
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold shrink-0">
                    {client.name?.charAt(0) || 'C'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-white truncate">{client.name}</p>
                    <p className="text-xs text-slate-500 truncate">{client.business_name || client.email}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative">
          {selectedClient ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="md:hidden">
                       <Button variant="ghost" size="icon" onClick={() => setSelectedClient(null)} className="text-slate-400">
                         <ArrowLeft className="h-5 w-5" />
                       </Button>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold">
                      {selectedClient.name?.charAt(0) || 'C'}
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{selectedClient.name}</h3>
                      <p className="text-xs text-slate-500">{selectedClient.business_name}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {selectedClient.phone && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-green-600/10 border-green-500/30 text-green-400 hover:bg-green-600/20"
                        onClick={() => openWhatsAppWithNumber(selectedClient.phone, `Hi ${selectedClient.name}, this is your bridger from SSBNOW`)}
                      >
                        <Phone className="h-4 w-4 mr-2" /> WhatsApp
                      </Button>
                    )}
                  </div>
                </div>

                {/* Position Tabs */}
                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                  {POSITIONS.map((pos) => (
                    <button
                      key={pos.id}
                      onClick={() => setActivePosition(pos.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                        activePosition === pos.id
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {pos.icon} {pos.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Messages List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('/grid.svg')] bg-repeat">
                {chatLoading && messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-3xl">
                      {POSITIONS.find(p => p.id === activePosition)?.icon}
                    </div>
                    <p className="text-center">No messages yet for {POSITIONS.find(p => p.id === activePosition)?.name} context.</p>
                    <p className="text-xs max-w-xs text-center italic">Start the conversation by sending a message below.</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex ${msg.sender_type === 'bridger' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] ${msg.sender_type === 'bridger' ? 'order-2' : 'order-1'}`}>
                        <div
                          className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${
                            msg.sender_type === 'bridger'
                              ? 'bg-emerald-600 text-white rounded-br-none'
                              : 'bg-slate-800 text-slate-100 rounded-bl-none'
                          }`}
                        >
                          {msg.sender_type === 'client' && (
                            <p className="text-[10px] font-bold mb-1 text-emerald-400 uppercase tracking-tighter">Client</p>
                          )}
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <div className={`flex items-center gap-1 mt-1 px-1 text-[10px] text-slate-500 ${msg.sender_type === 'bridger' ? 'justify-end' : 'justify-start'}`}>
                          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {msg.sender_type === 'bridger' && (
                            <CheckCheck className={`h-3 w-3 ${msg.is_read ? 'text-emerald-400' : 'text-slate-600'}`} />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur shrink-0">
                <div className="flex gap-2 max-w-4xl mx-auto">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={`Reply as ${POSITIONS.find(p => p.id === activePosition)?.name}...`}
                    className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    disabled={isSending}
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || isSending}
                    className="bg-emerald-600 hover:bg-emerald-700 rounded-xl h-auto px-6"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[url('/grid.svg')] bg-repeat">
              <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-6">
                <MessageCircle className="h-10 w-10 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Select a Client</h3>
              <p className="text-slate-400 max-w-sm">Choose a client from the sidebar to view their message history and provide support across different service contexts.</p>
              
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg w-full md:hidden">
                {clients.map(client => (
                   <div 
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-3 cursor-pointer"
                   >
                     <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center font-bold">
                       {client.name.charAt(0)}
                     </div>
                     <div className="text-left">
                       <p className="font-bold text-sm">{client.name}</p>
                       <p className="text-xs text-slate-500">{client.email}</p>
                     </div>
                   </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
