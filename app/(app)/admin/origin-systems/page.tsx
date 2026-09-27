'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { Bot, CheckCircle2, XCircle } from 'lucide-react'
import { WeaveSystemRoom } from '@/components/world/weave-system-room'

interface SystemInfo {
  id: string
  name: string
  createdAt: number
  deploymentType: string
  domain?: string
  wallet?: string
  status: string
}

interface AIAgent {
  id: string
  name: string
  description: string
  model: string
  auth: string
  accessLevel: string
  configured: boolean
}

export default function OriginSystemsPanel() {
  const { user } = useAuth()
  const router = useRouter()
  const [systems, setSystems] = useState<SystemInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [agents, setAgents] = useState<AIAgent[]>([])
  const [agentsLoading, setAgentsLoading] = useState(true)

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login')
      return
    }

    fetchSystems()
    fetchAgents()
  }, [user, router])

  const fetchAgents = async () => {
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch('/api/ai-registry/status', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await response.json()
      if (data.success) setAgents(data.agents)
    } catch (error) {
      console.error('Error fetching AI agents:', error)
    } finally {
      setAgentsLoading(false)
    }
  }

  const fetchSystems = async () => {
    try {
      const token=localStorage.getItem('ssb_auth_token')
      const response = await fetch('/api/origin/systems', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
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
    <WeaveSystemRoom
      roomKey="administration-origin-systems"
      eyebrow="Administration · Origin Systems"
      title="Origin Systems Network"
      detail="Systems, AI agents and origin authority operate as one infrastructure environment connected to the SSBNOW.SHOP origin ledger."
      tone="cyan"
      pulse={loading||agentsLoading?'Reading origin state':'Origin network synchronized'}
      left={
        <section className="border-l border-blue-300/20 pl-4">
          <div className="flex items-center gap-2"><Bot className="h-4 w-4 text-blue-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-300">AI Registry</p></div>
          <p className="mt-2 text-[10px] leading-5 text-slate-500">Autonomous agents active within WEAVE.</p>
          {agentsLoading ? <p className="mt-4 text-xs text-slate-500">Loading agents...</p> : (
            <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
              {agents.map(agent=>(
                <div key={agent.id} className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-black text-white">{agent.name}</p>
                    {agent.configured?<CheckCircle2 className="h-3.5 w-3.5 text-green-400"/>:<XCircle className="h-3.5 w-3.5 text-red-400"/>}
                  </div>
                  <p className="mt-1 text-[10px] leading-4 text-slate-500">{agent.description}</p>
                  <p className="mt-2 text-[9px] text-slate-600">{agent.model} · {agent.auth} · {agent.accessLevel}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      }
      center={
        <section data-origin-systems-network>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300">Connected systems</p>
              <h2 className="mt-1 text-xl font-black text-white">Origin ledger network</h2>
              <p className="mt-1 text-[10px] text-slate-500">Every row is a system attached to the same origin authority.</p>
            </div>
            <div className="flex gap-5 text-right">
              <div><p className="text-[8px] uppercase text-slate-600">Total</p><p className="text-xl font-black text-cyan-300">{systems.length}</p></div>
              <div><p className="text-[8px] uppercase text-slate-600">Active</p><p className="text-xl font-black text-green-300">{systems.filter(s=>s.status==='active').length}</p></div>
              <div><p className="text-[8px] uppercase text-slate-600">Paused</p><p className="text-xl font-black text-yellow-300">{systems.filter(s=>s.status==='paused').length}</p></div>
            </div>
          </div>

          {loading ? (
            <p className="py-12 text-sm text-slate-500">Loading systems...</p>
          ) : systems.length===0 ? (
            <p className="py-12 text-sm text-slate-500">No systems registered yet.</p>
          ) : (
            <div className="divide-y divide-white/[0.075]">
              {systems.map((system,index)=>(
                <article key={system.id} className="grid gap-3 py-4 md:grid-cols-[36px_minmax(0,1fr)_150px] md:items-center" data-origin-system={system.id}>
                  <span className="text-[8px] font-black text-slate-700">{String(index+1).padStart(2,'0')}</span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-white">{system.name}</h3>
                    <p className="mt-1 truncate font-mono text-[9px] text-slate-600">{system.id}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
                      <span>Type <span className="text-cyan-300">{system.deploymentType}</span></span>
                      {system.domain&&<span>Domain <span className="text-cyan-300">{system.domain}</span></span>}
                      {system.wallet&&<span>Wallet <span className="text-cyan-300">{system.wallet.slice(0,10)}…</span></span>}
                    </div>
                  </div>
                  <div className="md:text-right">
                    <p className={`text-[9px] font-black uppercase ${system.status==='active'?'text-green-300':system.status==='paused'?'text-yellow-300':'text-red-300'}`}>{system.status}</p>
                    <p className="mt-1 text-[9px] text-slate-600">{new Date(system.createdAt).toLocaleDateString()}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      }
      right={
        <section className="border-l border-purple-300/20 pl-4">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-purple-300">Origin authority</p>
          <div className="mt-3 space-y-2 text-[10px] leading-5 text-slate-400">
            <p>All systems inherit from SSBNOW.SHOP origin authority.</p>
            <p>EIGHT manages cross-system operations.</p>
            <p>Administration governs WEAVE rules and system authority.</p>
            <p>No system disconnects from origin without recorded authority.</p>
          </div>
        </section>
      }
    />
  )
}
