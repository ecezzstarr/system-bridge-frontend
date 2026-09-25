'use client'

import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { LogOut, MessageCircle, Gamepad2, ShoppingBag, Users, Wallet, ArrowUpRight, ArrowDownLeft, Phone, Send, ArrowRight, CheckCheck, Trophy, Globe, AlertCircle, CreditCard, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { clearToken, getAuthHeaders } from '@/lib/auth-client'
import { RiverChat } from '@/components/river-chat'
import Arena from '@/components/places/arena'
import Casino from '@/components/places/casino'
import Lounge from '@/components/places/lounge'
import Link from 'next/link'
import { ExternalAppsNav, openWhatsAppWithNumber } from '@/components/external-apps-nav'
import { DailyProspectClaim } from '@/components/bridger/daily-prospect-claim'

type TabId = 'lounge' | 'arena' | 'casino' | 'wallet' | 'connect' | 'market' | 'clients' | 'prospects' | 'referrals'

export default function BridgerTerminal() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('lounge')
  const [recentClientChats, setRecentClientChats] = useState<any[]>([])
  const [loadingClientChats, setLoadingClientChats] = useState(true)
  const [subscription, setContinuance] = useState<any>(null)
  const [isSubLoading, setIsSubLoading] = useState(true)

  useEffect(() => {
    if (!user || user.role !== 'bridger') {
      router.push('/dashboard')
      return
    }

    fetchContinuance()

    // Fetch recent client chats
    const fetchRecentClientChats = async () => {
      if (!user?.id) return
      try {
        setLoadingClientChats(true)
        const token = localStorage.getItem('ssb_auth_token')
        const res = await fetch('/api/client/messages', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (res.ok) {
          const data = await res.json()
          setRecentClientChats(data.messages || data.summary || [])
        }
      } catch (e) {
        console.error('Failed to fetch recent client chats', e)
      } finally {
        setLoadingClientChats(false)
      }
    }
    fetchRecentClientChats()
    const interval = setInterval(fetchRecentClientChats, 15000)
    return () => clearInterval(interval)
  }, [user, router])

  const fetchContinuance = async () => {
    if (!user?.id) return
    setIsSubLoading(true)
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const res = await fetch('/api/bridger/subscription', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json()
      if (data.success) {
        setContinuance(data.continuance)
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error)
    } finally {
      setIsSubLoading(false)
    }
  }

  const handlePayContinuance = async () => {
    toast.info('Beginning the movement of ₦25,000...')
    // Mock payment flow
    setTimeout(async () => {
      try {
        const res = await fetch('/api/bridger/subscription', {
          method: 'POST',
          headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('ssb_auth_token') ? { Authorization: `Bearer ${localStorage.getItem('ssb_auth_token')}` } : {}),
        },
          body: JSON.stringify({
            userId: user?.id,
            amount: 25000,
            reference: `SUB-${Date.now()}`
          })
        })
        const data = await res.json()
        if (data.success) {
          toast.success('Continuance restored. One moment...')
          fetchContinuance()
        }
      } catch (error) {
        toast.error("That movement didn't complete.")
      }
    }, 2000)
  }

  if (!user || user.role !== 'bridger') {
    return null
  }

  const handleLogout = () => {
    logout()
    clearToken()
    router.push('/')
  }

  // Suspended State UI
  if (!isSubLoading && subscription?.subscription_status === 'suspended') {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4">
        <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-8 md:p-12 text-center shadow-2xl relative overflow-hidden text-white">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600" />
          
          <div className="flex justify-center mb-6">
            <div className="bg-red-500/10 p-4 rounded-full">
              <AlertCircle className="h-16 w-16 text-red-500 animate-pulse" />
            </div>
          </div>
          
          <h1 className="text-3xl font-black uppercase tracking-tighter mb-4">Access Suspended</h1>
          <p className="text-slate-400 max-w-lg mx-auto mb-8">
            Your Bridger partnership renewal is overdue. Your operational privileges within the Weave have been restricted until your continuance is restored.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto mb-10 text-left">
            <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
              <p className="text-red-400 font-bold">Overdue / Suspended</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Required Fee</p>
              <p className="text-white font-bold">₦25,000.00 NGN</p>
            </div>
          </div>
          
          <Button 
            onClick={handlePayContinuance}
            className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest h-14 px-10 rounded-xl shadow-lg shadow-red-900/20 group"
          >
            <CreditCard className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
            Pay & Activate Terminal
          </Button>
          
          <div className="mt-8">
            <button onClick={handleLogout} className="text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">
              Sign Out of Terminal
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isSubLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <Loader2 className="h-12 w-12 text-emerald-500 animate-spin mb-4 opacity-20" />
        <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">Syncing Weave Node...</p>
      </div>
    )
  }

  const tabs = [
    { id: 'lounge' as TabId, label: 'Lounge', icon: <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'connect' as TabId, label: 'Connect', icon: <Phone className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'arena' as TabId, label: 'Arena', icon: <Gamepad2 className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'casino' as TabId, label: 'Casino', icon: <Trophy className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'wallet' as TabId, label: 'Wallet', icon: <Wallet className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'clients' as TabId, label: 'Clients', icon: <Users className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'prospects' as TabId, label: 'Prospects', icon: <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'referrals' as TabId, label: 'Invite', icon: <Users className="h-4 w-4 sm:h-5 sm:w-5" /> },
  ]

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 mb-1">
            Your Presence in the Weave
          </h1>
          <p className="text-slate-400 text-sm">Welcome back, {user.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <ExternalAppsNav userRole="bridger" />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
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
          <p className="text-xs text-slate-500 mb-1">Next Billing</p>
          <p className="text-2xl font-bold text-orange-400">
            {subscription?.subscription_expiry 
              ? new Date(subscription.subscription_expiry).toLocaleDateString()
              : 'N/A'}
          </p>
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
        {activeTab === 'casino' && <Casino />}
        {activeTab === 'wallet' && <WalletSection user={user} />}
        {activeTab === 'clients' && <MyClients user={user} />}
        {activeTab === 'prospects' && (
          <div className="space-y-6">
            <DailyProspectClaim />
            <MyProspects />
          </div>
        )}
        {activeTab === 'referrals' && <MyReferrals user={user} />}
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

      {/* Participation Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div 
          onClick={() => (window.location.hash = 'arena')} 
          className="group relative cursor-pointer"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6 hover:border-yellow-500/50 transition flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Globe className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Join Arena</h3>
              <p className="text-sm text-slate-400">Compete for TRX</p>
            </div>
          </div>
        </div>
        <div 
          onClick={() => (window.location.hash = 'casino')} 
          className="group relative cursor-pointer"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6 hover:border-purple-500/50 transition flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Trophy className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Play Casino</h3>
              <p className="text-sm text-slate-400">Test your pattern</p>
            </div>
          </div>
        </div>
      </div>

      {/* Client Onboarding - File Numbers are issued by Admin, tied to your Bridger ID */}
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition"></div>
        <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-2">Bringing in Clients</h3>
          <p className="text-sm text-slate-400">
            New Clients enter WEAVE through a File Number issued by Administration and tied to you as their Bridger.
            Once a prospective Client is ready, ask Administration to generate a File Number assigned to you —
            the Client will use it to register at <span className="text-purple-400 font-mono">/client/register</span>.
          </p>
        </div>
      </div>
    </div>
  )
}

function MyClients({ user }: { user: any }) {
  const [clients, setClients] = useState<any[]>([])
  const [summaries, setSummaries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [activePosition, setActivePosition] = useState('bridger')
  const [messages, setMessages] = useState<any[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const positions = [
    { id: 'bridger', label: 'Bridger', icon: '🌉' },
  ]

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return
      try {
        const results = await Promise.allSettled([
          fetch('/api/bridger/clients', {
            headers: localStorage.getItem('ssb_auth_token')
              ? { Authorization: `Bearer ${localStorage.getItem('ssb_auth_token')}` }
              : {},
          }),
          fetch('/api/client/messages', {
            headers: localStorage.getItem('ssb_auth_token')
              ? { Authorization: `Bearer ${localStorage.getItem('ssb_auth_token')}` }
              : {},
          })
        ])
        
        if (results[0].status === 'fulfilled') {
          const res = results[0].value
          const data = await res.json()
          setClients(data.clients || [])
        } else {
          console.error('Error fetching clients:', results[0].reason)
        }

        if (results[1].status === 'fulfilled') {
          const res = results[1].value
          const data = await res.json()
          setSummaries(data.summary || [])
        } else {
          console.error('Error fetching summaries:', results[1].reason)
        }
      } catch (error) {
        console.error('General error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()

    // Refresh summaries periodically
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [user?.id])

  useEffect(() => {
    if (selectedClient) {
      fetchMessages(selectedClient.id, activePosition)
      const interval = setInterval(() => fetchMessages(selectedClient.id, activePosition, true), 4000)
      return () => clearInterval(interval)
    }
  }, [selectedClient, activePosition])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchMessages = async (clientId: string, position: string, silent = false) => {
    if (!silent) setChatLoading(true)
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch(`/api/client/messages?clientId=${clientId}&position=${encodeURIComponent(position)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      const data = await response.json()
      if (data.success) {
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    } finally {
      if (!silent) setChatLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedClient || isSending) return
    setIsSending(true)
    const content = messageInput.trim()
    setMessageInput('')
    try {
      const response = await fetch('/api/client/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient.id,
          clientName: selectedClient.name,
          position: activePosition,
          content,
          senderType: 'admin',
        }),
      })
      const data = await response.json()
      if (data.success && data.message) {
        setMessages(prev => [...prev, data.message])
      }
    } catch (error) {
      console.error('Failed to send:', error)
      setMessageInput(content)
    } finally {
      setIsSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
      </div>
    )
  }

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden flex flex-col md:flex-row h-[600px]">
      {/* Sidebar - Client List */}
      <div className="w-full md:w-80 border-r border-slate-800 flex flex-col bg-slate-950/20">
        <div className="p-4 border-b border-slate-800 bg-slate-900/20">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">My Clients</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {clients.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <p className="text-sm">No clients yet</p>
            </div>
          ) : (
            clients.map((client) => {
              const clientSummaries = summaries.filter(s => s.client_id === client.id)
              const totalUnread = clientSummaries.reduce((acc, s) => acc + (parseInt(s.unread_count) || 0), 0)
              
              return (
                <button
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className={`w-full p-4 border-b border-slate-800/50 transition text-left flex items-center gap-3 ${
                    selectedClient?.id === client.id ? 'bg-emerald-500/10' : 'hover:bg-slate-800/30'
                  }`}
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold shrink-0">
                      {client.name?.charAt(0) || 'C'}
                    </div>
                    {totalUnread > 0 && (
                      <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900">
                        {totalUnread}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-white truncate">{client.name}</p>
                    <p className="text-xs text-slate-500 truncate">{client.business_name}</p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-950/40 relative">
        {selectedClient ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/40">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-white">
                    {selectedClient.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{selectedClient.name}</h4>
                    <p className="text-xs text-slate-500">{selectedClient.business_name}</p>
                  </div>
                </div>
                
                <div className="flex gap-1 bg-slate-950/40 p-1 rounded-xl border border-slate-800">
                  {positions.map(pos => (
                    <button
                      key={pos.id}
                      onClick={() => setActivePosition(pos.id)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                        activePosition === pos.id 
                          ? 'bg-emerald-500 text-black' 
                          : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                      }`}
                      title={pos.label}
                    >
                      {pos.icon} {pos.label}
                    </button>
                  ))}
                </div>

                {selectedClient.phone && (
                   <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-green-400 hover:text-green-300 hover:bg-green-400/10"
                    onClick={() => openWhatsAppWithNumber(selectedClient.phone)}
                   >
                     <Phone className="w-4 h-4 mr-2" /> WhatsApp
                   </Button>
                )}
              </div>
              
              {/* Context Header */}
              <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{positions.find(p => p.id === activePosition)?.icon}</span>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">{activePosition} Service Channel</span>
                </div>
                <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                  Connection → Clarity → Action → Execution → Confirmation → Elevation
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatLoading && messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                  <MessageCircle className="w-12 h-12 mb-4" />
                  <p>No messages in Bridger context</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] ${msg.sender_type === 'admin' ? 'order-2' : 'order-1'}`}>
                      <div className={`rounded-2xl px-4 py-2 text-sm ${
                        msg.sender_type === 'admin' ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-100 rounded-bl-none'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-slate-500">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {msg.sender_type === 'admin' && (
                          <CheckCheck className={`h-3 w-3 ${msg.is_read ? 'text-emerald-400' : ''}`} />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/60">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Reply to client..."
                  className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  disabled={isSending}
                />
                <Button 
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || isSending}
                  className="bg-emerald-600 hover:bg-emerald-700 rounded-xl shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-50">
            <Users className="w-16 h-16 mb-4 text-slate-700" />
            <h3 className="text-lg font-bold text-white mb-2">Select a Client</h3>
            <p className="text-sm text-slate-400 max-w-xs">Select a client from the list to start chatting and providing support.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function MyProspects() {
  const [view, setView] = useState<'inbox' | 'market'>('inbox')
  const [threads, setThreads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedThread, setSelectedThread] = useState<any>(null)
  const [activePosition, setActivePosition] = useState('bridger')
  const [messages, setMessages] = useState<any[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)
  const [packages, setPackages] = useState<any[]>([])
  const [purchasingId, setPurchasingId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const positions = [
    { id: 'bridger', label: 'Bridger', icon: '🌉' },
  ]

  const fetchThreads = async () => {
    try {
      const res = await fetch('/api/bridger/support-inbox', { headers: getAuthHeaders() })
      const data = await res.json()
      if (data.success) setThreads(data.threads || [])
    } catch (error) {
      console.error('Error fetching prospect threads:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPackages = async () => {
    try {
      const res = await fetch('/api/market/prospects', { headers: getAuthHeaders() })
      const data = await res.json()
      if (data.success) setPackages(data.packages || [])
    } catch (error) {
      console.error('Error fetching packages:', error)
    }
  }

  useEffect(() => {
    fetchThreads()
    fetchPackages()
    const interval = setInterval(() => {
      fetchThreads()
      fetchPackages()
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selectedThread) {
      fetchMessages(selectedThread.sessionId, activePosition)
      const interval = setInterval(() => fetchMessages(selectedThread.sessionId, activePosition, true), 4000)
      return () => clearInterval(interval)
    }
  }, [selectedThread, activePosition])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchMessages = async (sessionId: string, position: string, silent = false) => {
    if (!silent) setChatLoading(true)
    try {
      const res = await fetch(`/api/bridger/support-inbox?sessionId=${sessionId}&position=${position}`, { headers: getAuthHeaders() })
      const data = await res.json()
      if (data.success) setMessages(data.messages || [])
    } catch (error) {
      console.error('Failed to fetch prospect messages:', error)
    } finally {
      if (!silent) setChatLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedThread || isSending) return
    setIsSending(true)
    const content = messageInput.trim()
    setMessageInput('')
    try {
      const res = await fetch('/api/bridger/support-inbox', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sessionId: selectedThread.sessionId, content, position: activePosition }),
      })
      const data = await res.json()
      if (data.success && data.message) {
        setMessages(prev => [...prev, data.message])
      }
    } catch (error) {
      console.error('Failed to send reply:', error)
      setMessageInput(content)
    } finally {
      setIsSending(false)
    }
  }

  const handlePurchasePackage = async (packageId: string) => {
    setPurchasingId(packageId)
    try {
      const res = await fetch('/api/market/prospects/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ packageId }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Purchased package! ${data.contacts?.length || 0} prospects added to your outreach.`)
        fetchPackages()
        fetchThreads()
        setView('inbox')
      } else {
        toast.error(data.error || 'Purchase failed')
      }
    } catch (error) {
      toast.error('Network error during purchase')
    } finally {
      setPurchasingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-400"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex bg-slate-900/60 p-1 rounded-2xl border border-slate-800 w-fit">
        <button
          onClick={() => setView('inbox')}
          className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
            view === 'inbox' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Outreach Inbox
        </button>
        <button
          onClick={() => setView('market')}
          className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
            view === 'market' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Prospect Market
        </button>
      </div>

      {view === 'market' ? (
        <div className="group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition duration-500"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6 min-h-[400px]">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Prospect Marketplace</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Acquire verified contacts for your network</p>
              </div>
            </div>

            {packages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
                <ShoppingBag className="h-16 w-16 mb-4 text-slate-600" />
                <p className="text-slate-400 font-bold uppercase tracking-widest">No packages available</p>
                <p className="text-[10px] text-slate-500 mt-1 max-w-xs">Administration will publish new prospect packages as they are generated.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {packages.map((pkg) => (
                  <div key={pkg.id} className="bg-slate-950/40 border border-slate-800 rounded-3xl p-6 hover:border-emerald-500/30 transition-all group/card">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Verified Pack</div>
                      <div className="text-right">
                        <p className="text-xl font-black text-white leading-none">{pkg.price_trx} <span className="text-[10px] text-emerald-500">TRX</span></p>
                      </div>
                    </div>
                    <h3 className="text-white font-bold mb-2">{pkg.title}</h3>
                    <p className="text-xs text-slate-500 mb-6 leading-relaxed line-clamp-3">{pkg.description}</p>
                    <Button
                      onClick={() => handlePurchasePackage(pkg.id)}
                      disabled={purchasingId === pkg.id}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest h-12 rounded-xl group-hover/card:scale-[1.02] transition-transform"
                    >
                      {purchasingId === pkg.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Purchase Access'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Inbox View */
        <div className="group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition duration-500"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl overflow-hidden flex h-[600px]">
            <div className="w-72 border-r border-slate-800 flex flex-col overflow-y-auto shrink-0">
              <div className="p-4 border-b border-slate-800">
                <h2 className="text-lg font-bold text-white uppercase tracking-tighter">Support Inbox</h2>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Active Outreach Sessions</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {threads.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-sm italic">No active outreach threads</div>
                ) : (
                  threads.map((t) => (
                    <div
                      key={t.sessionId}
                      onClick={() => setSelectedThread(t)}
                      className={`p-4 border-b border-slate-800/50 cursor-pointer transition ${
                        selectedThread?.sessionId === t.sessionId ? 'bg-emerald-500/10 border-l-4 border-l-emerald-500' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono font-bold text-emerald-400">{t.bridgeCode}</span>
                        {t.unreadCount > 0 && (
                          <span className="text-[10px] font-black bg-orange-500 text-white rounded-full px-1.5 py-0.5 shadow-lg shadow-orange-900/20">{t.unreadCount}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate font-medium">{t.lastMessage}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {selectedThread ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-0.5">Session Terminal</p>
                    <p className="text-sm font-bold text-white">{selectedThread.bridgeCode}</p>
                  </div>
                  
                  <div className="flex gap-1 bg-slate-950/40 p-1 rounded-xl border border-slate-800">
                    {positions.map(pos => (
                      <button
                        key={pos.id}
                        onClick={() => setActivePosition(pos.id)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                          activePosition === pos.id 
                            ? 'bg-emerald-500 text-black' 
                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                        }`}
                        title={pos.label}
                      >
                        {pos.icon}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Movement Label */}
                <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{positions.find(p => p.id === activePosition)?.icon}</span>
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">{activePosition} Service Channel</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                    Connection → Clarity → Action → Execution → Confirmation → Elevation
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/20">
                  {chatLoading && messages.length === 0 ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-6 w-6 text-emerald-500 animate-spin opacity-20" />
                    </div>
                  ) : (
                    messages.map((m) => (
                      <div key={m.id} className={`flex ${m.senderType === 'staff' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                            m.senderType === 'staff' ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Reply to prospect..."
                    className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    disabled={isSending}
                  />
                  <Button
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || isSending}
                    className="bg-emerald-600 hover:bg-emerald-700 rounded-xl shrink-0 h-10 w-10 shadow-lg shadow-emerald-900/20"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-30">
                <div className="bg-slate-800/50 p-6 rounded-full mb-6">
                  <MessageCircle className="w-12 h-12 text-slate-600" />
                </div>
                <h3 className="text-lg font-bold text-white uppercase tracking-widest mb-2">Select a Terminal</h3>
                <p className="text-xs text-slate-500 max-w-xs font-medium">Select a prospect outreach session from the left to engage in direct terminal communications.</p>
              </div>
            )}
          </div>
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
  const [bridgerReferral, setBridgerReferral] = useState<any>(null)
  const [loadingBridgerReferral, setLoadingBridgerReferral] = useState(true)
  const [copied, setCopied] = useState(false)
  const [referralError, setReferralError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBridgerReferral = async () => {
      try {
        const token = localStorage.getItem('ssb_auth_token')
        const res = await fetch('/api/bridger/referral-commissions', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const data = await res.json().catch(() => null)
        if (res.ok && data?.success) {
          setBridgerReferral(data)
        } else {
          setReferralError(`Failed to load (status ${res.status}): ${data?.error || 'unknown error'}`)
        }
      } catch (e: any) {
        setReferralError(`Network error: ${e?.message || 'unknown'}`)
      } finally {
        setLoadingBridgerReferral(false)
      }
    }
    fetchBridgerReferral()
  }, [])

  const fullReferralLink = bridgerReferral
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}${bridgerReferral.referralLink}`
    : ''

  const handleCopyLink = async () => {
    if (!fullReferralLink) return
    try {
      await navigator.clipboard.writeText(fullReferralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error('Copy failed', e)
    }
  }

  return (
    <div className="space-y-6">
      {/* Refer a Bridger - earn 20% commission on their arena/casino/prospect activity */}
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition duration-500"></div>
        <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="h-8 w-8 text-emerald-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">Refer a Bridger</h2>
              <p className="text-slate-400 text-sm">Earn 30% commission on their arena, casino, and marketplace activity</p>
            </div>
          </div>

          {loadingBridgerReferral ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : referralError ? (
            <p className="text-sm text-red-400">{referralError}</p>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                  readOnly
                  value={fullReferralLink}
                  className="flex-1 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 font-mono truncate"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  onClick={handleCopyLink}
                  className="flex-shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
                >
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Bridgers Referred</p>
                  <p className="text-xl font-bold text-cyan-400">{bridgerReferral?.referralCount ?? 0}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Referral Earnings</p>
                  <p className="text-xl font-bold text-emerald-400">{bridgerReferral?.referralEarnings ?? 0} TRX</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Client Onboarding - File Numbers are issued by Admin, tied to your Bridger ID */}
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition duration-500"></div>
        <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-2">Bringing in Clients</h3>
          <p className="text-slate-400 text-sm">
            New Clients enter WEAVE through a File Number issued by Administration and tied to you as their Bridger.
            Ask Administration to generate a File Number assigned to you for each prospective Client —
            they'll use it to register at <span className="text-emerald-400 font-mono">/client/register</span>.
          </p>
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
