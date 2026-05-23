'use client'

import { useAuth } from '@/lib/auth-provider'
import { clearToken } from '@/lib/auth-client'
import { LogOut, Wallet, Store, Gamepad2, MessageCircle, ChevronRight, Zap, Globe, Code } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { EcosystemNav } from '@/components/ecosystem-nav'
import { RiverChat } from '@/components/river-chat'

export default function DashboardPage() {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Route users to their appropriate dashboard
  useEffect(() => {
    if (mounted && user && !isLoading) {
      if (user.role === 'agent') {
        router.replace('/agent/dashboard')
      } else if (user.role === 'bridger') {
        router.replace('/bridger/dashboard')
      }
      // Admin and client stay on this dashboard
    }
  }, [mounted, user, isLoading, router])

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mb-4"></div>
          <p className="text-slate-400">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const handleLogout = () => {
    logout()
    clearToken()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Mobile-First Scrollable Dashboard */}
      <div className="max-w-md mx-auto bg-slate-950">
        {/* Header Section - Sticky */}
        <div className="sticky top-0 z-50 bg-slate-950 border-b border-slate-800 px-4 py-4 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-white">SSBNOW.SHOP</h1>
              <p className="text-xs text-slate-500">Weave of Presence</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-slate-800 rounded-lg transition"
              title="Sign Out"
            >
              <LogOut className="h-5 w-5 text-slate-400" />
            </button>
          </div>
          {/* Ecosystem Navigation */}
          {user.role === 'admin' && (
            <div className="mb-4">
              <p className="text-xs text-slate-500 mb-2 font-semibold">NAVIGATE SYSTEMS</p>
              <EcosystemNav currentSystem="shop" />
            </div>
          )}

          {user.role === 'admin' && (
            <div className="space-y-2">
              <Link href="/admin/dashboard">
                <button className="w-full text-xs bg-purple-600/20 text-purple-400 border border-purple-600/50 rounded-lg py-2 hover:bg-purple-600/30 transition font-medium">
                  Admin Panel
                </button>
              </Link>
              <Link href="/admin/origin-systems">
                <button className="w-full text-xs bg-indigo-600/20 text-indigo-400 border border-indigo-600/50 rounded-lg py-2 hover:bg-indigo-600/30 transition font-medium flex items-center justify-center gap-2">
                  <Globe className="h-3.5 w-3.5" />
                  Origin Network
                </button>
              </Link>
              <Link href="/admin/workshop">
                <button className="w-full text-xs bg-pink-600/20 text-pink-400 border border-pink-600/50 rounded-lg py-2 hover:bg-pink-600/30 transition font-medium flex items-center justify-center gap-2">
                  <Code className="h-3.5 w-3.5" />
                  Dev Workshop
                </button>
              </Link>
            </div>
          )}

        {/* Scrollable Content */}
        <div className="px-4 pb-20 space-y-4 max-h-[calc(100vh-100px)] overflow-y-auto">
          {/* User Profile Card */}
          <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800 mt-2">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-white truncate">{user.name}</h2>
                <p className="text-xs text-slate-400">@{user.username}</p>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <span className="bg-slate-800/80 px-2 py-1 rounded-lg text-xs font-medium">{user.role}</span>
                  {!user.assigned_by_admin && (
                    <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-lg text-xs">Pending</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/wallet-settings">
              <button className="bg-slate-900/60 hover:bg-slate-900/80 rounded-xl p-3 border border-slate-800 hover:border-cyan-500/50 transition w-full text-left">
                <p className="text-xs text-slate-400 mb-1">Personal</p>
                <p className="text-lg font-bold text-cyan-400">{user.personal_wallet_address ? '✓' : '−'}</p>
                <p className="text-xs text-slate-500">Wallet</p>
              </button>
            </Link>
            <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800">
              <p className="text-xs text-slate-400 mb-1">Platform</p>
              <p className="text-lg font-bold text-green-400">{user.platform_wallet_balance || 0}</p>
              <p className="text-xs text-slate-500">Gaming</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <Link href="/wallet">
              <button className="w-full bg-slate-900/60 hover:bg-slate-800 border border-slate-800 rounded-xl p-3 flex items-center justify-between transition">
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                  <span className="text-sm font-medium">Manage Wallet</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500 flex-shrink-0" />
              </button>
            </Link>

            <Link href="/deposit">
              <button className="w-full bg-green-600/20 hover:bg-green-600/30 border border-green-600/50 rounded-xl p-3 flex items-center justify-between transition">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm font-medium">Deposit Funds</span>
                </div>
                <ChevronRight className="h-4 w-4 text-green-400 flex-shrink-0" />
              </button>
            </Link>
          </div>

          {/* Places Section */}
          <div className="pt-4 border-t border-slate-800">
            <h3 className="text-xs font-semibold text-slate-400 uppercase mb-3">Explore</h3>
            <div className="space-y-2">
              <Link href="/places?place=market">
                <button className="w-full bg-slate-900/60 hover:bg-slate-800 border border-slate-800 rounded-xl p-3 flex items-center justify-between transition">
                  <div className="flex items-center gap-3">
                    <Store className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                    <div className="text-left min-w-0">
                      <p className="text-sm font-medium">Market</p>
                      <p className="text-xs text-slate-500">Trade assets</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500 flex-shrink-0" />
                </button>
              </Link>

              <Link href="/places?place=arena">
                <button className="w-full bg-slate-900/60 hover:bg-slate-800 border border-slate-800 rounded-xl p-3 flex items-center justify-between transition">
                  <div className="flex items-center gap-3">
                    <Gamepad2 className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                    <div className="text-left min-w-0">
                      <p className="text-sm font-medium">Arena</p>
                      <p className="text-xs text-slate-500">Live games</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500 flex-shrink-0" />
                </button>
              </Link>

              <Link href="/places?place=lounge">
                <button className="w-full bg-slate-900/60 hover:bg-slate-800 border border-slate-800 rounded-xl p-3 flex items-center justify-between transition">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                    <div className="text-left min-w-0">
                      <p className="text-sm font-medium">Lounge</p>
                      <p className="text-xs text-slate-500">Chat</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500 flex-shrink-0" />
                </button>
              </Link>

              {user.role === 'admin' && (
                <Link href="/client-interactions">
                  <button className="w-full bg-green-600/20 hover:bg-green-600/30 border border-green-600/50 rounded-xl p-3 flex items-center justify-between transition">
                    <div className="flex items-center gap-3">
                      <MessageCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="text-sm font-medium">Client Interactions</p>
                        <p className="text-xs text-slate-500">Customer service</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-green-400 flex-shrink-0" />
                  </button>
                </Link>
              )}
            </div>
          </div>

          {/* Wallets Section */}
          <div className="pt-4 border-t border-slate-800">
            <h3 className="text-xs font-semibold text-slate-400 uppercase mb-3">Wallets</h3>
            
            <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800 mb-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-400 font-medium">EIGHT Escrow</p>
                <span className="text-xs bg-purple-600/30 text-purple-300 px-2 py-1 rounded-lg">AI</span>
              </div>
              <p className="text-2xl font-bold text-purple-400">{user.escrow_balance || 0}</p>
              <p className="text-xs text-slate-500 mt-2">From arena losses</p>
            </div>

            <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-400 font-medium">Company Wallet</p>
                <span className="text-xs bg-cyan-600/30 text-cyan-300 px-2 py-1 rounded-lg">Master</span>
              </div>
              {user.role === 'admin' ? (
                <>
                  <p className="text-2xl font-bold text-cyan-400">{user.personal_wallet_address || 'Not Set'}</p>
                  <p className="text-xs text-slate-500 mt-2 break-all">{user.personal_wallet_address}</p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-cyan-400">***</p>
                  <p className="text-xs text-slate-500 mt-2">Admin controlled</p>
                </>
              )}
            </div>
          </div>

          {/* Status Footer */}
          <div className="pt-4 border-t border-slate-800 pb-4">
            <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-sm text-white">System Status</p>
              </div>
              <p className="text-xs text-green-400 font-medium">Online</p>
            </div>
          </div>
        </div>
        </div>
      </div>
      
      {/* River Chat Widget */}
      <RiverChat />
    </div>
  )
}
