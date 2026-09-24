'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Gamepad2, Users, Zap, Trophy, Plus, X, Loader2, Calendar, Play, Target, Swords, Search, Flame, TrendingUp } from 'lucide-react'
import { useArenaMatches } from '@/lib/hooks'
import { useAuth } from '@/lib/auth-provider'
import { toast } from 'sonner'
import api from '@/lib/api'
import { isClientPlayerRole } from '@/lib/weave-participation'

const CATEGORIES = [
  { id: 'all', name: 'All', icon: Target },
  { id: 'football', name: 'Football', icon: Trophy },
  { id: 'ufc', name: 'UFC', icon: Swords },
  { id: 'esports', name: 'Esports', icon: Gamepad2 },
  { id: 'racing', name: 'Racing', icon: Flame },
]

export default function Arena({ user: propUser }: { user?: any }) {
  const { user: authUser } = useAuth()
  const user = propUser || authUser
  const isPlayer = isClientPlayerRole(user?.role)
  const [activeCategory, setActiveCategory] = useState('all')
  const { data: matchesData, isLoading, mutate } = useArenaMatches({ limit: 20 })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'curated' | 'admin'>('all')
  const [curatingMatch, setCuratingMatch] = useState<string | null>(null)
  
  const [newMatch, setNewMatch] = useState({
    title: '',
    description: '',
    entryFee: 10,
    maxParticipants: 100,
    category: 'football_curated',
    startsAt: '',
  })

  const matches = matchesData?.matches || matchesData?.data?.matches || []
  
  const filteredMatches = matches.filter((m: any) => {
    if (activeTab === 'curated') return m.category === 'football_curated' || m.category === 'football'
    if (activeTab === 'admin') return user?.role === 'admin'
    if (activeCategory === 'all') return true
    return m.category === activeCategory
  })

  const handleJoinMatch = async (matchId: string, prediction?: string) => {
    if (!user?.id || !isPlayer) {
      toast.error('Arena participation is reserved for Client players')
      return
    }
    setJoining(matchId)
    try {
      await api.joinArenaMatch(matchId, user.id, prediction)
      mutate()
      toast.success("You've entered the contest")
    } catch (e: any) {
      toast.error(e.message || "Couldn't enter the contest")
    }
    setJoining(null)
  }

  const handleAction = async (matchId: string, action: 'start' | 'end' | 'cancel', winnerId?: string) => {
    if (!user?.id) return
    try {
      if (action === 'start') {
        await api.startArenaMatch(matchId, user.id)
        toast.success('The contest has begun')
      } else if (action === 'end') {
        await api.endArenaMatch(matchId, user.id, winnerId || '')
        toast.success('The contest has settled')
      } else if (action === 'cancel') {
        // We'll add a cancel method to api or use end with no winner
        await fetch(`/api/arena/matches/${matchId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cancel', userId: user.id }),
        })
        toast.success('The contest was called off — your entry has returned')
      }
      mutate()
    } catch (e: any) {
      toast.error(e.message || `Failed to ${action} match`)
    }
  }

  const handleCreateMatch = async () => {
    if (!user?.id || !newMatch.title || !newMatch.startsAt) return
    setCreating(true)
    try {
      await api.createArenaMatch({
        ...newMatch,
        hostId: user.id,
      })
      mutate()
      setShowCreateModal(false)
      setNewMatch({
        title: '',
        description: '',
        entryFee: 10,
        maxParticipants: 100,
        category: 'football_curated',
        startsAt: '',
      })
      toast.success('The contest is set')
    } catch (e: any) {
      toast.error(e.message || "Couldn't set the contest")
    }
    setCreating(false)
  }

  return (
    <div className="px-4 py-4 space-y-6">
      {/* Dynamic Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2 tracking-tighter">
              <Swords className="h-6 w-6 text-yellow-500" />
              ARENA
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ecosystem Combat & Predictions</p>
          </div>
          <div className="flex gap-2">
            {user?.role === 'admin' && (
              <Button size="icon" variant="ghost" className="rounded-full bg-slate-900 border border-slate-800" onClick={() => {
                setShowCreateModal(true)
              }}>
                <Plus className="h-4 w-4 text-yellow-500" />
              </Button>
            )}
            <Button size="icon" variant="ghost" className="rounded-full bg-slate-900 border border-slate-800">
              <Search className="h-4 w-4 text-slate-400" />
            </Button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
              activeTab === 'all' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            All Games
          </button>
          <button
            onClick={() => setActiveTab('curated')}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
              activeTab === 'curated' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Curated
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                activeTab === 'admin' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Control
            </button>
          )}
        </div>

        {/* Category Scroll */}
        {activeTab !== 'admin' && (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-xs font-bold transition-all border ${
                  activeCategory === cat.id
                    ? 'bg-yellow-500 border-yellow-400 text-slate-950'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <cat.icon className="h-3 w-3" />
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {!isPlayer && user?.role !== 'admin' && (
        <div className="rounded-2xl border border-sky-400/20 bg-sky-400/5 p-4 text-xs leading-5 text-slate-400">
          Support view. Clients are the Arena players; your position can observe and support Client movement without entering as a participant.
        </div>
      )}

      {/* Content */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
            <p className="text-xs text-slate-500 mt-4 font-bold tracking-widest uppercase">Syncing Arena...</p>
          </div>
        ) : (
          <>
            {filteredMatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-900/20 border border-dashed border-slate-800 rounded-3xl">
                <Target className="h-12 w-12 text-slate-800 mb-4" />
                <h3 className="text-slate-400 font-bold">No Matches Found</h3>
                <p className="text-slate-600 text-xs mt-2 max-w-[200px]">Create a match or check back later.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMatches.map((match: any) => {
                  const isLive = match.status === 'live' || match.status === 'ongoing'
                  const isUpcoming = match.status === 'upcoming'
                  const isAdmin = user?.role === 'admin'
                  
                  return (
                    <div
                      key={match.id}
                      className={`relative overflow-hidden group bg-slate-900/60 border rounded-2xl p-5 transition-all hover:border-yellow-500/30 ${
                        isLive ? 'border-yellow-500/20 ring-1 ring-yellow-500/10' : 'border-slate-800'
                      }`}
                    >
                      {/* Live Indicator */}
                      {isLive && (
                        <div className="absolute top-0 right-0">
                          <div className="bg-red-500 text-[8px] font-black text-white px-3 py-1 rounded-bl-xl flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                            LIVE
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col gap-4">
                        {/* Event Info */}
                        <div className="flex items-start justify-between min-w-0">
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">{match.category}</span>
                            <h3 className="text-lg font-black text-white leading-tight mt-0.5 truncate">{match.title}</h3>
                            <div className="flex items-center gap-3 mt-2">
                               <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(match.scheduledAt).toLocaleDateString()}
                               </div>
                               <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                                  <Play className="h-3 w-3" />
                                  {new Date(match.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                               </div>
                            </div>
                          </div>
                          
                          {/* Admin Controls Badge */}
                          {isAdmin && (
                            <div className="flex gap-1">
                              {isUpcoming && (
                                <Button size="sm" className="h-7 text-[8px] font-black bg-green-600 hover:bg-green-700" onClick={() => handleAction(match.id, 'start')}>
                                  START
                                </Button>
                              )}
                              {isLive && (
                                <Button size="sm" className="h-7 text-[8px] font-black bg-blue-600 hover:bg-blue-700" onClick={() => setCuratingMatch(match.id)}>
                                  SETTLE
                                </Button>
                              )}
                              {match.status !== 'completed' && (
                                <Button size="sm" variant="destructive" className="h-7 text-[8px] font-black" onClick={() => handleAction(match.id, 'cancel')}>
                                  CANCEL
                                </Button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Settle Modal/Panel Overlay */}
                        {curatingMatch === match.id && (
                          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-4 animate-in slide-in-from-bottom-2 duration-300">
                             <h4 className="text-sm font-black text-white mb-4 uppercase tracking-widest">Settle Winner</h4>
                             <div className="flex flex-wrap gap-2 justify-center">
                               {match.participants?.map((p: any) => (
                                 <Button 
                                  key={p.id}
                                  size="sm" 
                                  variant="outline"
                                  className="h-8 text-[8px] font-black border-slate-700 hover:bg-yellow-500 hover:text-slate-950"
                                  onClick={() => {
                                    handleAction(match.id, 'end', p.id)
                                    setCuratingMatch(null)
                                  }}
                                 >
                                   {p.displayName || p.username}
                                 </Button>
                               ))}
                               {(!match.participants || match.participants.length === 0) && (
                                 <p className="text-xs text-slate-500 italic">No participants found</p>
                               )}
                             </div>
                             <Button 
                              variant="ghost" 
                              size="sm" 
                              className="mt-6 text-[8px] font-black text-slate-500"
                              onClick={() => setCuratingMatch(null)}
                             >
                               CLOSE
                             </Button>
                          </div>
                        )}

                        {/* Prediction Stats */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-slate-950/50 p-2 rounded-xl border border-slate-800/50 text-center">
                            <p className="text-[8px] text-slate-500 font-bold uppercase mb-1">Pool</p>
                            <p className="text-sm font-black text-white">{match.prizePool || 0} TRX</p>
                          </div>
                          <div className="bg-slate-950/50 p-2 rounded-xl border border-slate-800/50 text-center">
                            <p className="text-[8px] text-slate-500 font-bold uppercase mb-1">Entry</p>
                            <p className="text-sm font-black text-yellow-500">{match.entryFee || 0} TRX</p>
                          </div>
                          <div className="bg-slate-950/50 p-2 rounded-xl border border-slate-800/50 text-center">
                            <p className="text-[8px] text-slate-500 font-bold uppercase mb-1">Players</p>
                            <p className="text-sm font-black text-cyan-500">{match.participantCount || 0}</p>
                          </div>
                        </div>

                        {/* Prediction Choices (User View) */}
                        {isUpcoming && isPlayer && (
                          <div className="grid grid-cols-3 gap-2 mt-2">
                             <Button 
                              variant="outline" 
                              className="bg-slate-950 border-slate-800 text-[8px] font-black hover:bg-yellow-500 hover:text-slate-950 hover:border-yellow-400 py-1"
                              onClick={() => handleJoinMatch(match.id, 'HOME')}
                              disabled={joining === match.id}
                            >
                               HOME (2.0x)
                             </Button>
                             <Button 
                              variant="outline" 
                              className="bg-slate-950 border-slate-800 text-[8px] font-black hover:bg-yellow-500 hover:text-slate-950 hover:border-yellow-400 py-1"
                              onClick={() => handleJoinMatch(match.id, 'DRAW')}
                              disabled={joining === match.id}
                            >
                               DRAW (3.2x)
                             </Button>
                             <Button 
                              variant="outline" 
                              className="bg-slate-950 border-slate-800 text-[8px] font-black hover:bg-yellow-500 hover:text-slate-950 hover:border-yellow-400 py-1"
                              onClick={() => handleJoinMatch(match.id, 'AWAY')}
                              disabled={joining === match.id}
                            >
                               AWAY (2.5x)
                             </Button>
                          </div>
                        )}

                        {match.status === 'completed' && (
                           <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex items-center justify-between">
                             <div className="flex items-center gap-2">
                               <Trophy className="h-4 w-4 text-yellow-500" />
                               <span className="text-xs font-bold text-slate-300">Ended</span>
                             </div>
                             <span className="text-xs font-black text-white">Winner Settled</span>
                           </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Match Modal (Community) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-xl font-black text-white tracking-tighter">LAUNCH MATCH</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-white transition">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Category</label>
                <select 
                  value={newMatch.category}
                  onChange={(e) => setNewMatch({ ...newMatch, category: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-sm focus:ring-yellow-500"
                >
                  <option value="football_curated">Football (Curated)</option>
                  <option value="football">Football (Community)</option>
                  <option value="ufc">UFC</option>
                  <option value="esports">Esports</option>
                  <option value="racing">Racing</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Title</label>
                <Input
                  value={newMatch.title}
                  onChange={(e) => setNewMatch({ ...newMatch, title: e.target.value })}
                  placeholder="e.g. Manchester City vs Real Madrid"
                  className="bg-slate-950 border-slate-800 text-white rounded-xl focus:ring-yellow-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Entry (TRX)</label>
                  <Input
                    type="number"
                    value={newMatch.entryFee}
                    onChange={(e) => setNewMatch({ ...newMatch, entryFee: Number(e.target.value) })}
                    className="bg-slate-950 border-slate-800 text-white rounded-xl focus:ring-yellow-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Max Players</label>
                  <Input
                    type="number"
                    value={newMatch.maxParticipants}
                    onChange={(e) => setNewMatch({ ...newMatch, maxParticipants: Number(e.target.value) })}
                    className="bg-slate-950 border-slate-800 text-white rounded-xl focus:ring-yellow-500"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Start Time</label>
                <Input
                  type="datetime-local"
                  value={newMatch.startsAt}
                  onChange={(e) => setNewMatch({ ...newMatch, startsAt: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-white rounded-xl focus:ring-yellow-500"
                />
              </div>
              <Button 
                className="w-full h-12 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black mt-4 rounded-xl shadow-lg shadow-yellow-900/20" 
                onClick={handleCreateMatch}
                disabled={creating || !newMatch.title || !newMatch.startsAt}
              >
                {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : 'LAUNCH MATCH'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
