"use client"

import { useState } from "react"
import {
  Plus,
  Play,
  Calendar,
  Trophy,
  Target,
  X,
  Gamepad2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { useArenaMatches } from "@/lib/hooks"
import api from "@/lib/api"
import { useAuth } from "@/lib/auth-provider"
import { BottomNav } from '@/components/bottom-nav'

function formatDateTime(dateString: string) {
  const date = new Date(dateString)
  return {
    date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    time: date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
  }
}

export default function CasinoPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState("upcoming")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState<string | null>(null)
  const [newMatch, setNewMatch] = useState({
    title: '',
    description: '',
    entryFee: 10,
    maxParticipants: 10,
    category: 'general',
    startsAt: '',
  })

  const { data: matchesData, isLoading, mutate } = useArenaMatches({
    status: tab === "all" ? undefined : tab,
    limit: 20,
  })

  const matches = matchesData?.matches || matchesData?.data?.matches || []

  const handleJoinMatch = async (matchId: string) => {
    if (!user?.id) return
    setJoining(matchId)
    try {
      await api.joinArenaMatch(matchId, user.id)
      mutate()
    } catch (e) {
      console.error('Failed to join match:', e)
    }
    setJoining(null)
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
        maxParticipants: 10,
        category: 'general',
        startsAt: '',
      })
    } catch (e) {
      console.error('Failed to create match:', e)
    }
    setCreating(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col bg-slate-950 shadow-2xl shadow-yellow-900/10">
        {/* Header */}
        <header className="p-6 border-b border-slate-800/50 sticky top-0 bg-slate-950/80 backdrop-blur-md z-50">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-yellow-500 flex items-center gap-2">
                <Gamepad2 className="h-5 w-5" />
                Casino
              </h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Participate & Play</p>
            </div>
            <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 rounded-xl gap-2 text-xs h-8" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-3 w-3" />
              New Game
            </Button>
          </div>
        </header>

        {/* Create Match Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h2 className="font-bold text-lg">Create New Game</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <Input
                  value={newMatch.title}
                  onChange={(e) => setNewMatch({ ...newMatch, title: e.target.value })}
                  placeholder="Game Title"
                  className="bg-slate-950 border-slate-800 rounded-xl"
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="number"
                    value={newMatch.entryFee}
                    onChange={(e) => setNewMatch({ ...newMatch, entryFee: Number(e.target.value) })}
                    placeholder="Entry Fee (TRX)"
                    className="bg-slate-950 border-slate-800 rounded-xl"
                  />
                  <Input
                    type="number"
                    value={newMatch.maxParticipants}
                    onChange={(e) => setNewMatch({ ...newMatch, maxParticipants: Number(e.target.value) })}
                    placeholder="Max Players"
                    className="bg-slate-950 border-slate-800 rounded-xl"
                  />
                </div>
                <Input
                  type="datetime-local"
                  value={newMatch.startsAt}
                  onChange={(e) => setNewMatch({ ...newMatch, startsAt: e.target.value })}
                  className="bg-slate-950 border-slate-800 rounded-xl"
                />
                <Button 
                  className="w-full bg-yellow-600 hover:bg-yellow-700 rounded-xl h-12 font-bold" 
                  onClick={handleCreateMatch}
                  disabled={creating || !newMatch.title || !newMatch.startsAt}
                >
                  {creating ? 'Creating...' : 'Initialize Game'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/40 rounded-2xl p-4 border border-slate-800">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Live Games</p>
              <p className="text-xl font-bold text-white">{matches.filter(m => m.status === 'live').length}</p>
            </div>
            <div className="bg-slate-900/40 rounded-2xl p-4 border border-slate-800">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Total Prize</p>
              <p className="text-xl font-bold text-yellow-500">
                {matches.reduce((sum, m) => sum + m.prizePool, 0).toLocaleString()} <span className="text-xs">TRX</span>
              </p>
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="bg-slate-900/50 border border-slate-800 rounded-xl p-1 w-full flex">
              <TabsTrigger value="upcoming" className="flex-1 rounded-lg text-xs uppercase font-bold tracking-tighter data-[state=active]:bg-yellow-600 data-[state=active]:text-white">Upcoming</TabsTrigger>
              <TabsTrigger value="live" className="flex-1 rounded-lg text-xs uppercase font-bold tracking-tighter data-[state=active]:bg-destructive data-[state=active]:text-white">Live</TabsTrigger>
              <TabsTrigger value="completed" className="flex-1 rounded-lg text-xs uppercase font-bold tracking-tighter data-[state=active]:bg-slate-800 data-[state=active]:text-white">Past</TabsTrigger>
            </TabsList>

            <TabsContent value={tab} className="mt-6 space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-32 bg-slate-900/20 border border-slate-800 rounded-3xl animate-pulse" />
                  ))}
                </div>
              ) : matches.length === 0 ? (
                <div className="py-20 text-center">
                  <Gamepad2 className="h-12 w-12 text-slate-800 mx-auto mb-4" />
                  <p className="text-slate-500">No games found in this category</p>
                </div>
              ) : (
                matches.map((match) => {
                  const { date, time } = formatDateTime(match.scheduledAt)
                  const spotsLeft = match.maxParticipants - match.participants.length
                  const fillPercent = (match.participants.length / match.maxParticipants) * 100
                  
                  return (
                    <div key={match.id} className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 hover:border-yellow-500/30 transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-white group-hover:text-yellow-400 transition-colors">{match.title}</h3>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                            {date} • {time}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-yellow-500">{match.prizePool} TRX</p>
                          <p className="text-[10px] text-slate-500 uppercase font-bold">Prize Pool</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                          <span className="text-slate-400">Participants</span>
                          <span className="text-white">{match.participants.length} / {match.maxParticipants}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400" 
                            style={{ width: `${fillPercent}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex -space-x-2">
                          {match.participants.slice(0, 4).map((p) => (
                            <Avatar key={p.id} className="h-6 w-6 border border-slate-950">
                              <AvatarImage src={p.avatar} />
                              <AvatarFallback className="text-[8px]">{p.displayName.slice(0,2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                          ))}
                          {match.participants.length > 4 && (
                            <div className="h-6 w-6 rounded-full bg-slate-800 border border-slate-950 flex items-center justify-center text-[8px] font-bold">
                              +{match.participants.length - 4}
                            </div>
                          )}
                        </div>
                        
                        {match.status === 'upcoming' && (
                          <Button 
                            size="sm" 
                            className="bg-yellow-600 hover:bg-yellow-700 rounded-xl h-8 text-xs font-bold"
                            onClick={() => handleJoinMatch(match.id)}
                            disabled={joining === match.id}
                          >
                            {joining === match.id ? 'Joining...' : 'Enter Game'}
                          </Button>
                        )}
                        {match.status === 'live' && (
                          <Button size="sm" variant="destructive" className="rounded-xl h-8 text-xs font-bold animate-pulse">
                            Observe Live
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </TabsContent>
          </Tabs>
        </main>

        <BottomNav />
      </div>
    </div>
  )
}
