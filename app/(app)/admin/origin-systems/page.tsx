'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface SystemInfo {
  id: string
  name: string
  createdAt: number
  deploymentType: string
  domain?: string
  wallet?: string
  status: string
}

export default function OriginSystemsPanel() {
  const { user } = useAuth()
  const router = useRouter()
  const [systems, setSystems] = useState<SystemInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login')
      return
    }

    fetchSystems()
  }, [user, router])

  const fetchSystems = async () => {
    try {
      const response = await fetch('/api/origin/systems')
      const data = await response.json()
      setSystems(data.systems || [])
    } catch (error) {
      console.error('[v0] Error fetching systems:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user || user.role !== 'admin') return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Origin Systems Network</h1>
        <p className="text-slate-400 mt-2">All systems connected to SSBNOW.SHOP origin authority</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-slate-900/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-cyan-400">{systems.length}</div>
            <p className="text-slate-400 text-sm mt-2">Total Systems</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-green-400">{systems.filter(s => s.status === 'active').length}</div>
            <p className="text-slate-400 text-sm mt-2">Active Systems</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-yellow-400">{systems.filter(s => s.status === 'paused').length}</div>
            <p className="text-slate-400 text-sm mt-2">Paused Systems</p>
          </CardContent>
        </Card>
      </div>

      {/* Systems List */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader>
          <CardTitle>Connected Systems</CardTitle>
          <CardDescription>All systems linked to origin ledger</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-400">Loading systems...</p>
          ) : systems.length === 0 ? (
            <p className="text-slate-400">No systems registered yet</p>
          ) : (
            <div className="space-y-3">
              {systems.map((system) => (
                <div key={system.id} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{system.name}</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        ID: {system.id.slice(0, 20)}...
                      </p>
                      <div className="flex gap-4 mt-3 text-xs text-slate-400">
                        <span>Type: <span className="text-cyan-400">{system.deploymentType}</span></span>
                        {system.domain && <span>Domain: <span className="text-cyan-400">{system.domain}</span></span>}
                        {system.wallet && <span>Wallet: <span className="text-cyan-400">{system.wallet.slice(0, 10)}...</span></span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${
                        system.status === 'active' ? 'text-green-400' :
                        system.status === 'paused' ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {system.status.toUpperCase()}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        {new Date(system.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Origin Authority Info */}
      <Card className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-700/50">
        <CardHeader>
          <CardTitle className="text-purple-300">Origin Authority</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-slate-300">
            <p>• All systems inherit from SSBNOW.SHOP origin authority</p>
            <p>• EIGHT manages cross-system operations</p>
            <p>• Single admin enforces ecosystem rules</p>
            <p>• No system can disconnect from origin</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
