'use client'

import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  LogOut, 
  MessageCircle, 
  Gamepad2, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Shield, 
  Zap, 
  Code, 
  Terminal,
  Activity,
  ChevronRight,
  MessageSquare,
  Search,
  Trophy,
  Globe,
  ShieldCheck,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  FileBox,
  UserPlus,
  Database,
  Brain,
  Flame,
  Copy,
  Plus,
  LayoutTemplate
} from 'lucide-react'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { clearToken } from '@/lib/auth-client'
import { RiverChat } from '@/components/river-chat'
import { EcosystemNav } from '@/components/ecosystem-nav'
import { DepartmentalCodesSection } from '@/components/admin/departmental-codes-section'
import { WORLD_RULES } from '@/lib/world/constants'

export default function AdminTerminal() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [liveStats, setLiveStats] = useState<{ totalUsers: number; platformVaultTrx: number; escrowPoolTrx: number } | null>(null)

  useEffect(() => {
    if (!user || user.role !== 'admin') return
    const token = localStorage.getItem('ssb_auth_token')
    fetch('/api/eight/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ action: 'stats', payload: {} })
    })
      .then(res => res.json())
      .then(data => { if (data.success) setLiveStats(data.stats) })
      .catch(() => {})
  }, [user])


  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [user, router])

  if (!user || user.role !== 'admin') {
    return null
  }

  const handleLogout = () => {
    logout()
    clearToken()
    router.push('/')
  }


  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 mb-1">
            Administration Control Center
          </h1>
          <p className="text-slate-400 text-sm">People, authorization, verification and announcements · {user.name}</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Users</p>
          <p className="text-2xl font-bold text-purple-400">{liveStats ? liveStats.totalUsers : '—'}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Platform Vault</p>
          <p className="text-2xl font-bold text-emerald-400">{liveStats ? `${liveStats.platformVaultTrx.toLocaleString()} TRX` : '—'}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Escrow Pool</p>
          <p className="text-2xl font-bold text-yellow-400">{liveStats ? `${liveStats.escrowPoolTrx.toLocaleString()} TRX` : '—'}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">System Pulse</p>
          <p className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
            Active <Activity className="h-4 w-4 animate-pulse text-green-400" />
          </p>
        </div>
      </div>

      <section className="border-y border-purple-300/10 bg-black/15 px-2 py-4 sm:px-4" data-administration-control-room="focused">
        <div className="mb-4 border-l-2 border-purple-300/30 pl-3">
          <p className="text-[9px] font-black uppercase tracking-[.18em] text-purple-300">One control room</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Users, departmental authorization, File Number verification, Bridger standing, Client communications, deposits, withdrawals and announcements stay as stations inside this room. Shared WEAVE places and Workshops no longer repeat here.</p>
        </div>
        <AdminPanelSection user={user} />
      </section>

      <RiverChat />
    </div>
  )
}

function AdminPanelSection({ user }: { user: any }) {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'bridgers' | 'deposits' | 'bridge' | 'withdrawals' | 'announcements' | 'departmental'>('users')

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash
      if (hash === '#bridgers') setActiveSubTab('bridgers')
      else if (hash === '#users') setActiveSubTab('users')
      else if (hash === '#clients') window.location.replace('/admin/hub?tab=clients')
      else if (hash === '#fne') window.location.replace('/admin/file-number-engine')
      else if (hash === '#deposits') setActiveSubTab('deposits')
      else if (hash === '#tron') window.location.replace('/admin/client-deposits')
      else if (hash === '#bridge') setActiveSubTab('bridge')
      else if (hash === '#withdrawals') setActiveSubTab('withdrawals')
      else if (hash === '#departmental') setActiveSubTab('departmental')
    }

    handleHash()
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-slate-800 pb-px overflow-x-auto scrollbar-hide">
        <button 
          onClick={() => setActiveSubTab('users')}
          className={`pb-2 text-[10px] sm:text-sm font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'users' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          Users
        </button>
        <button 
          onClick={() => setActiveSubTab('departmental')}
          className={`pb-2 text-[10px] sm:text-sm font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'departmental' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          Dept. Authorization
        </button>

        <button 
          onClick={() => setActiveSubTab('bridgers')}
          className={`pb-2 text-[10px] sm:text-sm font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'bridgers' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          Bridger Ops
        </button>

        <button 
          onClick={() => setActiveSubTab('deposits')}
          className={`pb-2 text-[10px] sm:text-sm font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'deposits' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          Deposits
        </button>

        <button 
          onClick={() => setActiveSubTab('bridge')}
          className={`pb-2 text-[10px] sm:text-sm font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'bridge' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          Bridge Deposits
        </button>
        <button 
          onClick={() => setActiveSubTab('withdrawals')}
          className={`pb-2 text-[10px] sm:text-sm font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'withdrawals' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          Withdrawals
        </button>
        <button 
          onClick={() => setActiveSubTab('announcements')}
          className={`pb-2 text-[10px] sm:text-sm font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'announcements' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          Announcements
        </button>
      </div>

      <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-1 min-h-[400px]">
        {activeSubTab === 'users' && <UserManagementSection />}
        {activeSubTab === 'departmental' && <DepartmentalCodesSection />}
        {activeSubTab === 'bridgers' && <BridgerManagementSection />}
        {activeSubTab === 'deposits' && <DepositApprovalSection user={user} />}
        {activeSubTab === 'bridge' && <BridgeDepositApprovalSection user={user} />}
        {activeSubTab === 'withdrawals' && <WithdrawalApprovalSection user={user} />}
        {activeSubTab === 'announcements' && <AnnouncementSection />}
      </div>
    </div>
  )
}

function BridgerManagementSection() {
  const { token } = useAuth()
  const [bridgers, setBridgers] = useState<any[]>([])
  const [summary, setSummary] = useState({ total: 0, continuanceActive: 0, continuanceDue: 0, continuanceSuspended: 0, bridgeAiActive: 0 })
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState('')

  const fetchBridgers = async () => {
    if (!token) {
      setBridgers([])
      setError('Administration session is unavailable. Sign in again to operate Bridgers.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/bridger/list', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Unable to read Bridger operations')
      }
      setBridgers(data.bridgers || [])
      setSummary(data.summary || { total: 0, continuanceActive: 0, continuanceDue: 0, continuanceSuspended: 0, bridgeAiActive: 0 })
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unable to read Bridger operations'
      console.error('Failed to fetch bridgers:', requestError)
      setBridgers([])
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchBridgers()
  }, [token])

  const toggleExempt = async (userId: string, currentExempt: boolean) => {
    if (!token) {
      setError('Administration session is unavailable. Sign in again to operate Bridgers.')
      return
    }

    setUpdating(userId)
    setError('')
    try {
      const res = await fetch('/api/admin/bridger/exemption', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, isExempt: !currentExempt })
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Unable to update Bridger Continuance')
      }
      toast.success(data.message)
      await fetchBridgers()
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unable to update Bridger Continuance'
      setError(message)
      toast.error(message)
    } finally {
      setUpdating(null)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-10 w-10 animate-spin text-purple-500 opacity-20" />
    </div>
  )

  return (
    <div className="p-4 text-white">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold uppercase tracking-tight">Bridger Operations</h3>
          <p className="text-xs text-slate-500 font-medium">Manage Continuance standing and operational access from the live Bridger registry.</p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            type="button"
            onClick={() => void fetchBridgers()}
            className="h-9 rounded-lg border border-slate-700 bg-slate-800/50 px-3 text-[9px] font-black uppercase tracking-widest text-slate-300 hover:border-purple-400/40 hover:text-white"
          >
            Refresh
          </button>
          <div className="text-center px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Fee</p>
            <p className="text-sm font-bold text-emerald-400">₦{WORLD_RULES.BRIDGER_CONTINUANCE_NGN.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Current Bridgers</p><p className="mt-1 text-lg font-black text-white">{summary.total}</p></div>
        <div className="rounded-xl border border-emerald-300/15 bg-emerald-400/[.04] p-3"><p className="text-[9px] font-black uppercase tracking-wider text-emerald-300">Continuance active</p><p className="mt-1 text-lg font-black text-white">{summary.continuanceActive}</p></div>
        <div className="rounded-xl border border-amber-300/15 bg-amber-400/[.04] p-3"><p className="text-[9px] font-black uppercase tracking-wider text-amber-300">Due</p><p className="mt-1 text-lg font-black text-white">{summary.continuanceDue}</p></div>
        <div className="rounded-xl border border-red-300/15 bg-red-400/[.04] p-3"><p className="text-[9px] font-black uppercase tracking-wider text-red-300">Suspended</p><p className="mt-1 text-lg font-black text-white">{summary.continuanceSuspended}</p></div>
        <div className="rounded-xl border border-cyan-300/15 bg-cyan-400/[.04] p-3"><p className="text-[9px] font-black uppercase tracking-wider text-cyan-300">Bridge AI active</p><p className="mt-1 text-lg font-black text-white">{summary.bridgeAiActive}</p></div>
      </div>

      {error && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-rose-400/20 bg-rose-500/5 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-rose-200">{error}</p>
          <button
            type="button"
            onClick={() => void fetchBridgers()}
            className="shrink-0 rounded-lg border border-rose-300/20 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-rose-100"
          >
            Retry
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">Bridger Identity</th>
              <th className="px-4 py-3">Continuance</th>
              <th className="px-4 py-3">Continuance Expiry</th>
              <th className="px-4 py-3">Bridge AI</th>
              <th className="px-4 py-3">Bridge AI Expiry</th>
              <th className="px-4 py-3">Exempt</th>
              <th className="px-4 py-3 text-right">Control</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {bridgers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-20 text-center text-slate-600 text-sm italic">
                  {error ? 'Bridger registry is unavailable.' : 'No Bridgers found in the system.'}
                </td>
              </tr>
            ) : (
              bridgers.map((bridger) => (
                <tr key={bridger.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold uppercase">{bridger.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono tracking-tighter">{bridger.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {bridger.subscription_status === 'active' ? (
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Active
                      </div>
                    ) : bridger.subscription_status === 'due' ? (
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                        <AlertTriangle className="h-2.5 w-2.5" /> Due
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-500/10 text-red-500 border border-red-500/20">
                        <XCircle className="h-2.5 w-2.5" /> Suspended
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 font-mono text-[10px] text-slate-400">
                    {bridger.subscription_expiry ? new Date(bridger.subscription_expiry).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${
                      bridger.bridge_ai_status === 'active'
                        ? 'border-cyan-400/20 bg-cyan-500/10 text-cyan-300'
                        : bridger.bridge_ai_status === 'expired'
                          ? 'border-amber-400/20 bg-amber-500/10 text-amber-300'
                          : 'border-slate-700 bg-slate-800/60 text-slate-500'
                    }`}>
                      {bridger.bridge_ai_status || 'inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-mono text-[10px] text-slate-400">
                    {bridger.bridge_ai_expiry ? new Date(bridger.bridge_ai_expiry).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-4 py-4">
                    {bridger.is_subscription_exempt ? (
                      <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">Exempt</span>
                    ) : (
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Required</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void toggleExempt(bridger.id, Boolean(bridger.is_subscription_exempt))}
                      disabled={updating === bridger.id}
                      className={`h-8 text-[9px] font-black uppercase tracking-widest ${
                        bridger.is_subscription_exempt 
                          ? 'border-slate-700 text-slate-400 hover:bg-slate-700' 
                          : 'border-purple-500/30 text-purple-400 bg-purple-500/5 hover:bg-purple-500/10'
                      }`}
                    >
                      {updating === bridger.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : bridger.is_subscription_exempt ? (
                        'Remove Exemption'
                      ) : (
                        <>
                          <ShieldCheck className="mr-1 h-3 w-3" /> Grant Exemption
                        </>
                      )}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function UserManagementSection() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('unassigned')
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [actingOn, setActingOn] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
    fetchAgents()
  }, [filter])

  const fetchUsers = async () => {
    try {
      const response = await fetch(`/api/admin/users?filter=${filter}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('ssb_auth_token') || ''}` },
      })
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAgents = async () => {
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch('/api/users?role=agent', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await response.json()
      setAgents(data.users || [])
    } catch (error) {
      console.error('Error fetching agents:', error)
    }
  }

  const assignDepartment = async (userId: string, deptCode: string) => {
    setActingOn(userId)
    setStatusMsg(null)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('ssb_auth_token') || ''}`,
        },
        body: JSON.stringify({ userId, departmental_code: deptCode, adminId: user?.id }),
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setStatusMsg({ type: 'success', text: data.message || 'Updated' })
        fetchUsers()
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to update department' })
      }
    } catch (error) {
      console.error('Error assigning department:', error)
      setStatusMsg({ type: 'error', text: 'Failed to update department' })
    } finally {
      setActingOn(null)
    }
  }

  const removeRole = async (userId: string) => {
    if (!confirm('Remove this user\'s role and agent assignment, demoting them to a plain user?')) return
    await assignDepartment(userId, '')
  }

  const deleteAccount = async (userId: string, email: string) => {
    if (!confirm(`Permanently delete ${email}? This cannot be undone and will remove their wallet, ledger entries, and profiles.`)) return
    setActingOn(userId)
    setStatusMsg(null)
    try {
      const response = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('ssb_auth_token') || ''}` },
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setStatusMsg({ type: 'success', text: data.message || 'User deleted' })
        fetchUsers()
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to delete user' })
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      setStatusMsg({ type: 'error', text: 'Failed to delete user' })
    } finally {
      setActingOn(null)
    }
  }

  const assignBridgerToAgent = async (bridgerId: string, agentId: string) => {
    setActingOn(bridgerId)
    setStatusMsg(null)
    try {
      const response = await fetch('/api/admin/assign-bridger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('ssb_auth_token') || ''}`,
        },
        body: JSON.stringify({ bridgerId, agentId }),
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setStatusMsg({ type: 'success', text: data.message || (agentId ? 'Bridger assigned' : 'Bridger unassigned') })
        fetchUsers()
        fetchAgents()
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to assign bridger' })
      }
    } catch (error) {
      console.error('Error assigning bridger:', error)
      setStatusMsg({ type: 'error', text: 'Failed to assign bridger' })
    } finally {
      setActingOn(null)
    }
  }

  return (
    <div className="p-4">
      {statusMsg && (
        <div className={`mb-4 px-3 py-2 rounded-lg text-xs ${statusMsg.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
          {statusMsg.text}
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-white">User Management</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('unassigned')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filter === 'unassigned'
                ? 'bg-purple-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Unassigned
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filter === 'all'
                ? 'bg-purple-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All Users
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500 text-center py-8 text-xs">Loading users...</p>
      ) : users.length === 0 ? (
        <p className="text-slate-500 text-center py-8 text-xs">No users found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] sm:text-xs text-left">
            <thead className="text-slate-500 border-b border-slate-800">
              <tr>
                <th className="px-2 py-2 font-medium">Name</th>
                <th className="px-2 py-2 font-medium">Department</th>
                <th className="px-2 py-2 font-medium">Assigned Agent</th>
                <th className="px-2 py-2 font-medium">Balance</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((user: any) => (
                <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-2 py-2 font-semibold text-white">{user.name}</td>
                  <td className="px-2 py-2">
                    <select
                      value={user.departmental_code || ''}
                      onChange={(e) => assignDepartment(user.id, e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-white text-[10px]"
                    >
                      <option value="">Select...</option>
                      <option value="HOPE">Bridger</option>
                      <option value="STABILITY">Agent</option>
                      <option value="MOVEMENT">Client</option>
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    {(user.role === 'bridger' || user.departmental_code === 'HOPE') && (
                      <div className="flex items-center gap-1">
                        <select
                          value={user.assigned_agent_id || ''}
                          onChange={(e) => assignBridgerToAgent(user.id, e.target.value)}
                          className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-white text-[10px]"
                        >
                          <option value="">No Agent</option>
                          {agents.map((agent: any) => (
                            <option key={agent.id} value={agent.id}>
                              {agent.name} ({agent.bridger_count || 0}/3)
                            </option>
                          ))}
                        </select>
                        {user.assigned_agent_id && (
                          <button
                            onClick={() => assignBridgerToAgent(user.id, '')}
                            disabled={actingOn === user.id}
                            className="text-[9px] text-red-400 hover:underline disabled:opacity-50 whitespace-nowrap"
                            title="Unassign from agent"
                          >
                            Unassign
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2 text-cyan-400 font-mono">{user.platform_wallet_balance || 0} TRX</td>
                  <td className="px-2 py-2">
                    {user.assigned_agent_id ? (
                      <span className="text-[10px] bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded-full">
                        Assigned
                      </span>
                    ) : !user.departmental_code ? (
                      <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded-full">
                        Pending
                      </span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => removeRole(user.id)}
                      disabled={actingOn === user.id}
                      className="text-[10px] text-yellow-400 hover:underline disabled:opacity-50"
                    >
                      Remove Role
                    </button>
                    <button
                      onClick={() => deleteAccount(user.id, user.email)}
                      disabled={actingOn === user.id}
                      className="text-[10px] text-red-400 hover:underline disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function DepositApprovalSection({ user }: { user: any }) {
  const [deposits, setDeposits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    fetchPendingDeposits()
  }, [])

  const fetchPendingDeposits = async () => {
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch('/api/admin/deposit/opay/pending', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      const data = await response.json()
      setDeposits(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching pending deposits:', error)
    } finally {
      setLoading(false)
    }
  }

  const verifyDeposit = async (depositId: string, status: 'approved' | 'rejected') => {
    setProcessingId(depositId)
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch('/api/admin/deposit/opay/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ depositId, adminId: user?.id, status }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success(data.message || `Deposit ${status === 'approved' ? 'received' : 'declined'}`)
      } else {
        toast.error(data.error || "That didn't update")
      }
      fetchPendingDeposits()
    } catch (error) {
      console.error('Error verifying deposit:', error)
      toast.error("That didn't go through")
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="p-4">
      <h3 className="font-bold text-white mb-4">Pending OPay Deposits</h3>

      {loading ? (
        <p className="text-slate-500 text-center py-8 text-xs">Loading deposits...</p>
      ) : deposits.length === 0 ? (
        <p className="text-slate-500 text-center py-8 text-xs">No pending deposits</p>
      ) : (
        <div className="space-y-3">
          {deposits.map((deposit: any) => (
            <div key={deposit.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-semibold text-white text-sm">{deposit.name} <span className="text-slate-500 font-normal">({deposit.email})</span></p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    ₦{Number(deposit.amount).toLocaleString()} → {Number(deposit.amount_trx).toFixed(6)} TRX
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {new Date(deposit.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-yellow-400 uppercase">{deposit.status}</span>
              </div>
              {deposit.receipt_data && (
                <div className="mt-2 p-2 bg-slate-900/50 rounded border border-slate-700">
                  <p className="text-[10px] text-slate-500 uppercase mb-1">Receipt</p>
                  <p className="text-xs text-slate-300 break-all">{deposit.receipt_data}</p>
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  disabled={processingId === deposit.id}
                  onClick={() => verifyDeposit(deposit.id, 'approved')}
                  className="bg-green-600 hover:bg-green-700 h-8 text-xs"
                >
                  {processingId === deposit.id ? 'Processing...' : 'Approve'}
                </Button>
                <Button
                  size="sm"
                  disabled={processingId === deposit.id}
                  onClick={() => verifyDeposit(deposit.id, 'rejected')}
                  className="bg-red-600 hover:bg-red-700 h-8 text-xs"
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BridgeDepositApprovalSection({ user }: { user: any }) {
  const [deposits, setDeposits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    fetchPendingDeposits()
  }, [])

  const fetchPendingDeposits = async () => {
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch('/api/admin/bridge-deposits/pending', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      const data = await response.json()
      setDeposits(Array.isArray(data.deposits) ? data.deposits : [])
    } catch (error) {
      console.error('Error fetching pending bridge deposits:', error)
    } finally {
      setLoading(false)
    }
  }

  const verifyDeposit = async (depositId: string, status: 'approved' | 'rejected', source?: string) => {
    setProcessingId(depositId)
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch('/api/admin/bridge-deposits/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ depositId, status, source }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success(status === 'approved' ? `Received — file number ${data.fileNumber}` : 'Declined')
      } else {
        toast.error(data.error || "That didn't update")
      }
      fetchPendingDeposits()
    } catch (error) {
      console.error('Error verifying bridge deposit:', error)
      toast.error("That didn't go through")
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="p-4">
      <h3 className="font-bold text-white mb-1">Pending File Folder Crossings</h3>
      <p className="mb-4 text-[10px] leading-5 text-slate-500">One Administration verification point for Bridger Bridge deposits and direct Bridge Radiance prospect purchases.</p>

      {loading ? (
        <p className="text-slate-500 text-center py-8 text-xs">Loading deposits...</p>
      ) : deposits.length === 0 ? (
        <p className="text-slate-500 text-center py-8 text-xs">No pending deposits</p>
      ) : (
        <div className="space-y-3">
          {deposits.map((deposit: any) => (
            <div key={deposit.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-semibold text-white text-sm">{deposit.prospect_name} <span className="text-slate-500 font-normal">({deposit.prospect_phone})</span></p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {Number(deposit.tier_trx).toLocaleString()} TRX · {deposit.source === 'file_folder_purchase'
                      ? `Bridge Radiance purchase${deposit.bridge_code ? ` · /bridge/${deposit.bridge_code}` : ''}`
                      : `via ${deposit.bridger_name || 'Bridger'}'s Bridge AI${deposit.bridge_code ? ` · /bridge/${deposit.bridge_code}` : ''}`}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {new Date(deposit.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-yellow-400 uppercase">{deposit.status === 'pending_admin_confirmation' ? 'awaiting verification' : deposit.status}</span>
              </div>
              {deposit.tx_hash && (
                <div className="mt-2 p-2 bg-slate-900/50 rounded border border-slate-700">
                  <p className="text-[10px] text-slate-500 uppercase mb-1">Tx Hash</p>
                  <p className="text-xs text-slate-300 break-all">{deposit.tx_hash}</p>
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  disabled={processingId === deposit.id}
                  onClick={() => verifyDeposit(deposit.id, 'approved', deposit.source)}
                  className="bg-green-600 hover:bg-green-700 h-8 text-xs"
                >
                  {processingId === deposit.id ? 'Processing...' : 'Approve & Issue File Number'}
                </Button>
                <Button
                  size="sm"
                  disabled={processingId === deposit.id}
                  onClick={() => verifyDeposit(deposit.id, 'rejected', deposit.source)}
                  className="bg-red-600 hover:bg-red-700 h-8 text-xs"
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function WithdrawalApprovalSection({ user }: { user: any }) {
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    fetchPendingWithdrawals()
  }, [])

  const fetchPendingWithdrawals = async () => {
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch('/api/admin/withdrawal/pending', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      const data = await response.json()
      setWithdrawals(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching pending withdrawals:', error)
    } finally {
      setLoading(false)
    }
  }

  const verifyWithdrawal = async (withdrawalId: string, status: 'approved' | 'rejected') => {
    setProcessingId(withdrawalId)
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch('/api/admin/withdrawal/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ withdrawalId, status }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success(data.message || `Withdrawal ${status === 'approved' ? 'released' : 'declined'}`)
      } else {
        toast.error(data.error || "That didn't update")
      }
      fetchPendingWithdrawals()
    } catch (error) {
      console.error('Error verifying withdrawal:', error)
      toast.error("That didn't go through")
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="p-4">
      <h3 className="font-bold text-white mb-4">Pending Withdrawals</h3>

      {loading ? (
        <p className="text-slate-500 text-center py-8 text-xs">Loading withdrawals...</p>
      ) : withdrawals.length === 0 ? (
        <p className="text-slate-500 text-center py-8 text-xs">No pending withdrawals</p>
      ) : (
        <div className="space-y-3">
          {withdrawals.map((w: any) => (
            <div key={w.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-semibold text-white text-sm">{w.name} <span className="text-slate-500 font-normal">({w.email})</span> <span className="text-slate-600 text-[10px] uppercase">{w.user_role}</span></p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {Number(w.amount_trx).toFixed(6)} TRX → {w.wallet_address}
                  </p>
                  {w.payout_details && (() => {
                    try {
                      const details = typeof w.payout_details === 'string' ? JSON.parse(w.payout_details) : w.payout_details
                      if (!details || (!details.bankName && !details.accountNumber && !details.accountName)) return null
                      return (
                        <p className="text-[10px] text-cyan-400 mt-1">
                          {details.bankName} • {details.accountNumber} • {details.accountName}
                        </p>
                      )
                    } catch {
                      return null
                    }
                  })()}
                  <p className="text-[10px] text-slate-500 mt-1">
                    {new Date(w.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-yellow-400 uppercase">{w.status}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  disabled={processingId === w.id}
                  onClick={() => verifyWithdrawal(w.id, 'approved')}
                  className="bg-green-600 hover:bg-green-700 h-8 text-xs"
                >
                  {processingId === w.id ? 'Processing...' : 'Approve'}
                </Button>
                <Button
                  size="sm"
                  disabled={processingId === w.id}
                  onClick={() => verifyWithdrawal(w.id, 'rejected')}
                  className="bg-red-600 hover:bg-red-700 h-8 text-xs"
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AnnouncementSection() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [targetRole, setTargetRole] = useState('all')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const sendAnnouncement = async () => {
    if (!title.trim() || !message.trim()) {
      setResult('Title and message are required')
      return
    }
    setSending(true)
    setResult(null)
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const roles = targetRole === 'all' ? undefined : [targetRole]
      const response = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ title, content: message, type: 'announcement', roles }),
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setResult(data.message)
        setTitle('')
        setMessage('')
      } else {
        setResult(data.error || 'Failed to send')
      }
    } catch (error) {
      setResult('Failed to send announcement')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-lg">
      <h3 className="font-bold text-white">Send Announcement / App Update Notice</h3>
      {result && (
        <div className="px-3 py-2 rounded-lg text-xs bg-cyan-500/20 text-cyan-300">{result}</div>
      )}
      <div className="space-y-1">
        <label className="text-[10px] text-slate-500 uppercase font-bold">Send To</label>
        <select
          value={targetRole}
          onChange={(e) => setTargetRole(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-xs"
        >
          <option value="all">All Users</option>
          <option value="agent">Agents Only</option>
          <option value="bridger">Bridgers Only</option>
        </select>
      </div>
      <input
        type="text"
        placeholder="Title (e.g. App Update Available)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm"
      />
      <textarea
        placeholder="Message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm"
      />
      <Button onClick={sendAnnouncement} disabled={sending} className="bg-cyan-600 hover:bg-cyan-700">
        {sending ? 'Sending...' : 'Send Notification'}
      </Button>
    </div>
  )
}
