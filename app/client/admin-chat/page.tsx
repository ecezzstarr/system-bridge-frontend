'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, ArrowLeft, Users } from 'lucide-react'

interface ClientUser {
  id: string
  name: string
  business_name: string
  email: string
}

interface ChatSession {
  client_id: string
  client_name: string
  position: string
  lastMessage: string
  timestamp: string
}

const POSITIONS = [
  { id: 'mandate', name: 'Mandate Officer', icon: '📋' },
  { id: 'lawyer', name: 'Legal Counsel', icon: '⚖️' },
  { id: 'forensic', name: 'Forensic Expert', icon: '🔍' },
  { id: 'admin', name: 'Administrator', icon: '👤' },
]

export default function AdminChatPage() {
  const router = useRouter()
  const [admin, setAdmin] = useState<ClientUser | null>(null)
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const adminData = localStorage.getItem('client_user')
    
    if (!adminData) {
      router.push('/client/login')
      return
    }

    const parsedAdmin = JSON.parse(adminData)
    if (parsedAdmin.role !== 'admin') {
      router.push('/client/dashboard')
      return
    }

    setAdmin(parsedAdmin)

    // Mock chat sessions across all positions
    const mockSessions: ChatSession[] = [
      {
        client_id: 'client_1',
        client_name: 'Acme Corporation',
        position: 'mandate',
        lastMessage: 'We need assistance with mandate requirements',
        timestamp: new Date(Date.now() - 300000).toISOString(),
      },
      {
        client_id: 'client_2',
        client_name: 'Tech Industries',
        position: 'lawyer',
        lastMessage: 'Legal review needed for contracts',
        timestamp: new Date(Date.now() - 600000).toISOString(),
      },
      {
        client_id: 'client_3',
        client_name: 'Finance Solutions',
        position: 'forensic',
        lastMessage: 'Forensic analysis report requested',
        timestamp: new Date(Date.now() - 1200000).toISOString(),
      },
    ]
    setChatSessions(mockSessions)
    setIsLoading(false)
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    )
  }

  if (!selectedChat) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex">
        {/* Sidebar */}
        <div className="w-64 bg-slate-900/80 border-r border-slate-800 p-6 flex flex-col sticky top-0 h-screen">
          <Link href="/client/dashboard">
            <button className="text-sm text-slate-400 hover:text-white mb-6 flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>
          </Link>

          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Admin Control Panel</h2>

          <div className="flex-1 space-y-3 overflow-y-auto">
            <h3 className="text-xs font-semibold text-slate-500 uppercase mt-6 mb-3">Active Conversations</h3>
            {chatSessions.map((session) => (
              <button
                key={`${session.client_id}_${session.position}`}
                onClick={() => setSelectedChat(`${session.client_id}_${session.position}`)}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-800/50 transition group"
              >
                <p className="text-xs font-semibold text-slate-300 group-hover:text-white">{session.client_name}</p>
                <p className="text-xs text-slate-500 mt-1">{POSITIONS.find(p => p.id === session.position)?.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col">
          <div className="border-b border-slate-800 px-8 py-6 bg-slate-900/40 backdrop-blur">
            <h1 className="text-2xl font-bold text-white">Client Conversations</h1>
            <p className="text-sm text-slate-400 mt-1">Manage all client interactions across positions</p>
          </div>

          <div className="flex-1 p-8 flex items-center justify-center">
            <div className="text-center">
              <Users className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400">Select a conversation to manage</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const [clientId, position] = selectedChat.split('_')
  const session = chatSessions.find(s => s.client_id === clientId && s.position === position)
  const posInfo = POSITIONS.find(p => p.id === position)

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900/80 border-r border-slate-800 p-6 flex flex-col sticky top-0 h-screen">
        <Link href="/client/dashboard">
          <button className="text-sm text-slate-400 hover:text-white mb-6 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </Link>

        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Active Conversations</h2>

        <div className="flex-1 space-y-3 overflow-y-auto">
          {chatSessions.map((sess) => (
            <button
              key={`${sess.client_id}_${sess.position}`}
              onClick={() => setSelectedChat(`${sess.client_id}_${sess.position}`)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition ${
                selectedChat === `${sess.client_id}_${sess.position}`
                  ? 'bg-slate-700 border border-slate-600'
                  : 'hover:bg-slate-800/50'
              }`}
            >
              <p className="text-xs font-semibold text-slate-300">{sess.client_name}</p>
              <p className="text-xs text-slate-500 mt-1">{POSITIONS.find(p => p.id === sess.position)?.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-slate-800 px-8 py-6 bg-slate-900/40 backdrop-blur flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{session?.client_name}</h1>
            <p className="text-sm text-slate-400 mt-1">{posInfo?.name} • ID: {clientId}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-8 overflow-y-auto space-y-4">
          <div className="flex justify-start">
            <div className="max-w-md bg-slate-800 rounded-lg p-4">
              <p className="text-xs font-semibold text-slate-300 mb-1">{posInfo?.name}</p>
              <p className="text-sm text-slate-200">{session?.lastMessage}</p>
              <p className="text-xs text-slate-500 mt-2">{new Date(session?.timestamp || '').toLocaleTimeString()}</p>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-slate-800 p-6">
          <div className="flex gap-3">
            <Input
              placeholder="Type response as admin..."
              className="bg-slate-800/50 border-slate-700 text-white"
            />
            <Button className="bg-cyan-600 hover:bg-cyan-700">
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2">Note: Client sees position name, not your identity</p>
        </div>
      </div>
    </div>
  )
}
