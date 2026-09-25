'use client'

import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { LogOut, MessageCircle, Gamepad2, ShoppingBag, Wallet, ArrowUpRight, ArrowDownLeft, Phone, Trophy, Globe } from 'lucide-react'
import { clearToken } from '@/lib/auth-client'
import { WeaveAssistant, type ChecklistItem } from '@/components/weave-assistant'
import Arena from '@/components/places/arena'
import Casino from '@/components/places/casino'
import Lounge from '@/components/places/lounge'
import Link from 'next/link'
import {
  AgilityAgentLoginAd,
  AGILITY_AGENT_LOGIN_AD_KEY,
} from '@/components/agility-agent-login-ad'
import {
  Loop1AgentLoginAd,
  LOOP1_AGENT_LOGIN_AD_KEY,
} from '@/components/agent/loop1-agent-login-ad'
import { getAuthHeaders } from '@/lib/auth-client'

type TabId = 'lounge' | 'connect' | 'arena' | 'casino' | 'market' | 'wallet'

export default function AgentTerminal() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('lounge')
  const [showLoop1Ad, setShowLoop1Ad] = useState(false)
  const [showAgilityAd, setShowAgilityAd] = useState(false)
  const [agilityAdQueued, setAgilityAdQueued] = useState(false)
  const [salary, setYield] = useState<{ tier: number; salary: number; activeCount: number } | null>(null)
  const [bridgerCount, setBridgerCount] = useState(0)
  const [commissions, setCommissions] = useState<{ commissionRate: number; totalEarnings: number; recentCommissions: any[] } | null>(null)

  useEffect(() => {
    if (!user?.id) return
    fetch(`/api/agent/salary?agentId=${user.id}`)
      .then(r => r.json())
      .then(d => { if (d.success) setYield(d) })
      .catch(() => {})
    fetch('/api/agent/bridgers', { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => setBridgerCount(d.count || 0))
      .catch(() => {})
    fetch('/api/agent/commissions', { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => { if (d.success) setCommissions(d) })
      .catch(() => {})
  }, [user?.id])

  useEffect(() => {
    if (!user || user.role !== 'agent') {
      router.push('/dashboard')
      return
    }

    const wantsLoop1Ad = sessionStorage.getItem(LOOP1_AGENT_LOGIN_AD_KEY) === '1'
    const wantsAgilityAd = sessionStorage.getItem(AGILITY_AGENT_LOGIN_AD_KEY) === '1'

    if (wantsLoop1Ad) sessionStorage.removeItem(LOOP1_AGENT_LOGIN_AD_KEY)
    if (wantsAgilityAd) sessionStorage.removeItem(AGILITY_AGENT_LOGIN_AD_KEY)

    if (wantsLoop1Ad) {
      setShowLoop1Ad(true)
      setAgilityAdQueued(wantsAgilityAd)
    } else if (wantsAgilityAd) {
      setShowAgilityAd(true)
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

  const checklist: ChecklistItem[] = []
  checklist.push({
    id: 'agility-tutorial',
    label: 'How does Agility work?',
    detail: 'Open the WEAVE-assisted tutorial for ordering, OPay verification, delivery, Retailer/Wholesaler selling and profit tracking.',
    actLabel: 'Open tutorial',
    onAct: () => router.push('/agility?tutorial=1'),
  })
  checklist.push({
    id: 'loop-1',
    label: 'Support Bridgers to close Loop 1',
    detail: 'Agents earn 30% on lead purchases and 5% of Weave\'s 40% (716 Flame Coin) on Client crossings.',
    actLabel: 'View Bridgers',
    onAct: () => router.push('/agent/bridgers'),
  })

  if (commissions && commissions.recentCommissions.length > 0) {
    const latest = commissions.recentCommissions[0]
    checklist.push({
      id: 'commission-earned',
      label: `+${latest.amount.toFixed(2)} Flame Coin commission credited`,
      detail: latest.description,
      actLabel: 'View wallet',
      onAct: () => setActiveTab('wallet'),
    })
  }
  if (!commissions || commissions.totalEarnings === 0) {
    checklist.push({
      id: 'no-earnings-yet',
      label: 'No commission earned yet',
      detail: 'Earnings start flowing once your Bridgers purchase leads or their clients purchase File Folders.',
      done: true,
    })
  }

  const tabs = [
    { id: 'lounge' as TabId, label: 'Lounge', icon: <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'connect' as TabId, label: 'Connect', icon: <Phone className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'arena' as TabId, label: 'Arena', icon: <Gamepad2 className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'casino' as TabId, label: 'Casino', icon: <Trophy className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'wallet' as TabId, label: 'Wallet', icon: <Wallet className="h-4 w-4 sm:h-5 sm:w-5" /> },
  ]

  return (
    <>
      <Loop1AgentLoginAd
        open={showLoop1Ad}
        onOpenChange={(open) => {
          setShowLoop1Ad(open)
          if (!open && agilityAdQueued) {
            setAgilityAdQueued(false)
            setShowAgilityAd(true)
          }
        }}
        onOpenContinuance={() => {
          setShowLoop1Ad(false)
          router.push('/agent/commissions')
        }}
      />

      <AgilityAgentLoginAd
        open={showAgilityAd}
        onOpenChange={setShowAgilityAd}
        onBuy={() => {
          setShowAgilityAd(false)
          router.push('/agility')
        }}
      />
      <div className="max-w-7xl mx-auto pb-20 sm:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 mb-1">
            Your Presence in the Weave
          </h1>
          <p className="text-slate-400 text-sm">Welcome back, {user.name}</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl p-4 border" style={{ background: 'var(--field-surface)', borderColor: 'var(--field-border)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--muted-foreground)' }}>My Bridgers</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--secondary)' }}>{bridgerCount}/3</p>
        </div>
        <div className="rounded-xl p-4 border" style={{ background: 'var(--field-surface)', borderColor: 'var(--field-border)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--muted-foreground)' }}>Platform Balance</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--success)' }}>{user.platform_wallet_balance || 0} Flame Coin</p>
        </div>
        <div className="rounded-xl p-4 border" style={{ background: 'var(--field-surface)', borderColor: 'var(--field-border)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--muted-foreground)' }}>Escrow Balance</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--warning)' }}>{user.escrow_balance || 0} Flame Coin</p>
        </div>
        <div className="rounded-xl p-4 border" style={{ background: 'var(--field-surface)', borderColor: 'var(--field-border)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--muted-foreground)' }}>Department</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{user.departmental_code || 'N/A'}</p>
        </div>
      </div>

      {/* Loop 1 Earning Card */}
      <div className="mb-6 group relative">
        <div className="absolute -inset-0.5 rounded-xl opacity-30 blur" style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}></div>
        <div className="relative rounded-xl p-6 flex items-center justify-between flex-wrap gap-4 border backdrop-blur-xl" style={{ background: 'var(--popover)', borderColor: 'var(--field-border)' }}>
          <div>
            <p className="text-sm mb-1" style={{ color: 'var(--muted-foreground)' }}>Total Loop 1 Earnings</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--success)' }}>
              {commissions ? `${commissions.totalEarnings.toFixed(2)} Flame Coin` : '—'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Active bridgers</p>
            <p className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>{bridgerCount}</p>
            <p className="text-[10px] mt-1" style={{ color: 'var(--muted-foreground)' }}>
              Closing the movement of human participation
            </p>
          </div>
        </div>
      </div>

      {/* Agility Agent Store */}
      <Link href="/agility" className="mb-6 block group">
        <div className="relative overflow-hidden rounded-xl border border-orange-400/20 bg-gradient-to-r from-orange-500/10 via-amber-400/5 to-transparent p-5 transition group-hover:border-orange-300/40">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-orange-400/10 blur-2xl" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-400/10 text-orange-300">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">Agent Store · Morning Food</p>
                <h2 className="mt-1 text-lg font-bold text-white">Agility — Intelligence in Action</h2>
                <p className="mt-1 text-xs text-slate-500">Buy Agility stock through the existing Weave OPay method: 10 packages per box, ₦28,000 Agent box price, ₦30,000 sell-out value, ₦2,000 gross Agent profit per box.</p>
              </div>
            </div>
            <ArrowUpRight className="hidden h-5 w-5 text-orange-300 sm:block" />
          </div>
        </div>
      </Link>

      {/* Tabs — top row on desktop, fixed bottom bar on mobile */}
      <div className="hidden sm:flex gap-2 mb-6 border-b overflow-x-auto pb-px" style={{ borderColor: 'var(--field-border)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-3 font-semibold transition-all whitespace-nowrap text-base"
            style={
              activeTab === tab.id
                ? { color: 'var(--primary)', borderBottom: '2px solid var(--primary)' }
                : { color: 'var(--muted-foreground)' }
            }
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t backdrop-blur-xl"
        style={{ borderColor: 'var(--field-border)', background: 'rgba(8, 9, 15, 0.92)' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-all"
            style={{ color: activeTab === tab.id ? 'var(--primary)' : 'var(--muted-foreground)' }}
          >
            {tab.icon}
            <span className="text-[9px] font-semibold uppercase tracking-wide">{tab.label}</span>
            {activeTab === tab.id && (
              <span className="absolute top-0 h-0.5 w-8 rounded-full" style={{ background: 'var(--primary)' }} />
            )}
          </button>
        ))}
      </div>
      {/* Spacer so content isn't hidden behind the fixed mobile bottom nav */}
      <div className="sm:hidden h-2" />

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'lounge' && <Lounge />}
        {activeTab === 'connect' && <AgentConnectSection />}
        {activeTab === 'arena' && <Arena />}
        {activeTab === 'casino' && <Casino />}
        {activeTab === 'wallet' && <WalletSection user={user} />}
      </div>

      <WeaveAssistant role="agent" checklist={checklist} />
      </div>
    </>
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
            <p className="text-4xl font-bold text-cyan-400">{user.platform_wallet_balance || 0} Flame Coin</p>
          </div>
        </div>
        <div className="group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl opacity-30 blur"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
            <p className="text-sm text-slate-400 mb-2">Escrow Balance</p>
            <p className="text-4xl font-bold text-yellow-400">{user.escrow_balance || 0} Flame Coin</p>
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
                  <p className="text-sm text-slate-400">Add funds via OPay</p>
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
              <p className="text-sm text-slate-400">Compete for Flame Coin</p>
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
            <p className="text-slate-400 text-sm">Buy and sell items with Flame Coin</p>
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
                <span className="text-lg font-bold text-white">{item.price} Flame Coin</span>
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
