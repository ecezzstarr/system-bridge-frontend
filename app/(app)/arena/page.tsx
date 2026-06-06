'use client'

import { Globe, Trophy, Zap, Shield, ChevronRight, Activity } from 'lucide-react'
import Link from 'next/link'
import { useArenaMatches } from '@/lib/hooks'
import { BottomNav } from '@/components/bottom-nav'

export default function ArenaPage() {
  const { data: matchesData } = useArenaMatches({ limit: 10 })
  const matches = matchesData?.matches || []

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col bg-slate-950 shadow-2xl shadow-blue-900/10">
        {/* Header */}
        <header className="p-6 border-b border-slate-800/50 sticky top-0 bg-slate-950/80 backdrop-blur-md z-50">
          <div>
            <h1 className="text-xl font-bold text-blue-400 flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Arena
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Visibility & Activity</p>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 space-y-8 overflow-y-auto pb-20">
          {/* Ecosystem Pulse */}
          <section className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-3xl p-6 border border-blue-500/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Activity className="h-16 w-16 text-blue-400" />
            </div>
            <h2 className="text-lg font-bold mb-1">Ecosystem Pulse</h2>
            <p className="text-xs text-blue-200/60 uppercase font-bold tracking-tighter">Live Activity Tracker</p>
            
            <div className="mt-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Total Participation</span>
                <span className="font-bold">1,248 Users</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Active Sessions</span>
                <span className="font-bold text-green-400">42 Live</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Volume (24h)</span>
                <span className="font-bold text-blue-400">14,200 TRX</span>
              </div>
            </div>
          </section>

          {/* Recent Achievements */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Achievements</h3>
              </div>
              <button className="text-[10px] font-bold text-blue-400 uppercase">View All</button>
            </div>
            
            <div className="space-y-3">
              <div className="bg-slate-900/40 rounded-2xl p-4 border border-slate-800 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">Top Earner</p>
                  <p className="text-[10px] text-slate-500 uppercase">@cryptoking won 500 TRX</p>
                </div>
              </div>
              <div className="bg-slate-900/40 rounded-2xl p-4 border border-slate-800 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">Presence Master</p>
                  <p className="text-[10px] text-slate-500 uppercase">@nexus reached Level 10</p>
                </div>
              </div>
            </div>
          </section>

          {/* Ongoing Activity */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Zap className="h-4 w-4 text-blue-400" />
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Live Activity</h3>
            </div>
            
            <div className="space-y-3">
              {matches.filter(m => m.status === 'live').map((match) => (
                <div key={match.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex justify-between items-center group hover:border-blue-500/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <div>
                      <p className="text-sm font-bold">{match.title}</p>
                      <p className="text-[10px] text-slate-500 uppercase">{match.participants.length} watching</p>
                    </div>
                  </div>
                  <Link href="/casino">
                    <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-blue-400 transition-colors" />
                  </Link>
                </div>
              ))}
              {matches.filter(m => m.status === 'live').length === 0 && (
                <div className="bg-slate-900/20 rounded-2xl p-8 text-center border border-dashed border-slate-800">
                  <p className="text-xs text-slate-500 uppercase font-bold">No live activity detected</p>
                </div>
              )}
            </div>
          </section>
        </main>

        <BottomNav />
      </div>
    </div>
  )
}
