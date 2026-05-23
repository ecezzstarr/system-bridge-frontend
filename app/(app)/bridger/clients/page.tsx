'use client'

import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MessageCircle, Phone, Users, Send } from 'lucide-react'
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

export default function BridgerClientsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [message, setMessage] = useState('')

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

  const fetchClients = async () => {
    if (!user?.id) return
    try {
      const response = await fetch(`/api/bridger/clients?bridgerId=${user.id}`)
      const data = await response.json()
      setClients(data.clients || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendInAppMessage = async () => {
    if (!selectedClient || !message.trim()) return
    
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user?.id,
          recipientId: selectedClient.id,
          content: message,
          type: 'bridger_to_client'
        })
      })
      setMessage('')
      alert('Message sent successfully!')
    } catch (error) {
      console.error('Error sending message:', error)
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
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/bridger/dashboard">
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white">My Clients</h1>
              <p className="text-xs text-slate-500">Interact with your referred clients</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-cyan-400" />
            <span className="text-cyan-400 font-bold">{clients.length}</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        {clients.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">No Clients Yet</h2>
            <p className="text-slate-400 mb-6">Share your referral link to bring clients to the platform</p>
            <Link href="/bridger/dashboard">
              <Button className="bg-cyan-600 hover:bg-cyan-700">
                Get Referral Link
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Client List */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Your Clients</h2>
              {clients.map((client) => (
                <div 
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className={`p-4 rounded-xl border transition cursor-pointer ${
                    selectedClient?.id === client.id 
                      ? 'bg-cyan-500/10 border-cyan-500/50' 
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                      {client.name?.charAt(0) || 'C'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{client.name}</p>
                      <p className="text-xs text-slate-400 truncate">{client.business_name || client.email}</p>
                    </div>
                    <div className="flex gap-2">
                      {client.phone && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openWhatsAppWithNumber(client.phone, `Hi ${client.name}, this is your bridger from SSBNOW`)
                          }}
                          className="p-2 rounded-lg bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 transition"
                          title="WhatsApp Client"
                        >
                          <Phone className="w-4 h-4 text-green-400" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Client Details / Chat */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              {selectedClient ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 pb-4 border-b border-slate-800">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-2xl">
                      {selectedClient.name?.charAt(0) || 'C'}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{selectedClient.name}</h3>
                      <p className="text-sm text-slate-400">{selectedClient.business_name}</p>
                      <p className="text-xs text-slate-500">{selectedClient.email}</p>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 gap-3">
                    {selectedClient.phone && (
                      <button
                        onClick={() => openWhatsAppWithNumber(selectedClient.phone, `Hi ${selectedClient.name}, this is your bridger from SSBNOW`)}
                        className="flex items-center gap-2 p-3 rounded-lg bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 transition"
                      >
                        <Phone className="w-5 h-5 text-green-400" />
                        <span className="text-sm text-green-300">WhatsApp</span>
                      </button>
                    )}
                    <Link href={`/client/chat/bridger?clientId=${selectedClient.id}`}>
                      <button className="w-full flex items-center gap-2 p-3 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 transition">
                        <MessageCircle className="w-5 h-5 text-cyan-400" />
                        <span className="text-sm text-cyan-300">Platform Chat</span>
                      </button>
                    </Link>
                  </div>

                  {/* Quick Message */}
                  <div className="pt-4 border-t border-slate-800">
                    <h4 className="text-sm font-semibold text-slate-400 mb-3">Send Quick Message</h4>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                      <Button 
                        onClick={sendInAppMessage}
                        disabled={!message.trim()}
                        className="bg-cyan-600 hover:bg-cyan-700"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Client Info */}
                  <div className="pt-4 border-t border-slate-800 space-y-2">
                    <h4 className="text-sm font-semibold text-slate-400 mb-3">Client Information</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-slate-500">Phone:</span>
                      <span className="text-white">{selectedClient.phone || 'Not provided'}</span>
                      <span className="text-slate-500">Joined:</span>
                      <span className="text-white">{new Date(selectedClient.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageCircle className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Select a client to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
