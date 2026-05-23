'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MessageSquare, ArrowRight, LogOut } from 'lucide-react'
import Link from 'next/link'

interface ClientChat {
  client_id: string
  client_name: string
  position: string
  last_message?: string
  last_message_time?: string
}

export default function ClientInteractionsPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [clientChats, setClientChats] = useState<ClientChat[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    // Admin-only access to client interactions (background company operation)
    if (user.role !== 'admin') {
      router.push('/dashboard')
      return
    }

    // Load all clients for admin to manage (background operation)
    const mockChats: ClientChat[] = [
      {
        client_id: 'client_1',
        client_name: 'Acme Corp',
        position: 'Mandate',
        last_message: 'Thank you for your assistance on this matter.',
        last_message_time: new Date(Date.now() - 1800000).toISOString(),
      },
      {
        client_id: 'client_2',
        client_name: 'Tech Solutions Ltd',
        position: 'Lawyer',
        last_message: 'We will proceed with your recommendation.',
        last_message_time: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        client_id: 'client_3',
        client_name: 'Global Industries',
        position: 'Forensic',
        last_message: 'Please provide the analysis report.',
        last_message_time: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        client_id: 'client_4',
        client_name: 'Nexus Ventures',
        position: 'Admin',
        last_message: 'Need assistance with account setup.',
        last_message_time: new Date(Date.now() - 10800000).toISOString(),
      },
    ]
    setClientChats(mockChats)
    setIsLoading(false)
  }, [user, router])

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') return null

  const positionEmoji: Record<string, string> = {
    Mandate: '📋',
    Lawyer: '⚖️',
    Forensic: '🔍',
    Admin: '👤',
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-slate-950 border-b border-slate-800 px-4 py-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Client Interactions</h1>
              <p className="text-sm text-slate-400">Position: {user.position}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-slate-800 rounded-lg transition"
              title="Sign Out"
            >
              <LogOut className="h-5 w-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Client Chats */}
        <div className="px-4 pb-20 space-y-3 pt-4">
          {clientChats.length > 0 ? (
            clientChats.map(chat => (
              <Link key={chat.client_id} href={`/agent/chat/${chat.client_id}/${chat.position}`}>
                <button className="w-full text-left">
                  <Card className="bg-slate-900/60 border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900/80 transition p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="text-2xl flex-shrink-0">{positionEmoji[user.position || 'Mandate']}</div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white text-lg mb-1">{chat.client_name}</h3>
                          <p className="text-sm text-slate-400 line-clamp-2">{chat.last_message || 'No messages yet'}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {chat.last_message_time ? new Date(chat.last_message_time).toLocaleString() : 'New conversation'}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-500 flex-shrink-0 mt-2" />
                    </div>
                  </Card>
                </button>
              </Link>
            ))
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No client interactions yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
