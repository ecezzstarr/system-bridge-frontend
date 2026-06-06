'use client'

import { useAuth } from '@/lib/auth-provider'
import { LogOut, ChevronRight, User, Shield, Zap, Globe, MessageSquare, Home, Store, Gamepad2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BottomNav } from '@/components/bottom-nav'

export default function HomePage() {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mb-4"></div>
          <p className="text-slate-400">Loading your space...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-950 shadow-2xl shadow-cyan-900/10">
        {/* Header */}
        <header className="p-6 flex justify-between items-center border-b border-slate-800/50 backdrop-blur-md sticky top-0 z-50">
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400">
              SSBNOW.SHOP
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Ecosystem Home</p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors"
          >
            <LogOut className="h-5 w-5 text-slate-500" />
          </button>
        </header>

        <main className="flex-1 px-6 py-8 space-y-8 overflow-y-auto">
          {/* 1. User Profile Summary */}
          <section className="relative overflow-hidden rounded-3xl bg-slate-900/40 border border-slate-800 p-6 group transition-all hover:border-cyan-500/30">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <User className="h-20 w-20 text-cyan-400" />
            </div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-2xl font-bold shadow-lg shadow-cyan-500/20">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white">{user.name}</h2>
                <p className="text-sm text-slate-400">@{user.username || 'user'}</p>
                <div className="flex gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 text-[10px] font-bold uppercase tracking-wider border border-cyan-500/20">
                    {user.role}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* 2. Personal Echo Information */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Shield className="h-4 w-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Personal Echo</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Status</p>
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Active
                </p>
              </div>
              <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Level</p>
                <p className="text-sm font-semibold text-white">Refinement 4</p>
              </div>
              <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Presence</p>
                <p className="text-sm font-semibold text-white">Stable</p>
              </div>
              <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Continuity</p>
                <p className="text-sm font-semibold text-white">98.2%</p>
              </div>
            </div>
          </section>

          {/* 3. Company Echo Information */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Globe className="h-4 w-4 text-blue-400" />
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Company Echo</h3>
            </div>
            <div className="bg-slate-900/60 rounded-2xl p-5 border border-slate-800 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Company Presence</span>
                <span className="text-sm font-bold text-blue-400">Radiant</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">System State</span>
                <span className="text-sm font-bold text-green-400">Nominal</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Ecosystem Status</span>
                <span className="text-sm font-bold text-white">Operational</span>
              </div>
            </div>
          </section>

          {/* 4. Admin Tools (Admin Only) */}
          {user.role === 'admin' && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Shield className="h-4 w-4 text-purple-400" />
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Admin Tools</h3>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Link href="/admin/workshop" className="w-full bg-slate-900/60 hover:bg-slate-800 border border-slate-800 rounded-2xl p-4 flex items-center justify-between transition-colors">
                  <span className="text-sm font-bold text-purple-400">Authority Workshop</span>
                  <ChevronRight className="h-4 w-4 text-slate-600" />
                </Link>
                <Link href="/admin/origin-systems" className="w-full bg-slate-900/60 hover:bg-slate-800 border border-slate-800 rounded-2xl p-4 flex items-center justify-between transition-colors">
                  <span className="text-sm font-bold text-indigo-400">System Navigation</span>
                  <ChevronRight className="h-4 w-4 text-slate-600" />
                </Link>
                <Link href="/admin/dashboard" className="w-full bg-slate-900/60 hover:bg-slate-800 border border-slate-800 rounded-2xl p-4 flex items-center justify-between transition-colors">
                  <span className="text-sm font-bold text-pink-400">Admin Panel</span>
                  <ChevronRight className="h-4 w-4 text-slate-600" />
                </Link>
              </div>
            </section>
          )}

          {/* 5. River Interaction Entry */}
          <section className="pt-4 pb-12">
            <Link href="/river">
              <button className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-700 p-px transition-all hover:scale-[1.02] active:scale-[0.98]">
                <div className="relative flex items-center justify-between gap-4 rounded-2xl bg-slate-950/40 p-5 backdrop-blur-sm group-hover:bg-transparent transition-colors">
                  <div className="flex items-center gap-4 text-left">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400">
                      <MessageSquare className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">Open River</p>
                      <p className="text-xs text-cyan-200/60">Truth untold made known</p>
                    </div>
                  </div>
                  <ChevronRight className="h-6 w-6 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            </Link>
          </section>
        </main>

        <BottomNav />
      </div>
    </div>
  )
}
