'use client'

import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Users, LogOut, MessageCircle, Gamepad2, ShoppingBag, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { clearToken } from '@/lib/auth-client'
import { RiverChat } from '@/components/river-chat'
import { NotificationBell } from '@/components/notification-bell'
import Arena from '@/components/places/arena'
import Lounge from '@/components/places/lounge'
import Link from 'next/link'
import { ExternalAppsNav, WhatsAppButton } from '@/components/external-apps-nav'

type TabId = 'lounge' | 'arena' | 'market' | 'wallet' | 'team'

export default function AgentDashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('lounge')

  useEffect(() => {
    if (!user || user.role !== 'agent') {
      router.push('/dashboard')
    }
  }, [user, router])

  if (!user || user.role !== 'agent') {
    return null
  }

  const handleLogout = () => {
    logout()
    clearToken()
    router.push('/')
  }

  const tabs = [
    { id: 'lounge' as TabId, label: 'Lounge', icon: <MessageCircle className="h-5 w-5" /> },
    { id: 'arena' as TabId, label: 'Arena & Casino', icon: <Gamepad2 className="h-5 w-5" /> },
    { id: 'wallet' as TabId, label: 'Wallet', icon: <Wallet className="h-5 w-5" /> },
    { id: 'market' as TabId, label: 'Market', icon: <ShoppingBag className="h-5 w-5" /> },
    { id: 'team' as TabId, label: 'My Bridgers', icon: <Users className="h-5 w-5" /> },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950/20 to-slate-950">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      <div className="relative z-10 p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 mb-1">
                Agent Dashboard
              </h1>
              <p className="text-slate-400 text-sm">Welcome back, {user.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <ExternalAppsNav userRole="agent" />
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

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">My Bridgers</p>
              <p className="text-2xl font-bold text-cyan-400">0/3</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">Platform Balance</p>
              <p className="text-2xl font-bold text-emerald-400">{user.platform_wallet_balance || 0} TRX</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">Escrow Balance</p>
              <p className="text-2xl font-bold text-yellow-400">{user.escrow_balance || 0} TRX</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">Department</p>
              <p className="text-2xl font-bold text-purple-400">{user.departmental_code || 'N/A'}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 sm:gap-2 mb-6 border-b border-slate-700 overflow-x-auto pb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-3 font-semibold transition-all whitespace-nowrap text-sm sm:text-base ${
                  activeTab === tab.id
                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="space-y-6">
            {activeTab === 'lounge' && <Lounge />}
            {activeTab === 'arena' && <Arena />}
            {activeTab === 'wallet' && <WalletSection user={user} />}
            {activeTab === 'market' && <MarketSection />}
            {activeTab === 'team' && <MyBridgers />}
          </div>
        </div>
      </div>
      
      <RiverChat />
    </div>
  )
}

function WalletSection({ user }: { user: any }) {
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

      {/* Referral Link - Agents can ONLY invite Bridgers */}
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition"></div>
        <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-2">Invite Bridgers</h3>
          <p className="text-sm text-slate-400 mb-4">As an Agent, you can only invite new Bridgers to the platform</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/register?ref=${user?.id?.slice(0, 8) || ''}&role=bridger`}
              readOnly
              className="flex-1 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
            />
            <Button 
              className="bg-purple-600 hover:bg-purple-700"
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

function MarketSection() {
  return (
    <div className="group relative">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition duration-500"></div>
      <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <ShoppingBag className="h-8 w-8 text-emerald-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">Market</h2>
            <p className="text-slate-400 text-sm">Buy and sell items with TRX</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: 'Premium Badge', price: 50, category: 'Badges' },
            { name: 'VIP Access Pass', price: 200, category: 'Access' },
            { name: 'Custom Avatar Frame', price: 75, category: 'Cosmetics' },
            { name: 'Bonus Multiplier', price: 150, category: 'Boosters' },
            { name: 'Referral Boost', price: 100, category: 'Boosters' },
            { name: 'Exclusive Sticker Pack', price: 25, category: 'Cosmetics' },
          ].map((item, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-emerald-500/50 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">{item.category}</span>
                <span className="text-lg font-bold text-white">{item.price} TRX</span>
              </div>
              <h3 className="text-white font-semibold mb-3">{item.name}</h3>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-sm">
                Buy Now
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MyBridgers() {
  const [bridgers, setBridgers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBridgers = async () => {
      try {
        const response = await fetch('/api/users?role=bridger')
        const data = await response.json()
        setBridgers(data.users?.slice(0, 3) || [])
      } catch (error) {
        console.error('Error fetching bridgers:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchBridgers()
  }, [])

  return (
    <div className="group relative">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition duration-500"></div>
      <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-cyan-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">My Bridgers</h2>
              <p className="text-slate-400 text-sm">Manage your team (max 3)</p>
            </div>
          </div>
          {bridgers.length < 3 && (
            <Button className="bg-cyan-600 hover:bg-cyan-700">
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
                    <p className="text-lg font-bold text-cyan-400">0</p>
                  </div>
                  <div className="bg-slate-900/50 rounded p-2">
                    <p className="text-xs text-slate-500">Earnings</p>
                    <p className="text-lg font-bold text-emerald-400">0</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full border-slate-600 text-sm">
                  View Details
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
