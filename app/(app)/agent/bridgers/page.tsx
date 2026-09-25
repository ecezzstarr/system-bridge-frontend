'use client'

import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'
import { getAuthHeaders } from '@/lib/auth-client'

export default function AgentBridgersPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user || user.role !== 'agent') {
      router.push('/dashboard')
    }
  }, [user, router])

  if (!user || user.role !== 'agent') {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 sm:pb-0">
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 mb-1">
          Institutional Development
        </h1>
        <p className="text-slate-400 text-sm">Support and manage the human relationship carriers (Bridgers) assigned to your team.</p>
      </div>
      <MyBridgers />
    </div>
  )
}

function MyBridgers() {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [statsById, setStatsById] = useState<Record<string, { clientCount: number; depositsByCurrency: Record<string, number> }>>({})
  const [statsLoading, setStatsLoading] = useState<string | null>(null)
  const { user } = useAuth()
  const [bridgers, setBridgers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBridgers = async () => {
      if (!user?.id) return
      try {
        const response = await fetch('/api/agent/bridgers', { headers: getAuthHeaders() })
        const data = await response.json()
        setBridgers(data.bridgers || [])
      } catch (error) {
        console.error('Error fetching bridgers:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchBridgers()
  }, [user?.id])

  return (
    <div className="group relative">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition duration-500"></div>
      <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-cyan-400" />
            <div>
              <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">Human Carrying Structure</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Bridgers assigned to your development context</p>
            </div>
          </div>
          {bridgers.length < 3 && (
            <Button
              className="bg-cyan-600 hover:bg-cyan-700"
              onClick={() => router.push('/company-chat/mandate?draft=' + encodeURIComponent('Requesting a new bridger assignment to my team.'))}
            >
              + Add Bridger
            </Button>
          )}
        </div>

        {loading ? (
          <p className="text-slate-400 text-center py-8">Loading bridgers...</p>
        ) : bridgers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">No bridgers assigned yet</p>
            <p className="text-sm text-slate-500">Add bridgers to build your team</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bridgers.map((bridger) => (
              <div key={bridger.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xl font-bold">
                    {bridger.name?.charAt(0) || 'B'}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{bridger.name}</h3>
                    <p className="text-xs text-slate-400">{bridger.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center mb-3">
                  <div className="bg-slate-900/50 rounded p-2">
                    <p className="text-xs text-slate-500">Clients</p>
                    <p className="text-lg font-bold text-cyan-400">
                      {statsById[bridger.id]?.clientCount ?? '—'}
                    </p>
                  </div>
                  <div className="bg-slate-900/50 rounded p-2">
                    <p className="text-xs text-slate-500">Deposit volume</p>
                    <p className="text-sm font-bold text-emerald-400">
                      {statsById[bridger.id]
                        ? Object.entries(statsById[bridger.id].depositsByCurrency).length > 0
                          ? Object.entries(statsById[bridger.id].depositsByCurrency)
                              .map(([cur, amt]) => `${amt.toLocaleString()} ${cur}`)
                              .join(', ')
                          : '0'
                        : '—'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-slate-600 text-sm"
                  onClick={async () => {
                    if (expandedId === bridger.id) {
                      setExpandedId(null)
                      return
                    }
                    setExpandedId(bridger.id)
                    if (!statsById[bridger.id]) {
                      setStatsLoading(bridger.id)
                      try {
                        const res = await fetch(`/api/agent/bridger-stats?bridgerId=${bridger.id}`)
                        const data = await res.json()
                        if (data.success) {
                          setStatsById(prev => ({ ...prev, [bridger.id]: { clientCount: data.clientCount, depositsByCurrency: data.depositsByCurrency } }))
                        }
                      } catch (e) {
                        console.error('Failed to fetch bridger stats:', e)
                      } finally {
                        setStatsLoading(null)
                      }
                    }
                  }}
                >
                  {statsLoading === bridger.id ? 'Loading...' : expandedId === bridger.id ? 'Hide Details' : 'View Details'}
                </Button>
                {expandedId === bridger.id && statsById[bridger.id] && (
                  <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-400 space-y-1">
                    <p>Assigned clients: <span className="text-white">{statsById[bridger.id].clientCount}</span></p>
                    <p>Deposit volume is raw client activity, not a commission figure.</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
