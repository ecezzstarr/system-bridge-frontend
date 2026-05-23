'use client'

import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { LogOut, MessageCircle, Gamepad2, ShoppingBag, Users, Wallet, ArrowUpRight, ArrowDownLeft, Phone, Send } from 'lucide-react'
import { clearToken } from '@/lib/auth-client'
import { RiverChat } from '@/components/river-chat'
import { NotificationBell } from '@/components/notification-bell'
import Arena from '@/components/places/arena'
import Lounge from '@/components/places/lounge'
import Link from 'next/link'
import { ExternalAppsNav, openWhatsAppWithNumber } from '@/components/external-apps-nav'

type TabId = 'lounge' | 'arena' | 'wallet' | 'connect' | 'market' | 'clients' | 'referrals'

export default function BridgerDashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('lounge')

  useEffect(() => {
    if (!user || user.role !== 'bridger') {
      router.push('/dashboard')
    }
  }, [user, router])

  if (!user || user.role !== 'bridger') {
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
    { id: 'clients' as TabId, label: 'Clients', icon: <Users className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'referrals' as TabId, label: 'Invite', icon: <Users className="h-4 w-4 sm:h-5 sm:w-5" /> },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950/20 to-slate-950">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.1)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      <div className="relative z-10 p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 mb-1">
                Bridger Dashboard
              </h1>
              <p className="text-slate-400 text-sm">Welcome back, {user.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <ExternalAppsNav userRole="bridger" />
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
              <p className="text-xs text-slate-500 mb-1">My Referrals</p>
              <p className="text-2xl font-bold text-emerald-400">0</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">Platform Balance</p>
              <p className="text-2xl font-bold text-cyan-400">{user.platform_wallet_balance || 0} TRX</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">Escrow Balance</p>
              <p className="text-2xl font-bold text-yellow-400">{user.escrow_balance || 0} TRX</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">Department</p>
              <p className="text-2xl font-bold text-purple-400">{user.departmental_code || 'HOPE'}</p>
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
                    ? 'text-emerald-400 border-b-2 border-emerald-400'
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
            {activeTab === 'connect' && <ConnectSection />}
            {activeTab === 'arena' && <Arena />}
            {activeTab === 'wallet' && <WalletSection user={user} />}
            {activeTab === 'clients' && <MyClients user={user} />}
            {activeTab === 'market' && <MarketSection />}
            {activeTab === 'referrals' && <MyReferrals user={user} />}
          </div>
        </div>
      </div>
      
      <RiverChat />
    </div>
  )
}

// WhatsApp & Base Connection Section
function ConnectSection() {
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
                <p className="text-xs sm:text-sm text-slate-400">Connect with clients & support</p>
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

      {/* Base / Coinbase Wallet Section */}
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition"></div>
        <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-blue-500/20 flex items-center justify-center">
                <svg className="h-6 w-6 sm:h-7 sm:w-7 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.374 0 0 5.374 0 12s5.374 12 12 12 12-5.374 12-12S18.626 0 12 0zm0 21.6c-5.298 0-9.6-4.302-9.6-9.6S6.702 2.4 12 2.4s9.6 4.302 9.6 9.6-4.302 9.6-9.6 9.6zm0-16.8c-3.978 0-7.2 3.222-7.2 7.2s3.222 7.2 7.2 7.2 7.2-3.222 7.2-7.2-3.222-7.2-7.2-7.2zm3.6 7.8h-3v3h-1.2v-3h-3v-1.2h3v-3h1.2v3h3v1.2z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">Base Network</h3>
                <p className="text-xs sm:text-sm text-slate-400">Coinbase Wallet L2</p>
              </div>
            </div>
          </div>
          <button
            onClick={openBase}
            className="w-full py-3 sm:py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base sm:text-lg transition flex items-center justify-center gap-2"
          >
            <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.374 0 12s5.374 12 12 12 12-5.374 12-12S18.626 0 12 0zm0 21.6c-5.298 0-9.6-4.302-9.6-9.6S6.702 2.4 12 2.4s9.6 4.302 9.6 9.6-4.302 9.6-9.6 9.6z"/>
            </svg>
            Open Base Wallet
          </button>
        </div>
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
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl opacity-30 blur"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
            <p className="text-sm text-slate-400 mb-2">Platform Balance</p>
            <p className="text-4xl font-bold text-emerald-400">{user.platform_wallet_balance || 0} TRX</p>
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

      {/* Referral Link - Bridgers can ONLY invite Clients */}
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition"></div>
        <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-2">Invite Clients</h3>
          <p className="text-sm text-slate-400 mb-4">As a Bridger, you can only invite new Clients to the platform</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/client/register?ref=${user?.id?.slice(0, 8) || ''}`}
              readOnly
              className="flex-1 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
            />
            <Button 
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/client/register?ref=${user?.id?.slice(0, 8) || ''}`)}
            >
              Copy
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MyClients({ user }: { user: any }) {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<any>(null)

  useEffect(() => {
    const fetchClients = async () => {
      if (!user?.id) return
      try {
        const response = await fetch(`/api/bridger/clients?bridgerId=${user.id}`)
        const data = await response.json()
        setClients(data.clients || [])
      } catch (error) {
        console.error('Error fetching clients:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchClients()
  }, [user?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl opacity-20 blur"></div>
        <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-emerald-400" />
              <div>
                <h2 className="text-2xl font-bold text-white">My Clients</h2>
                <p className="text-slate-400 text-sm">Interact with clients you referred</p>
              </div>
            </div>
            <div className="text-3xl font-bold text-emerald-400">{clients.length}</div>
          </div>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-xl">
          <Users className="h-16 w-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">No clients yet</p>
          <p className="text-sm text-slate-500">Share your referral link to bring clients to the platform</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <div 
              key={client.id}
              className="group relative"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl opacity-10 blur group-hover:opacity-30 transition"></div>
              <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                    {client.name?.charAt(0) || 'C'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{client.name}</p>
                    <p className="text-xs text-slate-400 truncate">{client.business_name || client.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {client.phone && (
                    <button
                      onClick={() => openWhatsAppWithNumber(client.phone, `Hi ${client.name}, this is your bridger from SSBNOW`)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 transition"
                    >
                      <Phone className="w-4 h-4 text-green-400" />
                      <span className="text-xs text-green-300">WhatsApp</span>
                    </button>
                  )}
                  <Link href={`/bridger/clients`} className="flex-1">
                    <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 transition">
                      <MessageCircle className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs text-cyan-300">Chat</span>
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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

function MyReferrals({ user }: { user: any }) {
  const [referrals] = useState<any[]>([])

  const referralLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/client/register?ref=${user?.id?.slice(0, 8) || 'bridger'}`

  return (
    <div className="space-y-6">
      {/* Referral Link Card - Bridgers invite Clients only */}
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition duration-500"></div>
        <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-2">Invite Clients</h3>
          <p className="text-slate-400 text-sm mb-4">As a Bridger, share this link to invite new Clients</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="flex-1 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
            />
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => navigator.clipboard.writeText(referralLink)}
            >
              Copy
            </Button>
          </div>
        </div>
      </div>

      {/* Referrals List */}
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition duration-500"></div>
        <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Users className="h-8 w-8 text-cyan-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">My Referrals</h2>
              <p className="text-slate-400 text-sm">Clients you have brought to the platform</p>
            </div>
          </div>
          
          {referrals.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 mb-2">No referrals yet</p>
              <p className="text-sm text-slate-500">Share your referral link to start earning</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {referrals.map((referral) => (
                <div key={referral.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-xl font-bold">
                      {referral.name?.charAt(0) || 'C'}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{referral.name}</h3>
                      <p className="text-xs text-slate-400">Joined: {referral.joined}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-slate-900/50 rounded p-2">
                      <p className="text-xs text-slate-500">Activity</p>
                      <p className="text-lg font-bold text-cyan-400">{referral.activity || 0}</p>
                    </div>
                    <div className="bg-slate-900/50 rounded p-2">
                      <p className="text-xs text-slate-500">Your Earnings</p>
                      <p className="text-lg font-bold text-emerald-400">{referral.earnings || 0} TRX</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
