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
  Plus
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
import Arena from '@/components/places/arena'
import Casino from '@/components/places/casino'
import Lounge from '@/components/places/lounge'
import { eightOperate, readScroll } from '@/lib/eight'
import { DepartmentalCodesSection } from '@/components/admin/departmental-codes-section'

type TabId = 'lounge' | 'arena' | 'casino' | 'wallet' | 'workshops' | 'panel' | 'eight'

export default function AdminTerminal() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('lounge')
  const [liveStats, setLiveStats] = useState<{ totalUsers: number; platformVaultTrx: number; escrowPoolTrx: number } | null>(null)

  useEffect(() => {
    if (!user || user.role !== 'admin') return
    fetch('/api/eight/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stats', payload: {} })
    })
      .then(res => res.json())
      .then(data => { if (data.success) setLiveStats(data.stats) })
      .catch(() => {})
  }, [user])

  useEffect(() => {
    // Handle hash navigation for direct links from sidebar
    const handleHash = () => {
      const hash = window.location.hash
      if (hash === '#panel' || hash === '#bridgers' || hash === '#users' || hash === '#sweeps') {
        setActiveTab('panel')
      } else if (hash === '#lounge') {
        setActiveTab('lounge')
      } else if (hash === '#arena') {
        setActiveTab('arena')
      } else if (hash === '#casino') {
        setActiveTab('casino')
      } else if (hash === '#wallet') {
        setActiveTab('wallet')
      } else if (hash === '#workshops') {
        setActiveTab('workshops')
      } else if (hash === '#eight') {
        setActiveTab('eight')
      }
    }

    handleHash()
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

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

  const tabs = [
    { id: 'lounge' as TabId, label: 'Lounge', icon: <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'arena' as TabId, label: 'Arena', icon: <Gamepad2 className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'casino' as TabId, label: 'Casino', icon: <Trophy className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'wallet' as TabId, label: 'Wallet', icon: <Wallet className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'workshops' as TabId, label: 'Admin Workshops', icon: <Code className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'panel' as TabId, label: 'Admin Panel', icon: <Shield className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: 'eight' as TabId, label: 'Eight AI', icon: <Terminal className="h-4 w-4 sm:h-5 sm:w-5" /> },
  ]

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 mb-1">
            The Keeping
          </h1>
          <p className="text-slate-400 text-sm">Ecosystem Authority: {user.name}</p>
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

      {/* Tabs */}
      <div className="flex gap-1 sm:gap-2 mb-6 border-b border-slate-700 overflow-x-auto pb-px scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-3 font-semibold transition-all whitespace-nowrap text-sm sm:text-base ${
              activeTab === tab.id
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="space-y-6">
        {activeTab === 'lounge' && <Lounge />}
        {activeTab === 'arena' && <Arena />}
        {activeTab === 'casino' && <Casino />}
        {activeTab === 'wallet' && <AdminWalletSection user={user} />}
        {activeTab === 'workshops' && <AdminWorkshopsSection />}
        {activeTab === 'panel' && <AdminPanelSection user={user} />}
        {activeTab === 'eight' && <EightAiSection user={user} />}
      </div>

      <RiverChat />
    </div>
  )
}

function AdminWalletSection({ user }: { user: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl opacity-30 blur"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
            <p className="text-sm text-slate-400 mb-2">Platform Master Balance</p>
            <p className="text-4xl font-bold text-purple-400">{user.platform_wallet_balance || 0} TRX</p>
          </div>
        </div>
        <div className="group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl opacity-30 blur"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
            <p className="text-sm text-slate-400 mb-2">Global Escrow Pool</p>
            <p className="text-4xl font-bold text-yellow-400">{user.escrow_balance || 0} TRX</p>
          </div>
        </div>
      </div>

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
                  <p className="text-sm text-slate-400">Origin Funding</p>
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
                  <p className="text-sm text-slate-400">Platform Outflow</p>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Participation Management */}
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
              <h3 className="text-lg font-bold text-white">Arena Control</h3>
              <p className="text-sm text-slate-400">Curate matches and pools</p>
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
              <h3 className="text-lg font-bold text-white">Casino Monitor</h3>
              <p className="text-sm text-slate-400">Observe pattern flow</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AdminWorkshopsSection() {
  const workshops = [
    {
      title: 'Developer Workshop',
      desc: 'System refinement layer for ecosystem operators. Build and refine origin systems.',
      icon: <Code className="h-10 w-10 text-purple-400" />,
      link: '/admin/workshop',
      tags: ['NEXT.JS 16', 'POSTGRES', 'GCLOUD'],
      color: 'from-purple-500 to-indigo-500'
    },
    {
      title: 'Authority Workshops',
      desc: 'Define and govern the core protocols and permissions of the WEAVE ecosystem.',
      icon: <Database className="h-10 w-10 text-emerald-400" />,
      link: '/admin/workshop',
      tags: ['PROTOCOL', 'GOVERNANCE', 'KEYS'],
      color: 'from-emerald-500 to-teal-500'
    },
    {
      title: 'AI Registry',
      desc: 'Manage and monitor all autonomous agents and AI entities active within the system.',
      icon: <Brain className="h-10 w-10 text-blue-400" />,
      link: '/admin/origin-systems',
      tags: ['AGENTS', 'REGISTRY', 'GEMINI'],
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'EIGHT Dev Core',
      desc: 'Direct interaction with Eight AI for system building and cross-stack development.',
      icon: <Terminal className="h-10 w-10 text-pink-400" />,
      link: '/admin/dev-workshop',
      tags: ['GEMINI 2.0', 'AI OPERATOR', 'CORE'],
      color: 'from-pink-500 to-purple-500'
    },
    {
      title: 'Flame Event Workshop',
      desc: 'Control the Flame Event advertisement, October 1 opening, Administration announcement, schedule and live state.',
      icon: <Flame className="h-10 w-10 text-orange-400" />,
      link: '/admin/flame-event',
      tags: ['EVENT', 'OCT 1', '4 POSITIONS'],
      color: 'from-orange-500 to-red-500'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="p-4 bg-slate-900/60 rounded-xl border border-purple-900/30 backdrop-blur-sm">
        <p className="text-xs text-purple-400 mb-3 font-bold uppercase tracking-wider">Navigate Ecosystem</p>
        <EcosystemNav currentSystem="dashboard" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {workshops.map((ws, i) => (
          <div key={i} className="group relative">
            <div className={`absolute -inset-0.5 bg-gradient-to-r ${ws.color} rounded-xl opacity-20 blur group-hover:opacity-40 transition duration-500`}></div>
            <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                {ws.icon}
                <Link href={ws.link}>
                  <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white group-hover:translate-x-1 transition-transform">
                    Open <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{ws.title}</h3>
              <p className="text-sm text-slate-400 mb-6 flex-1">{ws.desc}</p>
              <div className="flex gap-2">
                {ws.tags.map(tag => (
                  <span key={tag} className="text-[9px] bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700 font-bold tracking-tighter">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AdminPanelSection({ user }: { user: any }) {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'sweeps' | 'clients' | 'bridgers' | 'fne' | 'deposits' | 'tron' | 'bridge' | 'withdrawals' | 'announcements' | 'departmental'>('users')

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash
      if (hash === '#bridgers') setActiveSubTab('bridgers')
      else if (hash === '#users') setActiveSubTab('users')
      else if (hash === '#sweeps') setActiveSubTab('sweeps')
      else if (hash === '#clients') setActiveSubTab('clients')
      else if (hash === '#fne') setActiveSubTab('fne')
      else if (hash === '#deposits') setActiveSubTab('deposits')
      else if (hash === '#tron') setActiveSubTab('tron')
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
          onClick={() => setActiveSubTab('fne')}
          className={`pb-2 text-[10px] sm:text-sm font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'fne' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          File Number Engine
        </button>
        <button 
          onClick={() => setActiveSubTab('bridgers')}
          className={`pb-2 text-[10px] sm:text-sm font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'bridgers' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          Bridger Ops
        </button>
        <button 
          onClick={() => setActiveSubTab('sweeps')}
          className={`pb-2 text-[10px] sm:text-sm font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'sweeps' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          Sweeps
        </button>
        <button 
          onClick={() => setActiveSubTab('clients')}
          className={`pb-2 text-[10px] sm:text-sm font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'clients' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          Messages
        </button>
        <button 
          onClick={() => setActiveSubTab('deposits')}
          className={`pb-2 text-[10px] sm:text-sm font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'deposits' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          Deposits
        </button>
        <button 
          onClick={() => setActiveSubTab('tron')}
          className={`pb-2 text-[10px] sm:text-sm font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'tron' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          TRON Deposits
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
        {activeSubTab === 'fne' && <FileNumberEngineSection />}
        {activeSubTab === 'bridgers' && <BridgerManagementSection />}
        {activeSubTab === 'sweeps' && <FundSweepsSection user={user} />}
        {activeSubTab === 'clients' && <ClientMessagesPreview />}
        {activeSubTab === 'deposits' && <DepositApprovalSection user={user} />}
        {activeSubTab === 'tron' && <TronDepositApprovalSection user={user} />}
        {activeSubTab === 'bridge' && <BridgeDepositApprovalSection user={user} />}
        {activeSubTab === 'withdrawals' && <WithdrawalApprovalSection user={user} />}
        {activeSubTab === 'announcements' && <AnnouncementSection />}
      </div>
    </div>
  )
}

function FileNumberEngineSection() {
  const { user } = useAuth()
  const [bridgers, setBridgers] = useState<any[]>([])
  const [folders, setFolders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    bridgerId: '',
    name: '',
    phone: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [bridgersRes, foldersRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/admin/fne/list')
      ])
      
      const bridgersData = await bridgersRes.json()
      const foldersData = await foldersRes.json()
      
      const users = Array.isArray(bridgersData) ? bridgersData : bridgersData.users || []
      setBridgers(users.filter((u: any) => u.role === 'bridger' || u.role === 'agent' || u.role === 'admin'))
      setFolders(foldersData.folders || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('The registry did not open')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.bridgerId || !formData.name || !formData.phone) {
      toast.error('A few things are still needed')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/admin/fne/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, adminId: user?.id })
      })
      
      const result = await res.json()
      if (result.success) {
        toast.success(`Issued: ${result.fileFolder.file_number}`)
        setFormData({ bridgerId: '', name: '', phone: '' })
        fetchData()
      } else {
        toast.error(result.error || "That didn't issue")
      }
    } catch (error) {
      toast.error("That didn't issue")
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied')
  }

  return (
    <div className="p-4 space-y-8 text-white">
      <div className="flex items-center gap-4">
        <div className="bg-blue-600 p-2 rounded-lg">
          <FileBox className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold uppercase tracking-tight">File Number Engine</h3>
          <p className="text-xs text-slate-500 font-medium">Issue registration keys for new Weave clients.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-blue-400 mb-4 flex items-center gap-2">
              <UserPlus className="h-3 w-3" /> Issue New Folder
            </h4>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Select Bridger</label>
                <Select 
                  value={formData.bridgerId} 
                  onValueChange={(val) => setFormData({...formData, bridgerId: val})}
                >
                  <SelectTrigger className="bg-slate-900/50 border-slate-700 h-9 text-xs">
                    <SelectValue placeholder="Select bridger" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    {bridgers.map((b) => (
                      <SelectItem key={b.id} value={b.id} className="text-xs">
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Client Identity Name</label>
                <Input 
                  placeholder="Full Name" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="bg-slate-900/50 border-slate-700 h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Contact (WhatsApp)</label>
                <Input 
                  placeholder="+123..." 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="bg-slate-900/50 border-slate-700 h-9 text-xs"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 h-10 font-bold uppercase text-[10px] tracking-widest" 
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate Key'}
              </Button>
            </form>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="bg-slate-800/40 border border-slate-700 rounded-xl overflow-hidden">
            <div className="p-3 border-b border-slate-700 bg-slate-800/20">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Registry History</h4>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-slate-900/50">
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-[9px] font-black uppercase py-2">File Number</TableHead>
                    <TableHead className="text-[9px] font-black uppercase py-2">Identity</TableHead>
                    <TableHead className="text-[9px] font-black uppercase py-2">Status</TableHead>
                    <TableHead className="text-right text-[9px] font-black uppercase py-2">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto opacity-20" /></TableCell>
                    </TableRow>
                  ) : folders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-slate-500 text-xs italic">No folders issued yet.</TableCell>
                    </TableRow>
                  ) : (
                    folders.map((folder) => (
                      <TableRow key={folder.id} className="border-slate-800 hover:bg-slate-800/40 transition-colors text-white">
                        <TableCell className="font-mono text-[10px] font-bold text-blue-400">{folder.file_number}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold uppercase">{folder.identity_data.name}</span>
                            <span className="text-[9px] text-slate-500 font-mono">{folder.identity_data.phone}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${
                            folder.status === 'pending' 
                              ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' 
                              : 'bg-green-500/10 text-green-500 border-green-500/20'
                          }`}>
                            {folder.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => copyToClipboard(folder.file_number)}
                            className="h-7 w-7 text-slate-500 hover:text-white"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BridgerManagementSection() {
  const { user } = useAuth()
  const [bridgers, setBridgers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetchBridgers()
  }, [])

  const fetchBridgers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/bridger/list')
      const data = await res.json()
      if (data.success) {
        setBridgers(data.bridgers || [])
      }
    } catch (error) {
      console.error('Failed to fetch bridgers:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExempt = async (userId: string, currentExempt: boolean) => {
    setUpdating(userId)
    try {
      const res = await fetch('/api/admin/bridger/exemption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isExempt: !currentExempt, adminId: user?.id })
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        fetchBridgers()
      }
    } catch (error) {
      toast.error("That didn't update")
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold uppercase tracking-tight">Bridger Operations</h3>
          <p className="text-xs text-slate-500 font-medium">Manage monthly subscriptions and operational status.</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="text-center px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Fee</p>
            <p className="text-sm font-bold text-emerald-400">₦25,000</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">Bridger Identity</th>
              <th className="px-4 py-3">Continuance</th>
              <th className="px-4 py-3">Expiry</th>
              <th className="px-4 py-3">Exempt</th>
              <th className="px-4 py-3 text-right">Control</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {bridgers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-20 text-center text-slate-600 text-sm italic">No Bridgers found in the system.</td>
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
                      onClick={() => toggleExempt(bridger.id, bridger.is_subscription_exempt)}
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
      const response = await fetch('/api/users?role=agent')
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

function FundSweepsSection({ user }: { user: any }) {
  const [sweeps, setSweeps] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSweeps()
  }, [])

  const fetchSweeps = async () => {
    try {
      const response = await fetch('/api/admin/sweeps')
      const data = await response.json()
      setSweeps(data.sweeps || [])
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
        body: JSON.stringify({ sweepId, action: 'execute', adminId: user?.id }),
      })
      fetchSweeps()
    } catch (error) {
      console.error('Error executing sweep:', error)
    }
  }

  return (
    <div className="p-4">
      <h3 className="font-bold text-white mb-4">Fund Sweep Requests from EIGHT</h3>

      {loading ? (
        <p className="text-slate-500 text-center py-8 text-xs">Loading sweeps...</p>
      ) : sweeps.length === 0 ? (
        <p className="text-slate-500 text-center py-8 text-xs">No pending sweep requests</p>
      ) : (
        <div className="space-y-3">
          {sweeps.map((sweep: any) => (
            <div key={sweep.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-white text-sm">{sweep.amount} TRX Sweep</p>
                <p className="text-[10px] text-slate-400">
                  Status: <span className={`font-semibold ${sweep.status === 'pending' ? 'text-yellow-400' : sweep.status === 'approved' ? 'text-blue-400' : 'text-green-400'}`}>
                    {sweep.status.toUpperCase()}
                  </span>
                </p>
              </div>
              <div className="flex gap-2">
                {sweep.status === 'pending' && (
                  <Button size="sm" onClick={() => approveSweep(sweep.id, user?.id || '')} className="bg-blue-600 hover:bg-blue-700 h-8 text-xs">
                    Approve
                  </Button>
                )}
                {sweep.status === 'approved' && (
                  <Button size="sm" onClick={() => executeSweep(sweep.id)} className="bg-green-600 hover:bg-green-700 h-8 text-xs">
                    Execute
                  </Button>
                )}
              </div>
            </div>
          ))}
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

function TronDepositApprovalSection({ user }: { user: any }) {
  const [deposits, setDeposits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    fetchPendingDeposits()
  }, [])

  const fetchPendingDeposits = async () => {
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch('/api/admin/deposit/tron/pending', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      const data = await response.json()
      setDeposits(Array.isArray(data.deposits) ? data.deposits : [])
    } catch (error) {
      console.error('Error fetching pending TRON deposits:', error)
    } finally {
      setLoading(false)
    }
  }

  const verifyDeposit = async (depositId: string, status: 'approved' | 'rejected') => {
    setProcessingId(depositId)
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch('/api/admin/deposit/tron/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ depositId, status }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success(data.message || `Deposit ${status === 'approved' ? 'received' : 'declined'}`)
      } else {
        toast.error(data.error || "That didn't update")
      }
      fetchPendingDeposits()
    } catch (error) {
      console.error('Error verifying TRON deposit:', error)
      toast.error("That didn't go through")
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="p-4">
      <h3 className="font-bold text-white mb-4">Pending TRON Deposits</h3>

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
                  <p className="font-semibold text-white text-sm">{deposit.user_name} <span className="text-slate-500 font-normal">({deposit.user_email})</span></p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {Number(deposit.amount_trx).toFixed(6)} TRX
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {new Date(deposit.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-yellow-400 uppercase">{deposit.status}</span>
              </div>
              {deposit.receipt_data && (
                <div className="mt-2 p-2 bg-slate-900/50 rounded border border-slate-700">
                  <p className="text-[10px] text-slate-500 uppercase mb-1">Tx Hash</p>
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
      const response = await fetch('/api/admin/bridge-ai/deposits', {
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

  const verifyDeposit = async (depositId: string, status: 'approved' | 'rejected') => {
    setProcessingId(depositId)
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch('/api/admin/bridge-deposits/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ depositId, status }),
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
      <h3 className="font-bold text-white mb-4">Pending Bridge AI Deposits</h3>

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
                    {Number(deposit.tier_trx).toLocaleString()} TRX · via {deposit.bridger_name}'s Bridge AI (/bridge/{deposit.bridge_code})
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {new Date(deposit.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-yellow-400 uppercase">{deposit.status}</span>
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
                  onClick={() => verifyDeposit(deposit.id, 'approved')}
                  className="bg-green-600 hover:bg-green-700 h-8 text-xs"
                >
                  {processingId === deposit.id ? 'Processing...' : 'Approve & Issue File Number'}
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

function ClientMessagesPreview() {
  return (
    <div className="p-8 text-center space-y-4">
      <MessageSquare className="h-12 w-12 text-slate-700 mx-auto" />
      <div>
        <h4 className="font-bold text-white">Client Communications</h4>
        <p className="text-xs text-slate-500 mt-1">Manage support tickets and direct messages from platform clients.</p>
      </div>
      <Link href="/admin/client-messages">
        <Button className="bg-cyan-600 hover:bg-cyan-700 text-xs">Open Messages Terminal</Button>
      </Link>
    </div>
  )
}

function EightAiSection({ user }: { user: any }) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'eight'; content: string; timestamp: string }>>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    const loadScroll = async () => {
      try {
        const history = await readScroll(user.id, 20)
        const formatted = history.reverse().flatMap(h => [
          { role: 'user' as const, content: h.movement, timestamp: new Date(h.created_at).toLocaleTimeString() },
          { role: 'eight' as const, content: h.result, timestamp: new Date(h.created_at).toLocaleTimeString() }
        ])
        setMessages(formatted.length > 0 ? formatted : [
          { role: 'eight', content: 'Eight is observing. How can I assist The Sovereign today?', timestamp: new Date().toLocaleTimeString() }
        ])
      } catch (err) {
        setMessages([{ role: 'eight', content: 'Eight is observing. The Scroll is currently unreachable.', timestamp: new Date().toLocaleTimeString() }])
      }
    }
    loadScroll()
  }, [user.id])

  const handleSend = async () => {
    if (!input.trim() || isTyping) return
    
    const userMsg = input
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: new Date().toLocaleTimeString() }])
    setIsTyping(true)

    try {
      const { response } = await eightOperate(user.id, userMsg, { source: 'admin-dashboard' })
      setMessages(prev => [...prev, { role: 'eight', content: response, timestamp: new Date().toLocaleTimeString() }])
    } catch (error) {
      setMessages(prev => [...prev, { role: 'eight', content: 'The movement was interrupted. Eight remains Eight.', timestamp: new Date().toLocaleTimeString() }])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="flex flex-col h-[600px] bg-slate-900/60 rounded-xl border border-purple-500/20 overflow-hidden backdrop-blur-md">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
              m.role === 'user' 
                ? 'bg-purple-600 text-white rounded-tr-none' 
                : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase opacity-50">{m.role === 'eight' ? 'EIGHT' : 'SOVEREIGN'}</span>
                <span className="text-[10px] opacity-30">{m.timestamp}</span>
              </div>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-800 p-3 rounded-2xl rounded-tl-none border border-slate-700">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/40">
        <div className="flex gap-2">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="The Sovereign speaks..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition"
          />
          <Button 
            onClick={handleSend}
            disabled={isTyping}
            className="bg-purple-600 hover:bg-purple-700 rounded-xl"
          >
            <Zap className={`h-4 w-4 ${isTyping ? 'animate-pulse' : ''}`} />
          </Button>
        </div>
      </div>
    </div>
  )
}
