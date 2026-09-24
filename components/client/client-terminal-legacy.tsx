'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MessageCircle, ArrowRight, ArrowUpRight, ArrowDownLeft, Phone, Trophy, Globe, Zap, Shield, Wallet, Lock, Sparkles } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { openWhatsAppWithNumber, SUPPORT_NUMBERS, WhatsAppButton } from '@/components/external-apps-nav'

interface SupportPosition {
  position: string
  agent_name: string
  icon: string
  description: string
  whatsapp?: string
}

const SUPPORT_POSITIONS: SupportPosition[] = [
  { position: 'mandate', agent_name: 'Mandate Officer', icon: '📋', description: 'Mandate', whatsapp: SUPPORT_NUMBERS.mandate },
  { position: 'forensic', agent_name: 'Forensic Expert', icon: '🔍', description: 'Forensic', whatsapp: SUPPORT_NUMBERS.forensic },
  { position: 'lawyer', agent_name: 'Legal Counsel', icon: '⚖️', description: 'Legal', whatsapp: SUPPORT_NUMBERS.legal },
  { position: 'admin', agent_name: 'Administrator', icon: '👤', description: 'Admin', whatsapp: SUPPORT_NUMBERS.admin },
]

export default function LegacyClientDashboard() {
  const { user, isLoading: authLoading } = useAuth()
  const [bridger, setBridger] = useState<{ name: string; whatsapp_number?: string } | null>(null)
  const [vaultBalance, setVaultBalance] = useState(0)
  const [isLoadingVault, setIsLoadingVault] = useState(true)

  useEffect(() => {
    if (!user?.id) return

    const fetchBridgerInfo = async () => {
      try {
        const response = await fetch(`/api/client/bridger?clientId=${user.id}`)
        const data = await response.json()
        if (data.bridger) {
          setBridger(data.bridger)
        }
      } catch (error) {
        console.error('Error fetching bridger info:', error)
      }
    }

    const fetchVaultBalance = async () => {
      try {
        const token = localStorage.getItem('ssb_auth_token')
        const res = await fetch(`/api/wallet/balance?userId=${user.id}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        })
        const data = await res.json()
        if (data.success) setVaultBalance(data.flameCoinBalance || 0)
      } catch (error) {
        console.error('Error fetching vault balance:', error)
      } finally {
        setIsLoadingVault(false)
      }
    }

    fetchBridgerInfo()
    fetchVaultBalance()
  }, [user?.id])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mb-4"></div>
          <p className="text-slate-400">Loading your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-10 px-4 md:px-0 py-6 md:py-10">
      {/* The normal WEAVE world shell now carries the visual world header.
          Existing Client functions continue below unchanged. */}

      <Link href="/client/loops" className="block rounded-3xl border border-cyan-500/20 bg-slate-900 p-6 hover:border-cyan-400/50">
        <p className="text-xs uppercase tracking-widest text-cyan-400">Client Position</p>
        <h2 className="mt-2 text-xl font-bold text-white">Company Loops & Agreements</h2>
        <p className="mt-2 text-sm text-slate-400">Your company events, responsibilities, and documents to review and sign.</p>
      </Link>

      {/* Vault */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-cyan-500/20 p-6 md:p-10 shadow-xl">
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <Lock className="h-32 w-32 text-cyan-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-3">
              <Lock className="h-3 w-3 text-cyan-400" />
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Your Vault</span>
            </div>
            <p className="text-4xl md:text-5xl font-black text-white">
              {isLoadingVault ? '—' : vaultBalance.toFixed(2)} <span className="text-lg font-bold text-slate-500">TRX</span>
            </p>
            <p className="text-xs text-slate-500 mt-2">Your Vault holds funds secured by WEAVE and is ready to use.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/client/deposit">
              <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-green-500 hover:text-slate-950 hover:border-green-500 font-bold text-xs uppercase tracking-widest h-12 rounded-xl px-6">
                <ArrowDownLeft className="mr-2 h-4 w-4" /> Deposit
              </Button>
            </Link>
            <Link href="/client/withdraw">
              <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-red-500 hover:text-slate-950 hover:border-red-500 font-bold text-xs uppercase tracking-widest h-12 rounded-xl px-6">
                <ArrowUpRight className="mr-2 h-4 w-4" /> Withdraw
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main chat: bridger, front and center */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600/20 via-slate-900 to-slate-900 border border-emerald-500/30 p-6 md:p-10 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-1">Your Direct Line</p>
              <h2 className="text-xl md:text-2xl font-bold text-white">{bridger?.name || 'Your Bridger'}</h2>
              <p className="text-xs text-slate-400">Your primary point of contact in WEAVE</p>
            </div>
          </div>
          <Link href="/client/chat/bridger">
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-widest h-12 rounded-xl px-8">
              Open Chat <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Arena + Casino - promoted, Arena first as the flagship experience */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/client/arena" className="block">
          <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600/20 to-slate-900 border border-blue-500/30 p-8 hover:border-blue-400/50 transition-all hover:translate-y-[-4px] shadow-xl h-full">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Globe className="h-28 w-28 text-blue-400" />
            </div>
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full mb-4">
                <Sparkles className="h-3 w-3 text-blue-400" />
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Flagship Experience</span>
              </div>
              <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Arena</h3>
              <p className="text-sm text-slate-400 mb-6">WEAVE's primary experience, curated for you.</p>
              <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-widest">
                Enter Arena <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </Link>

        <Link href="/client/casino" className="block">
          <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600/20 to-slate-900 border border-purple-500/30 p-8 hover:border-purple-400/50 transition-all hover:translate-y-[-4px] shadow-xl h-full">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Trophy className="h-28 w-28 text-purple-400" />
            </div>
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full mb-4">
                <Trophy className="h-3 w-3 text-purple-400" />
                <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Play</span>
              </div>
              <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Casino</h3>
              <p className="text-sm text-slate-400 mb-6">Test your luck with your Vault balance.</p>
              <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-widest">
                Enter Casino <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Company support positions - demoted to a compact corner strip */}
      <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 md:p-5">
        <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
          <Shield className="h-3 w-3" /> Support Services
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {SUPPORT_POSITIONS.map((pos) => (
            <div key={pos.position} className="flex items-center gap-2 bg-slate-950/50 border border-white/5 rounded-xl px-3 py-2">
              <span className="text-base flex-shrink-0">{pos.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-300 truncate">{pos.description}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {pos.whatsapp && (
                  <button
                    onClick={() => openWhatsAppWithNumber(pos.whatsapp!, `Hi, I need assistance from ${pos.description}`)}
                    className="w-6 h-6 rounded-full bg-green-500/5 hover:bg-green-500/10 border border-green-500/10 flex items-center justify-center transition-colors"
                  >
                    <Phone className="h-3 w-3 text-green-500" />
                  </button>
                )}
                <Link href={`/client/chat/${pos.position}`}>
                  <button className="w-6 h-6 rounded-full bg-white/5 hover:bg-cyan-500/10 border border-white/10 flex items-center justify-center transition-colors">
                    <MessageCircle className="h-3 w-3 text-slate-400" />
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Profile Identity */}
      <div className="bg-slate-950 border border-white/5 rounded-3xl p-6 md:p-8 relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6">Profile Identity</h3>
        <div className="space-y-5 relative z-10">
          {user.business_name && (
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Entity</span>
              <span className="text-sm font-bold text-slate-200 truncate ml-4">{user.business_name}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Node</span>
            <span className="text-sm font-bold text-slate-200 truncate ml-4">{user.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Signal</span>
            <span className="text-xs font-bold text-cyan-400 truncate ml-4">{user.email}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-2">
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-slate-900/50 backdrop-blur-2xl border border-white/5 p-6 md:px-10 md:py-6 rounded-[2rem]">
          <div className="flex gap-4">
            <WhatsAppButton />
          </div>
          <div className="flex items-center gap-3 px-6 py-2.5 bg-slate-950 border border-white/5 rounded-full shadow-inner">
            <div className="relative flex h-2 w-2">
              <div className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75"></div>
              <div className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></div>
            </div>
            <span className="text-[10px] font-black text-green-500 uppercase tracking-[0.3em]">System Stabilized</span>
          </div>
        </div>
      </div>
    </div>
  )
}
