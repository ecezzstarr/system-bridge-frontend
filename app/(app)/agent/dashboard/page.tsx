'use client'

import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Users, LogOut, MessageCircle, Gamepad2, ShoppingBag, Wallet, ArrowUpRight, ArrowDownLeft, Phone } from 'lucide-react'
import { clearToken } from '@/lib/auth-client'
import { RiverChat } from '@/components/river-chat'
import { NotificationBell } from '@/components/notification-bell'
import Arena from '@/components/places/arena'
import Lounge from '@/components/places/lounge'
import Link from 'next/link'

type TabId = 'lounge' | 'connect' | 'arena' | 'market' | 'wallet' | 'team'

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
    { id: 'lounge' as TabId, label: 'Lounge', icon: <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'connect' as TabId, label: 'Connect', icon: <Phone className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'arena' as TabId, label: 'Arena', icon: <Gamepad2 className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'wallet' as TabId, label: 'Wallet', icon: <Wallet className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'team' as TabId, label: 'Bridgers', icon: <Users className="h-4 w-4 sm:h-5 sm:w-5" /> },
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
            <div className="flex items-center gap-2 sm:gap-3">
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
            {activeTab === 'connect' && <AgentConnectSection />}
            {activeTab === 'arena' && <Arena />}
            {activeTab === 'wallet' && <WalletSection user={user} />}
            {activeTab === 'team' && <MyBridgers />}
          </div>
        </div>
      </div>
      
      <RiverChat />
    </div>
  )
}

// WhatsApp Connect Section for Agents (No Base access for agents)
function AgentConnectSection() {
  const openWhatsApp = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile) {
      window.location.href = 'whatsapp://send'
    } else {
      window.open('https://web.whatsapp.com/', '_blank')
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* WhatsApp Section */}
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition"></div>
        <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="h-6 w-6 sm:h-7 sm:w-7 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">WhatsApp Business</h3>
                <p className="text-xs sm:text-sm text-slate-400">Connect with your team & bridgers</p>
              </div>
            </div>
          </div>
          <button
            onClick={openWhatsApp}
            className="w-full py-3 sm:py-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-base sm:text-lg transition flex items-center justify-center gap-2"
          >
            <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Open WhatsApp
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 sm:p-6">
        <p className="text-xs sm:text-sm text-slate-400 text-center">
          As an Agent, you can connect with your bridgers and team via WhatsApp. Base wallet access is available for Bridgers and Admins only.
        </p>
      </div>
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
  const { user } = useAuth()
  const [bridgers, setBridgers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBridgers = async () => {
      if (!user?.id) return
      try {
        // Fetch only bridgers assigned to this agent
        const response = await fetch(`/api/agent/bridgers?agentId=${user.id}`)
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
