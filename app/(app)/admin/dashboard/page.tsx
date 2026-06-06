'use client'

import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Users, MessageSquare, Zap, LogOut, MessageCircle, Wallet, ArrowUpRight, ArrowDownLeft, Phone } from 'lucide-react'
import Link from 'next/link'
import { clearToken } from '@/lib/auth-client'
import { BottomNav } from '@/components/bottom-nav'
import { NotificationBell } from '@/components/notification-bell'
import { openWhatsAppWithNumber, SUPPORT_NUMBERS } from '@/components/external-apps-nav'

interface AdminTab {
  id: 'overview' | 'users' | 'sweeps' | 'wallet' | 'eight' | 'clients'
  label: string
  icon: React.ReactNode
}

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'sweeps' | 'wallet' | 'eight' | 'clients'>('overview')

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
    { id: 'overview', label: 'Overview', icon: <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'users', label: 'Users', icon: <Users className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'sweeps', label: 'Sweeps', icon: <Zap className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'wallet', label: 'Wallet', icon: <Wallet className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'eight', label: 'EIGHT', icon: <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'clients', label: 'Clients', icon: <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" /> },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      <div className="relative z-10 p-3 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header - Mobile Optimized */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 mb-1">
                Admin Panel
              </h1>
              <p className="text-sm text-slate-400">Welcome, {user.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-slate-400 hover:text-white"
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>

          {/* Tabs - Mobile Scrollable */}
          <div className="flex gap-1 sm:gap-2 mb-6 border-b border-slate-700 overflow-x-auto pb-1 scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {tab.icon}
                <span className="hidden xs:inline sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="space-y-6">
            {activeTab === 'overview' && <OverviewSection user={user} />}
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'sweeps' && <FundSweeps />}
            {activeTab === 'wallet' && <AdminWalletSection user={user} />}
            {activeTab === 'eight' && <EightChat />}
            {activeTab === 'clients' && (
              <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-green-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition duration-500"></div>
                <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6 sm:p-8 text-center">
                  <MessageCircle className="h-12 w-12 sm:h-16 sm:w-16 text-cyan-400 mx-auto mb-4" />
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Client Messages</h2>
                  <p className="text-sm text-slate-400 mb-6">
                    View and respond to client messages
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
      
      <BottomNav />
    </div>
  )
}

// Overview Section with WhatsApp & Base Integration
function OverviewSection({ user }: { user: any }) {
  const openBase = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile) {
      window.location.href = 'cbwallet://dapp'
      setTimeout(() => {
        window.location.href = 'https://play.google.com/store/apps/details?id=org.toshi'
      }, 2000)
    } else {
      window.open('https://www.coinbase.com/wallet', '_blank')
    }
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl opacity-30 blur"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-slate-400 mb-1">Platform Balance</p>
            <p className="text-2xl sm:text-4xl font-bold text-cyan-400">{user.platform_wallet_balance || 0} <span className="text-sm sm:text-lg">TRX</span></p>
          </div>
        </div>
        <div className="group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl opacity-30 blur"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-slate-400 mb-1">Escrow Balance</p>
            <p className="text-2xl sm:text-4xl font-bold text-yellow-400">{user.escrow_balance || 0} <span className="text-sm sm:text-lg">TRX</span></p>
          </div>
        </div>
      </div>

      {/* WhatsApp Support Section */}
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition"></div>
        <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white">WhatsApp Business</h3>
              <p className="text-xs sm:text-sm text-slate-400">Connect with support teams</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <button
              onClick={() => openWhatsAppWithNumber(SUPPORT_NUMBERS.mandate, 'Admin inquiry')}
              className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 transition"
            >
              <Phone className="w-4 h-4 text-green-400" />
              <span className="text-xs sm:text-sm text-green-300">Mandate</span>
            </button>
            <button
              onClick={() => openWhatsAppWithNumber(SUPPORT_NUMBERS.legal, 'Admin inquiry')}
              className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 transition"
            >
              <Phone className="w-4 h-4 text-green-400" />
              <span className="text-xs sm:text-sm text-green-300">Legal</span>
            </button>
            <button
              onClick={() => openWhatsAppWithNumber(SUPPORT_NUMBERS.forensic, 'Admin inquiry')}
              className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 transition"
            >
              <Phone className="w-4 h-4 text-green-400" />
              <span className="text-xs sm:text-sm text-green-300">Forensic</span>
            </button>
            <button
              onClick={() => openWhatsAppWithNumber(SUPPORT_NUMBERS.admin, 'Admin inquiry')}
              className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 transition"
            >
              <Phone className="w-4 h-4 text-green-400" />
              <span className="text-xs sm:text-sm text-green-300">Admin</span>
            </button>
          </div>
        </div>
      </div>

      {/* Base / Coinbase Wallet Section */}
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition"></div>
        <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <svg className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.374 0 0 5.374 0 12s5.374 12 12 12 12-5.374 12-12S18.626 0 12 0zm0 21.6c-5.298 0-9.6-4.302-9.6-9.6S6.702 2.4 12 2.4s9.6 4.302 9.6 9.6-4.302 9.6-9.6 9.6zm0-16.8c-3.978 0-7.2 3.222-7.2 7.2s3.222 7.2 7.2 7.2 7.2-3.222 7.2-7.2-3.222-7.2-7.2-7.2zm3.6 7.8h-3v3h-1.2v-3h-3v-1.2h3v-3h1.2v3h3v1.2z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Base Network</h3>
                <p className="text-xs sm:text-sm text-slate-400">Coinbase Wallet L2</p>
              </div>
            </div>
            <button
              onClick={openBase}
              className="px-4 sm:px-6 py-2 sm:py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition"
            >
              Open Base
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Link href="/wallet/deposit-withdraw">
          <div className="group relative cursor-pointer h-full">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition"></div>
            <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-4 sm:p-6 hover:border-green-500/50 transition h-full">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <ArrowDownLeft className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="text-sm sm:text-lg font-bold text-white">Deposit</h3>
                  <p className="text-xs text-slate-400 hidden sm:block">Flutterwave</p>
                </div>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/wallet/deposit-withdraw">
          <div className="group relative cursor-pointer h-full">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-rose-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition"></div>
            <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-4 sm:p-6 hover:border-red-500/50 transition h-full">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <ArrowUpRight className="h-5 w-5 sm:h-6 sm:w-6 text-red-400" />
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="text-sm sm:text-lg font-bold text-white">Withdraw</h3>
                  <p className="text-xs text-slate-400 hidden sm:block">TRON wallet</p>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>
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
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('unassigned')

  useEffect(() => {
    fetchUsers()
    fetchAgents()
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

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/users?role=agent')
      const data = await response.json()
      setAgents(data.users || [])
    } catch (error) {
      console.error('Error fetching agents:', error)
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

  const assignBridgerToAgent = async (bridgerId: string, agentId: string) => {
    try {
      const response = await fetch('/api/admin/assign-bridger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bridgerId, agentId }),
      })
      const data = await response.json()
      if (response.ok) {
        fetchUsers()
        fetchAgents()
      } else {
        alert(data.error || 'Failed to assign bridger')
      }
    } catch (error) {
      console.error('Error assigning bridger:', error)
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
                  <th className="px-4 py-3">Assigned Agent</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {users.map((user: any) => (
                  <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-white">{user.name}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{user.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={user.departmental_code || ''}
                        onChange={(e) => assignDepartment(user.id, e.target.value)}
                        className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-xs"
                      >
                        <option value="">Select...</option>
                        <option value="HOPE">Bridger</option>
                        <option value="STABILITY">Agent</option>
                        <option value="MOVEMENT">Client</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {(user.role === 'bridger' || user.departmental_code === 'HOPE') && (
                        <select
                          value={user.assigned_agent_id || ''}
                          onChange={(e) => assignBridgerToAgent(user.id, e.target.value)}
                          className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-xs"
                        >
                          <option value="">No Agent</option>
                          {agents.map((agent: any) => (
                            <option key={agent.id} value={agent.id}>
                              {agent.name} ({agent.bridger_count || 0}/3)
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-cyan-400 font-semibold text-sm">{user.platform_wallet_balance || 0} TRX</td>
                    <td className="px-4 py-3">
                      {user.assigned_agent_id ? (
                        <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
                          Assigned
                        </span>
                      ) : !user.departmental_code ? (
                        <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full">
                          Pending
                        </span>
                      ) : null}
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
