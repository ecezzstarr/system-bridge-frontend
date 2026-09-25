'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-provider'
import { Card } from '@/components/ui/card'
import { MessageSquare, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface ClientChat {
  client_id: string
  client_name: string
  position: string
  unread_count?: number
  last_message_at?: string
}

const POSITION_LABEL: Record<string, string> = {
  mandate: 'Mandate Officer',
  lawyer: 'Legal Counsel',
  forensic: 'Forensic Expert',
  admin: 'Administrator',
}

export default function ClientInteractionsPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const [chats, setChats] = useState<ClientChat[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    if (user.role !== 'admin' && user.role !== 'agent') {
      router.push('/dashboard')
      return
    }
    fetchChats()
  }, [user, token])

  const fetchChats = async () => {
    if (!user) return
    try {
      const res = await fetch('/api/client/messages', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json()
      if (data.success) setChats(data.summary || [])
    } catch (error) {
      console.error('Failed to fetch client interactions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!user || (user.role !== 'admin' && user.role !== 'agent')) return null

  const linkBase = user.role === 'agent' ? '/agent-chat' : '/admin/client-messages'

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-cyan-400" />
          Client Interactions
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {user.role === 'agent' ? 'Conversations with your assigned clients.' : 'All client conversations across positions.'}
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-slate-500">Loading...</div>
      ) : chats.length === 0 ? (
        <div className="text-center py-20 text-slate-500">No conversations yet.</div>
      ) : (
        <div className="space-y-2">
          {chats.map((chat) => (
            <Link key={`${chat.client_id}-${chat.position}`} href={`${linkBase}/${chat.client_id}/${chat.position}`}>
              <Card className="p-4 bg-slate-900/60 border-slate-800 hover:border-slate-700 transition flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">{chat.client_name}</p>
                  <p className="text-xs text-slate-500">{POSITION_LABEL[chat.position] || chat.position}</p>
                </div>
                <div className="flex items-center gap-3">
                  {!!chat.unread_count && Number(chat.unread_count) > 0 && (
                    <span className="text-[10px] font-bold bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full">
                      {chat.unread_count} new
                    </span>
                  )}
                  <ArrowRight className="h-4 w-4 text-slate-500" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
