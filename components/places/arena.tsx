'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeftRight, Gamepad2, Users, Zap, Trophy, Plus, X, Loader2, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Wallet } from 'lucide-react'
import { useArenaMatches } from '@/lib/hooks'
import { useAuth } from '@/lib/auth-provider'
import api from '@/lib/api'

// Dice icons mapping
const DiceIcons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6]

export default function Arena() {
  const { user } = useAuth()
  const { data: matchesData, isLoading, mutate } = useArenaMatches({ limit: 20 })
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
  
  // Casino game state
  const [activeTab, setActiveTab] = useState<'matches' | 'casino'>('casino')
  const [betAmount, setBetAmount] = useState(5)
  const [diceResult, setDiceResult] = useState<number[]>([1, 1])
  const [isRolling, setIsRolling] = useState(false)
  const [gameResult, setGameResult] = useState<'win' | 'lose' | 'push' | null>(null)
  const [lastPayout, setLastPayout] = useState(0)
  const [playBalance, setPlayBalance] = useState(0)
  const [coreBalance, setCoreBalance] = useState(0)
  const [casinoHistory, setCasinoHistory] = useState<Array<{ bet: number; result: 'win' | 'lose' | 'push'; payout: number }>>([])
  const [error, setError] = useState<string | null>(null)
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferAmount, setTransferAmount] = useState(10)
  const [isTransferring, setIsTransferring] = useState(false)
  
  // Demo mode for users without TRX
  const [demoMode, setDemoMode] = useState(false)
  const [demoBalance, setDemoBalance] = useState(1000) // Start with 1000 demo credits

  // Fetch wallet balances on mount
  const fetchBalances = async () => {
    if (!user?.id) return
    try {
      const res = await fetch(`/api/wallet/transfer?userId=${user.id}`)
      const data = await res.json()
      if (data.playBalance !== undefined) setPlayBalance(data.playBalance)
      if (data.coreBalance !== undefined) setCoreBalance(data.coreBalance)
    } catch (e) {
      console.log('Failed to fetch balances', e)
    }
  }

  // Transfer between wallets
  const handleTransfer = async (direction: 'to_play' | 'to_core') => {
    if (!user?.id || transferAmount <= 0) return
    setIsTransferring(true)
    setError(null)
    try {
      const res = await fetch('/api/wallet/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, amount: transferAmount, direction })
      })
      const data = await res.json()
      if (res.ok) {
        setPlayBalance(data.playBalance)
        setCoreBalance(data.coreBalance)
        setShowTransfer(false)
      } else {
        setError(data.error)
      }
    } catch {
      setError('Transfer failed')
    }
    setIsTransferring(false)
  }

  // Load balances on mount
  useEffect(() => { fetchBalances() }, [user?.id])

  // Real casino dice game - calls API
  const rollDice = async () => {
    if (!user?.id) {
      setError('Please login to play')
      return
    }
    if (betAmount <= 0) return
    
    // Demo mode - local play without real TRX
    if (demoMode) {
      if (betAmount > demoBalance) {
        setError('Insufficient demo credits')
        return
      }
      
      setIsRolling(true)
      setGameResult(null)
      setError(null)
      
      // Animate dice rolling
      const rollInterval = setInterval(() => {
        setDiceResult([Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1])
      }, 100)
      
      setTimeout(() => {
        clearInterval(rollInterval)
        
        // Generate random dice result
        const die1 = Math.floor(Math.random() * 6) + 1
        const die2 = Math.floor(Math.random() * 6) + 1
        const total = die1 + die2
        
        let outcome: 'win' | 'lose' | 'push' = 'lose'
        let payout = 0
        
        if (total === 7 || total === 11) {
          outcome = 'win'
          payout = betAmount * 2
        } else if (total === 2 || total === 3 || total === 12) {
          outcome = 'lose'
          payout = 0
        } else {
          // For demo, make it more fun - 50% chance to win on other numbers
          if (Math.random() > 0.5) {
            outcome = 'win'
            payout = Math.floor(betAmount * 1.5)
          }
        }
        
        setDiceResult([die1, die2])
        setGameResult(outcome)
        setLastPayout(payout)
        setDemoBalance(prev => prev - betAmount + payout)
        setCasinoHistory(prev => [...prev.slice(-9), { bet: betAmount, result: outcome, payout }])
        setIsRolling(false)
      }, 1000)
      
      return
    }
    
    // Real TRX mode
    if (betAmount > playBalance) {
      setError('Insufficient play balance - transfer from core wallet')
      return
    }
    
    setIsRolling(true)
    setGameResult(null)
    setError(null)
    
    // Animate dice rolling
    const rollInterval = setInterval(() => {
      setDiceResult([Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1])
    }, 100)
    
    try {
      // Call real casino API
      const response = await fetch('/api/casino/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          betAmount,
          gameType: 'dice'
        })
      })
      
      const data = await response.json()
      
      // Stop animation after API returns
      setTimeout(() => {
        clearInterval(rollInterval)
        
        if (!response.ok) {
          setError(data.error || 'Game error')
          setIsRolling(false)
          return
        }
        
        // Update with real results from server
        setDiceResult(data.dice)
        setGameResult(data.outcome)
        setLastPayout(data.payout)
        setPlayBalance(data.playBalance || data.newBalance)
        if (data.coreBalance !== undefined) setCoreBalance(data.coreBalance)
        setCasinoHistory(prev => [...prev.slice(-9), { 
          bet: betAmount, 
          result: data.outcome, 
          payout: data.payout 
        }])
        setIsRolling(false)
      }, 1000)
      
    } catch (err) {
      clearInterval(rollInterval)
      setError('Network error - please try again')
      setIsRolling(false)
    }
  }

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
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Arena - Live Games</h1>
          <p className="text-xs text-slate-400">Play, win real TRX. Company holds funds as secure escrow.</p>
        </div>
        {activeTab === 'matches' && (
          <Button 
            size="sm" 
            className="bg-yellow-600 hover:bg-yellow-700 gap-1"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="h-3 w-3" />
            Create
          </Button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 p-1 bg-slate-800/50 rounded-lg">
        <button
          onClick={() => setActiveTab('casino')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            activeTab === 'casino'
              ? 'bg-yellow-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Casino
        </button>
        <button
          onClick={() => setActiveTab('matches')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            activeTab === 'matches'
              ? 'bg-yellow-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Matches
        </button>
      </div>

      {/* Casino Game */}
      {activeTab === 'casino' && (
        <div className="space-y-4">
          {/* Demo Mode Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <div>
              <p className="text-sm font-medium text-white">
                {demoMode ? '🎮 Demo Mode' : '💰 Real TRX Mode'}
              </p>
              <p className="text-xs text-slate-400">
                {demoMode ? 'Play with virtual credits - no real TRX' : 'Play with real TRX from your wallet'}
              </p>
            </div>
            <button
              onClick={() => {
                setDemoMode(!demoMode)
                setError(null)
                setGameResult(null)
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                demoMode 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-slate-600 hover:bg-slate-500 text-white'
              }`}
            >
              {demoMode ? 'Switch to Real' : 'Try Demo'}
            </button>
          </div>

          {/* Dice Game */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-yellow-500/30 rounded-xl p-5">
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold text-white flex items-center justify-center gap-2">
                <Dice6 className="h-5 w-5 text-yellow-400" />
                Lucky Dice
              </h2>
              <p className="text-xs text-slate-400 mt-1">Roll 7 or 11 to win 2x!</p>
            </div>

            {/* Dice Display */}
            <div className="flex justify-center gap-6 my-6">
              {diceResult.map((die, idx) => {
                const DiceIcon = DiceIcons[die - 1]
                return (
                  <div
                    key={idx}
                    className={`w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-lg ${
                      isRolling ? 'animate-bounce' : ''
                    } ${gameResult === 'win' ? 'ring-2 ring-green-400' : gameResult === 'lose' ? 'ring-2 ring-red-400' : ''}`}
                  >
                    <DiceIcon className="h-10 w-10 text-slate-900" />
                  </div>
                )
              })}
            </div>

            {/* Balance Display - Demo or Real */}
            {demoMode ? (
              <div className="text-center mb-3 py-3 bg-green-900/30 rounded-lg border border-green-500/30">
                <p className="text-xs text-green-400">Demo Credits</p>
                <p className="text-2xl font-bold text-green-400">{demoBalance.toFixed(0)} 🎮</p>
                <p className="text-xs text-slate-400 mt-1">Not real money - just for fun!</p>
                {demoBalance < 10 && (
                  <button
                    onClick={() => setDemoBalance(1000)}
                    className="mt-2 px-4 py-1 bg-green-600 hover:bg-green-700 rounded text-xs text-white"
                  >
                    Reset Demo Credits
                  </button>
                )}
              </div>
            ) : (
            <div className="text-center mb-3 py-3 bg-slate-800/50 rounded-lg">
              <div className="flex items-center justify-between px-4">
                <div>
                  <p className="text-xs text-slate-400">Play Balance</p>
                  <p className="text-xl font-bold text-yellow-400">{playBalance.toFixed(2)} TRX</p>
                </div>
                <button
                  onClick={() => setShowTransfer(!showTransfer)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-white transition"
                >
                  <ArrowLeftRight className="h-3 w-3" />
                  Transfer
                </button>
                <div>
                  <p className="text-xs text-slate-400">Core Wallet</p>
                  <p className="text-lg font-semibold text-cyan-400">{coreBalance.toFixed(2)} TRX</p>
                </div>
              </div>
              
              {/* Transfer Panel */}
              {showTransfer && (
                <div className="mt-3 pt-3 border-t border-slate-700 px-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Input
                      type="number"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(Math.max(1, Number(e.target.value)))}
                      className="bg-slate-800 border-slate-700 text-white text-center text-sm h-8"
                      min={1}
                    />
                    <span className="text-xs text-slate-400">TRX</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 h-7 text-xs bg-cyan-600 hover:bg-cyan-700"
                      onClick={() => handleTransfer('to_play')}
                      disabled={isTransferring || coreBalance < transferAmount}
                    >
                      {isTransferring ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Core -> Play'}
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-7 text-xs bg-yellow-600 hover:bg-yellow-700"
                      onClick={() => handleTransfer('to_core')}
                      disabled={isTransferring || playBalance < transferAmount}
                    >
                      {isTransferring ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Play -> Core'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="text-center py-2 rounded-lg mb-4 bg-red-500/20 text-red-400">
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Result Display */}
            {gameResult && !isRolling && (
              <div className={`text-center py-2 rounded-lg mb-4 ${
                gameResult === 'win' ? 'bg-green-500/20 text-green-400' : 
                gameResult === 'push' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                <p className="font-bold">
                  {gameResult === 'win' ? `You Won ${lastPayout} TRX!` : 
                   gameResult === 'push' ? 'Push - Bet Returned' :
                   `You Lost ${betAmount} TRX`}
                </p>
                <p className="text-xs opacity-75">Total: {diceResult[0] + diceResult[1]}</p>
              </div>
            )}

            {/* Bet Controls */}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Bet Amount {demoMode ? '(Demo)' : '(TRX)'}
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.max(1, Number(e.target.value)))}
                    className="bg-slate-800 border-slate-700 text-white text-center"
                    min={1}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBetAmount(Math.max(1, betAmount / 2))}
                    className="border-slate-700 text-slate-300"
                  >
                    /2
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBetAmount(betAmount * 2)}
                    className="border-slate-700 text-slate-300"
                  >
                    x2
                  </Button>
                </div>
              </div>

              <Button
                className={`w-full h-12 text-lg font-bold ${
                  demoMode 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                    : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600'
                }`}
                onClick={rollDice}
                disabled={isRolling || betAmount <= 0 || (demoMode ? betAmount > demoBalance : betAmount > playBalance)}
              >
                {isRolling ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Rolling...
                  </>
                ) : demoMode ? (
                  <>🎮 Roll Demo - {betAmount}</>
                ) : (
                  <>Roll Dice - {betAmount} TRX</>
                )}
              </Button>
            </div>

            {/* Quick Bets */}
            <div className="flex gap-2 mt-3">
              {[5, 10, 25, 50, 100].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setBetAmount(amount)}
                  className={`flex-1 py-1.5 text-xs rounded-md border transition-all ${
                    betAmount === amount
                      ? 'bg-yellow-600 border-yellow-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-yellow-500/50'
                  }`}
                >
                  {amount}
                </button>
              ))}
            </div>
          </div>

          {/* Game Rules */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-bold text-white mb-2">How to Play</h3>
            <div className="text-xs text-slate-400 space-y-1">
              <p>Roll 7 or 11 = Win 2x your bet</p>
              <p>Roll 2, 3, or 12 = Lose your bet</p>
              <p>Roll any other number = Win 1x (push)</p>
            </div>
          </div>

          {/* Recent Games */}
          {casinoHistory.length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
              <h3 className="text-sm font-bold text-white mb-2">Recent Games</h3>
              <div className="space-y-1">
                {casinoHistory.slice().reverse().map((game, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className={game.result === 'win' ? 'text-green-400' : 'text-red-400'}>
                      {game.result === 'win' ? 'Won' : 'Lost'}
                    </span>
                    <span className="text-slate-400">Bet: {game.bet} TRX</span>
                    <span className={game.result === 'win' ? 'text-green-400' : 'text-red-400'}>
                      {game.result === 'win' ? `+${game.payout}` : `-${game.bet}`} TRX
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Matches Tab Content */}
      {activeTab === 'matches' && (
        <>
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-yellow-400" />
            </div>
          )}

          {/* Empty State */}
          {!isLoading && matches.length === 0 && (
            <div className="text-center py-8 bg-slate-900/60 border border-slate-800 rounded-lg">
              <Gamepad2 className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No active matches</p>
              <p className="text-slate-500 text-xs mt-1">Be the first to create a match!</p>
            </div>
          )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-yellow-400" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && matches.length === 0 && (
        <div className="text-center py-8 bg-slate-900/60 border border-slate-800 rounded-lg">
          <Gamepad2 className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No active matches</p>
          <p className="text-slate-500 text-xs mt-1">Be the first to create a match!</p>
        </div>
      )}

      {/* Active Games */}
      <div className="space-y-3">
        {matches.map((match: any) => {
          const participantCount = match.participants?.length || 0
          const spotsLeft = (match.max_participants || match.maxParticipants || 10) - participantCount
          const isLive = match.status === 'live'
          const isUpcoming = match.status === 'upcoming'
          
          return (
            <div
              key={match.id}
              className={`bg-slate-900/60 border rounded-lg p-4 transition-all ${
                isLive ? 'border-yellow-500/50 ring-1 ring-yellow-500/30' : 'border-slate-800 hover:border-cyan-500/50'
              }`}
            >
              {/* Status Badge */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Gamepad2 className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                  <h3 className="text-sm font-bold text-white truncate">{match.title}</h3>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full border font-semibold flex-shrink-0 ${
                    isLive
                      ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
                      : isUpcoming
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                      : 'bg-slate-500/20 text-slate-300 border-slate-500/50'
                  }`}
                >
                  {isLive ? 'LIVE' : isUpcoming ? 'UPCOMING' : match.status?.toUpperCase()}
                </span>
              </div>

              {/* Description */}
              {match.description && (
                <p className="text-slate-400 text-xs mb-3">{match.description}</p>
              )}

              {/* Game Stats */}
              <div className="grid grid-cols-3 gap-2 mb-3 pb-3 border-b border-slate-700">
                {/* Players */}
                <div className="bg-slate-800/50 rounded p-2 border border-slate-700 text-center">
                  <Users className="h-3 w-3 text-cyan-400 mx-auto mb-0.5" />
                  <p className="text-xs text-slate-500">Players</p>
                  <p className="text-sm font-bold text-white">
                    {participantCount}/{match.max_participants || match.maxParticipants || 10}
                  </p>
                </div>

                {/* Entry Fee */}
                <div className="bg-slate-800/50 rounded p-2 border border-slate-700 text-center">
                  <Zap className="h-3 w-3 text-yellow-400 mx-auto mb-0.5" />
                  <p className="text-xs text-slate-500">Entry</p>
                  <p className="text-sm font-bold text-yellow-400">
                    {match.entry_fee || match.entryFee || 0} TRX
                  </p>
                </div>

                {/* Prize Pool */}
                <div className="bg-slate-800/50 rounded p-2 border border-slate-700 text-center">
                  <Trophy className="h-3 w-3 text-orange-400 mx-auto mb-0.5" />
                  <p className="text-xs text-slate-500">Pool</p>
                  <p className="text-sm font-bold text-orange-400">
                    {match.prize_pool || match.prizePool || 0} TRX
                  </p>
                </div>
              </div>

              {/* Host Info */}
              <div className="flex items-center justify-between gap-2 mb-3 text-xs">
                <div>
                  <p className="text-slate-500">Hosted by</p>
                  <p className="text-white font-medium">{match.host?.displayName || match.host?.name || 'Unknown'}</p>
                </div>
                <div className="text-slate-400">
                  {match.scheduled_at || match.scheduledAt
                    ? new Date(match.scheduled_at || match.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : ''}
                </div>
              </div>

              {/* Action Button */}
              {isUpcoming && spotsLeft > 0 && (
                <Button
                  className="w-full border-0 h-8 text-xs bg-yellow-600 hover:bg-yellow-700 text-white"
                  onClick={() => handleJoinMatch(match.id)}
                  disabled={joining === match.id}
                >
                  {joining === match.id ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      Joining...
                    </>
                  ) : (
                    'Join Game'
                  )}
                </Button>
              )}

              {isLive && (
                <Button
                  className="w-full border-0 h-8 text-xs bg-slate-700 text-slate-300"
                  disabled
                >
                  Game in Progress
                </Button>
              )}

              {match.status === 'completed' && (
                <Button
                  className="w-full border-0 h-8 text-xs bg-slate-700 text-slate-300"
                  disabled
                >
                  Completed
                </Button>
              )}

              {/* Escrow Info */}
              <p className="text-xs text-slate-500 mt-2 text-center">Escrow protected</p>
            </div>
          )
        })}
      </div>

          {/* Escrow System Info */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 mt-4">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-lg">&#128274;</span> How Escrow Works
            </h3>
            <div className="space-y-2 text-xs text-slate-400">
              <div>
                <p className="font-semibold text-white">1. Join Game</p>
                <p>Entry fee held in escrow</p>
              </div>
              <div>
                <p className="font-semibold text-white">2. Play</p>
                <p>Funds secured during game</p>
              </div>
              <div>
                <p className="font-semibold text-white">3. Win</p>
                <p>Winner receives TRX directly</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Create Match Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h2 className="text-lg font-bold text-white">Create Match</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">Title</label>
                <Input
                  value={newMatch.title}
                  onChange={(e) => setNewMatch({ ...newMatch, title: e.target.value })}
                  placeholder="Match title"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">Description</label>
                <Input
                  value={newMatch.description}
                  onChange={(e) => setNewMatch({ ...newMatch, description: e.target.value })}
                  placeholder="Optional description"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1 block">Entry Fee (TRX)</label>
                  <Input
                    type="number"
                    value={newMatch.entryFee}
                    onChange={(e) => setNewMatch({ ...newMatch, entryFee: Number(e.target.value) })}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1 block">Max Players</label>
                  <Input
                    type="number"
                    value={newMatch.maxParticipants}
                    onChange={(e) => setNewMatch({ ...newMatch, maxParticipants: Number(e.target.value) })}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">Start Time</label>
                <Input
                  type="datetime-local"
                  value={newMatch.startsAt}
                  onChange={(e) => setNewMatch({ ...newMatch, startsAt: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <Button 
                className="w-full bg-yellow-600 hover:bg-yellow-700" 
                onClick={handleCreateMatch}
                disabled={creating || !newMatch.title || !newMatch.startsAt}
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Match'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
