'use client'

import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Users, LogOut, MessageCircle, Gamepad2, Wallet, ArrowUpRight, ArrowDownLeft, Phone } from 'lucide-react'
import { clearToken } from '@/lib/auth-client'
import { RiverChat } from '@/components/river-chat'
import { NotificationBell } from '@/components/notification-bell'
import Arena from '@/components/places/arena'
import Lounge from '@/components/places/lounge'
import Link from 'next/link'
import { BridgePlazaEarningsAd } from '@/components/agent/bridge-plaza-earnings-ad'

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
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 xl:flex-row">
            <div className="min-w-0 flex-1">
              <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h1 className="mb-1 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-3xl font-bold text-transparent md:text-4xl">Agent Dashboard</h1>
                  <p className="text-sm text-slate-400">Welcome back, {user.name}</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <NotificationBell />
                  <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-400 hover:text-white">
                    <LogOut className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Logout</span>
                  </Button>
                </div>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="mb-1 text-xs text-slate-500">My Bridgers</p>
                  <p className="text-2xl font-bold text-cyan-400">0/3</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="mb-1 text-xs text-slate-500">Platform Balance</p>
                  <p className="text-2xl font-bold text-emerald-400">{user.platform_wallet_balance || 0} TRX</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="mb-1 text-xs text-slate-500">Escrow Balance</p>
                  <p className="text-2xl font-bold text-yellow-400">{user.escrow_balance || 0} TRX</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="mb-1 text-xs text-slate-500">Department</p>
                  <p className="text-2xl font-bold text-purple-400">{user.departmental_code || 'N/A'}</p>
                </div>
              </div>

              <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-700 pb-px sm:gap-2">
                {tabs.map((tab) => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 whitespace-nowrap px-3 py-3 text-sm font-semibold transition-all sm:px-4 sm:text-base ${activeTab === tab.id ? 'border-b-2 border-cyan-400 text-cyan-400' : 'text-slate-400 hover:text-slate-300'}`}>
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-6">
                {activeTab === 'lounge' && <Lounge />}
                {activeTab === 'connect' && <AgentConnectSection />}
                {activeTab === 'arena' && <Arena />}
                {activeTab === 'wallet' && <WalletSection user={user} />}
                {activeTab === 'team' && <MyBridgers />}
              </div>
            </div>

            <div className="w-full shrink-0 xl:sticky xl:top-6 xl:block xl:w-80 xl:self-start">
              <BridgePlazaEarningsAd />
            </div>
          </div>
        </div>
      </div>
      <RiverChat />
    </div>
  )
}

function AgentConnectSection() {
  const openWhatsApp = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile) window.location.href = 'whatsapp://send'
    else window.open('https://web.whatsapp.com/', '_blank')
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="group relative">
        <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 opacity-20 blur group-hover:opacity-40"></div>
        <div className="relative rounded-xl border border-slate-700 bg-slate-900/80 p-4 backdrop-blur-xl sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 sm:h-14 sm:w-14"><span className="text-xl text-green-400">WA</span></div>
            <div><h3 className="text-xl font-bold text-white sm:text-2xl">WhatsApp Business</h3><p className="text-xs text-slate-400 sm:text-sm">Connect with your team & bridgers</p></div>
          </div>
          <button onClick={openWhatsApp} className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-base font-bold text-white transition hover:bg-green-700 sm:py-4 sm:text-lg">Open WhatsApp</button>
        </div>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:p-6"><p className="text-center text-xs text-slate-400 sm:text-sm">As an Agent, you connect with your Bridgers and team through WhatsApp.</p></div>
    </div>
  )
}

function WalletSection({ user }: { user: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="group relative"><div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 opacity-30 blur"></div><div className="relative rounded-xl border border-slate-700 bg-slate-900/80 p-6"><p className="mb-2 text-sm text-slate-400">Platform Balance</p><p className="text-4xl font-bold text-cyan-400">{user.platform_wallet_balance || 0} TRX</p></div></div>
        <div className="group relative"><div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 opacity-30 blur"></div><div className="relative rounded-xl border border-slate-700 bg-slate-900/80 p-6"><p className="mb-2 text-sm text-slate-400">Escrow Balance</p><p className="text-4xl font-bold text-yellow-400">{user.escrow_balance || 0} TRX</p></div></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Link href="/wallet/deposit-withdraw"><div className="cursor-pointer rounded-xl border border-slate-700 bg-slate-900/80 p-6"><div className="flex items-center gap-4"><ArrowDownLeft className="h-6 w-6 text-green-400" /><div><h3 className="text-lg font-bold text-white">Deposit</h3><p className="text-sm text-slate-400">Add funds via Flutterwave</p></div></div></div></Link>
        <Link href="/wallet/deposit-withdraw"><div className="cursor-pointer rounded-xl border border-slate-700 bg-slate-900/80 p-6"><div className="flex items-center gap-4"><ArrowUpRight className="h-6 w-6 text-red-400" /><div><h3 className="text-lg font-bold text-white">Withdraw</h3><p className="text-sm text-slate-400">Send to TRON wallet</p></div></div></div></Link>
      </div>
      <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-6"><h3 className="mb-2 text-lg font-bold text-white">Invite Bridgers</h3><p className="mb-4 text-sm text-slate-400">As an Agent, you invite and manage Bridgers.</p><div className="flex gap-2"><input type="text" value={`${typeof window !== 'undefined' ? window.location.origin : ''}/register?ref=${user?.id?.slice(0, 8) || ''}&role=bridger`} readOnly className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-white" /><Button className="bg-purple-600 hover:bg-purple-700" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/register?ref=${user?.id?.slice(0, 8) || ''}&role=bridger`)}>Copy</Button></div></div>
    </div>
  )
}

function MyBridgers() {
  const { user } = useAuth()
  const [bridgers, setBridgers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`/api/agent/bridgers?agentId=${user?.id}`)
        const data = await response.json()
        setBridgers(data.bridgers || [])
      } catch { setBridgers([]) } finally { setLoading(false) }
    }
    if (user?.id) load()
  }, [user?.id])
  if (loading) return <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-slate-400">Loading Bridgers...</div>
  return <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6"><h2 className="mb-4 text-xl font-bold text-white">My Bridgers</h2>{bridgers.length === 0 ? <p className="text-sm text-slate-400">No Bridgers assigned yet.</p> : <div className="space-y-3">{bridgers.map((bridger) => <div key={bridger.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-4"><p className="font-semibold text-white">{bridger.name}</p><p className="text-xs text-slate-500">{bridger.presence || 'offline'}</p></div>)}</div>}</div>
}
