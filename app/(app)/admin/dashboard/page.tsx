'use client'

import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Users, MessageSquare, Zap, LogOut, Code, Globe, CreditCard, MessageCircle, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import Link from 'next/link'
import { clearToken } from '@/lib/auth-client'
import { EcosystemNav } from '@/components/ecosystem-nav'
import { RiverChat } from '@/components/river-chat'
import { NotificationBell } from '@/components/notification-bell'

interface AdminTab {
  id: 'users' | 'sweeps' | 'wallet' | 'eight' | 'clients'
  label: string
  icon: React.ReactNode
}

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'users' | 'sweeps' | 'wallet' | 'eight' | 'clients'>('users')

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

  const tabs: AdminTab[] = [
    { id: 'users', label: 'User Management', icon: <Users className="h-5 w-5" /> },
    { id: 'sweeps', label: 'Fund Sweeps', icon: <Zap className="h-5 w-5" /> },
    { id: 'wallet', label: 'Wallet', icon: <Wallet className="h-5 w-5" /> },
    { id: 'eight', label: 'EIGHT Chat', icon: <MessageSquare className="h-5 w-5" /> },
    { id: 'clients', label: 'Client Interactions', icon: <MessageSquare className="h-5 w-5" /> },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      <div className="relative z-10 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
                Admin Control Panel
              </h1>
              <p className="text-slate-400">Welcome back, {user.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/lounge">
                <Button variant="outline" size="sm" className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Lounge
                </Button>
              </Link>
              <NotificationBell />
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="text-slate-400 hover:text-white"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Logout
              </Button>
            </div>
          </div>

          {/* Ecosystem Navigation */}
          <div className="mb-8 p-4 bg-slate-900/50 rounded-lg border border-slate-800">
            <p className="text-xs text-slate-500 mb-3 font-semibold">NAVIGATE ECOSYSTEM</p>
            <EcosystemNav currentSystem="shop" />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-slate-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="space-y-6">
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'sweeps' && <FundSweeps />}
            {activeTab === 'wallet' && <AdminWalletSection user={user} />}
            {activeTab === 'eight' && <EightChat />}
            {activeTab === 'clients' && (
              <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-green-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition duration-500"></div>
                <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-8 text-center">
                  <MessageCircle className="h-16 w-16 text-cyan-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">Client Messages</h2>
                  <p className="text-slate-400 mb-6">
                    View and respond to client messages as different company positions
                  </p>
                  <Link href="/admin/client-messages">
                    <Button className="bg-gradient-to-r from-cyan-500 to-green-500 text-white hover:opacity-90">
                      Open Client Messages
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <RiverChat />
    </div>
  )
}

function AdminWalletSection({ user }: { user: any }) {
  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl opacity-30 blur"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
            <p className="text-sm text-slate-400 mb-2">Platform Balance</p>
            <p className="text-4xl font-bold text-cyan-400">{user.platform_wallet_balance || 0} TRX</p>
          </div>
        </div>
        <div className="group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl opacity-30 blur"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
            <p className="text-sm text-slate-400 mb-2">Escrow Balance</p>
            <p className="text-4xl font-bold text-yellow-400">{user.escrow_balance || 0} TRX</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/wallet/deposit-withdraw">
          <div className="group relative cursor-pointer">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition"></div>
            <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6 hover:border-green-500/50 transition">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <ArrowDownLeft className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Deposit</h3>
                  <p className="text-sm text-slate-400">Add funds via Flutterwave</p>
                </div>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/wallet/deposit-withdraw">
          <div className="group relative cursor-pointer">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-rose-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition"></div>
            <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6 hover:border-red-500/50 transition">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <ArrowUpRight className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Withdraw</h3>
                  <p className="text-sm text-slate-400">Send to TRON wallet</p>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Auto-Sweep Info */}
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl opacity-20 blur"></div>
        <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-2">Auto-Sweep System</h3>
          <p className="text-sm text-slate-400 mb-4">
            EIGHT automatically sweeps 100 TRX from user wallets to the company wallet when balance reaches threshold.
          </p>
          <div className="flex items-center gap-4 text-sm">
            <div className="px-3 py-1 bg-purple-500/20 rounded-full text-purple-300">
              Threshold: 100 TRX
            </div>
            <div className="px-3 py-1 bg-green-500/20 rounded-full text-green-300">
              Status: Active
            </div>
          </div>
        </div>
      </div>

      {/* Referral Link */}
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition"></div>
        <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-2">Your Referral Link</h3>
          <p className="text-sm text-slate-400 mb-4">Share to earn commissions when new users sign up</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/register?ref=${user?.id?.slice(0, 8) || ''}`}
              readOnly
              className="flex-1 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
            />
            <Button 
              className="bg-cyan-600 hover:bg-cyan-700"
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/register?ref=${user?.id?.slice(0, 8) || ''}`)}
            >
              Copy
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('unassigned')

  useEffect(() => {
    fetchUsers()
  }, [filter])

  const fetchUsers = async () => {
    try {
      const response = await fetch(`/api/admin/users?filter=${filter}`)
      const data = await response.json()
      setUsers(data.users)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const assignDepartment = async (userId: string, deptCode: string) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, departmental_code: deptCode }),
      })
      if (response.ok) {
        fetchUsers()
      }
    } catch (error) {
      console.error('Error assigning department:', error)
    }
  }

  return (
    <div className="group relative">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition duration-500"></div>
      <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">User Management</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('unassigned')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                filter === 'unassigned'
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Unassigned
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              All Users
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-slate-400 text-center py-8">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No users found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs font-semibold text-slate-300 border-b border-slate-600">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Wallet Balance</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {users.map((user: any) => (
                  <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-white">{user.name}</td>
                    <td className="px-4 py-3 text-slate-400">{user.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={user.departmental_code}
                        onChange={(e) => assignDepartment(user.id, e.target.value)}
                        className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                      >
                        <option value="HOPE">HOPE (Bridger)</option>
                        <option value="STABILITY">STABILITY (Agent)</option>
                        <option value="MOVEMENT">MOVEMENT (Client)</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-cyan-400 font-semibold">{user.platform_wallet_balance} TRX</td>
                    <td className="px-4 py-3">
                      {!user.assigned_by_admin && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full">
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function FundSweeps() {
  const [sweeps, setSweeps] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSweeps()
  }, [])

  const fetchSweeps = async () => {
    try {
      const response = await fetch('/api/admin/sweeps')
      const data = await response.json()
      setSweeps(data.sweeps)
    } catch (error) {
      console.error('Error fetching sweeps:', error)
    } finally {
      setLoading(false)
    }
  }

  const approveSweep = async (sweepId: string, userId: string) => {
    try {
      await fetch('/api/admin/sweeps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sweepId, adminId: userId, action: 'approve' }),
      })
      fetchSweeps()
    } catch (error) {
      console.error('Error approving sweep:', error)
    }
  }

  const executeSweep = async (sweepId: string) => {
    try {
      await fetch('/api/admin/sweeps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sweepId, action: 'execute' }),
      })
      fetchSweeps()
    } catch (error) {
      console.error('Error executing sweep:', error)
    }
  }

  return (
    <div className="group relative">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition duration-500"></div>
      <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Fund Sweep Requests from EIGHT</h2>

        {loading ? (
          <p className="text-slate-400 text-center py-8">Loading sweeps...</p>
        ) : sweeps.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No sweep requests</p>
        ) : (
          <div className="space-y-3">
            {sweeps.map((sweep: any) => (
              <div key={sweep.id} className="bg-slate-800/50 border border-slate-600 rounded-lg p-4 flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-white">{sweep.amount} TRX Sweep</p>
                  <p className="text-sm text-slate-400">
                    Status: <span className={`font-semibold ${sweep.status === 'pending' ? 'text-yellow-400' : sweep.status === 'approved' ? 'text-blue-400' : 'text-green-400'}`}>
                      {sweep.status.toUpperCase()}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2">
                  {sweep.status === 'pending' && (
                    <Button onClick={() => approveSweep(sweep.id, user?.id || '')} className="bg-blue-600 hover:bg-blue-700">
                      Approve
                    </Button>
                  )}
                  {sweep.status === 'approved' && (
                    <Button onClick={() => executeSweep(sweep.id)} className="bg-green-600 hover:bg-green-700">
                      Execute
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EightChat() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Array<{ id: number; sender: string; text: string; time: string }>>([
    { id: 1, sender: 'EIGHT', text: 'Admin panel connected. Ready for commands.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
  ])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return

    const userMessage = newMessage
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    // Add user message
    setMessages(prev => [
      ...prev,
      { id: prev.length + 1, sender: 'You', text: userMessage, time: currentTime },
    ])
    setNewMessage('')
    setLoading(true)

    try {
      // Send to EIGHT API
      const response = await fetch('/api/eight/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: userMessage,
          adminId: user.id,
          userRole: user.role,
        }),
      })

      const data = await response.json()
      const responseTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

      setMessages(prev => [
        ...prev,
        { 
          id: prev.length + 1, 
          sender: 'EIGHT', 
          text: data.message || 'Command processed.', 
          time: responseTime 
        },
      ])
    } catch (error) {
      console.error('[v0] EIGHT command error:', error)
      const responseTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setMessages(prev => [
        ...prev,
        { 
          id: prev.length + 1, 
          sender: 'EIGHT', 
          text: 'Error processing command. Please try again.', 
          time: responseTime 
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="group relative">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition duration-500"></div>
      <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6 h-96 flex flex-col">
        <h2 className="text-2xl font-bold text-white mb-4">EIGHT AI System</h2>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 bg-slate-800/50 rounded-lg p-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'You' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs px-4 py-2 rounded-lg ${msg.sender === 'You' ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-100'}`}>
                <p className="text-sm font-semibold">{msg.sender}</p>
                <p className="text-sm">{msg.text}</p>
                <p className="text-xs mt-1 opacity-70">{msg.time}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Try: sweep 10 trx to company wallet..."
            className="flex-1 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            disabled={loading}
          />
          <Button onClick={sendMessage} className="bg-cyan-600 hover:bg-cyan-700" disabled={loading}>
            {loading ? 'Processing...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function ClientInteractionsAdmin() {
  const { user } = useAuth()
  
  return (
    <Link href="/client-interactions" className="block">
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition duration-500"></div>
        <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6 hover:border-green-500/50 transition cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Client Interactions</h2>
              <p className="text-slate-400">View and manage all client-agent conversations across positions</p>
            </div>
            <MessageSquare className="h-12 w-12 text-green-400 opacity-50 group-hover:opacity-100 transition" />
          </div>
          
          <div className="mt-6 grid grid-cols-4 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Mandate</p>
              <p className="text-2xl font-bold text-cyan-400">→</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Lawyer</p>
              <p className="text-2xl font-bold text-cyan-400">→</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Forensic</p>
              <p className="text-2xl font-bold text-cyan-400">→</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Admin</p>
              <p className="text-2xl font-bold text-cyan-400">→</p>
            </div>
          </div>
          
          <p className="text-sm text-slate-500 mt-4">Click to access client service dashboard</p>
        </div>
      </div>
    </Link>
  )
}
