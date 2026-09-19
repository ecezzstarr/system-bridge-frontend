'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeftRight, Gamepad2, Trophy, Loader2, Dice6, Zap, Star, Flame, Sparkles, LayoutGrid, Users } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'

// Dice icons mapping
import { Dice1, Dice2, Dice3, Dice4, Dice5 } from 'lucide-react'
const DiceIcons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6]

const CASINO_GAMES = [
  { id: 'dice', name: 'Lucky Dice', icon: Dice6, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  { id: 'slots', name: 'Crystal Slots', icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  { id: 'crash', name: 'Aviator', icon: Flame, color: 'text-red-400', bg: 'bg-red-400/10' },
  { id: 'live', name: 'Live Dealers', icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
]

const MIN_BET = 2
const MAX_BET = 1000
const PUSH_RETURN_PERCENT = 50 // must mirror app/api/casino/play/route.ts

export default function Casino({ user: propUser }: { user?: any }) {
  const { user: authUser } = useAuth()
  const user = propUser || authUser
  const [activeGame, setActiveGame] = useState('dice')
  const [betAmount, setBetAmount] = useState(10)
  const [customAmountInput, setCustomAmountInput] = useState('')
  const [betAmountError, setBetAmountError] = useState<string | null>(null)
  const [diceResult, setDiceResult] = useState<number[]>([1, 1])
  const [isRolling, setIsRolling] = useState(false)
  const [gameResult, setGameResult] = useState<'win' | 'lose' | 'push' | null>(null)
  const [lastNetChange, setLastNetChange] = useState(0)
  const [balance, setBalance] = useState(0)
  const [casinoHistory, setCasinoHistory] = useState<Array<{ bet: number; result: 'win' | 'lose' | 'push'; netChange: number }>>([])
  const [error, setError] = useState<string | null>(null)

  const [demoMode, setDemoMode] = useState(false)
  const [demoBalance, setDemoBalance] = useState(1000)

  const fetchBalances = async () => {
    if (!user?.id) return
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const res = await fetch(`/api/wallet/balance?userId=${user.id}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      const data = await res.json()
      if (data.coreTrx !== undefined) setBalance(data.coreTrx)
    } catch (e) {
      console.log('Failed to fetch balance', e)
    }
  }

  useEffect(() => { fetchBalances() }, [user?.id])

  const applyBetAmount = (value: number) => {
    if (Number.isNaN(value)) {
      setBetAmountError('Enter a valid number')
      return
    }
    if (value < MIN_BET) {
      setBetAmountError(`Minimum bet is ${MIN_BET} TRX`)
      setBetAmount(value)
      return
    }
    if (value > MAX_BET) {
      setBetAmountError(`Maximum bet is ${MAX_BET} TRX`)
      setBetAmount(value)
      return
    }
    setBetAmountError(null)
    setBetAmount(value)
  }

  const handleCustomAmountChange = (raw: string) => {
    setCustomAmountInput(raw)
    if (raw.trim() === '') {
      setBetAmountError(null)
      return
    }
    const parsed = Number(raw)
    applyBetAmount(parsed)
  }

  const rollDice = async () => {
    if (!user?.id) {
      setError('Please login to participate')
      return
    }
    if (betAmount < MIN_BET) {
      setError(`Minimum bet is ${MIN_BET} TRX`)
      return
    }
    if (betAmount > MAX_BET) {
      setError(`Maximum bet is ${MAX_BET} TRX`)
      return
    }

    if (demoMode) {
      if (betAmount > demoBalance) {
        setError('Insufficient demo credits')
        return
      }
      setIsRolling(true)
      setGameResult(null)
      setError(null)
      const rollInterval = setInterval(() => {
        setDiceResult([Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1])
      }, 100)

      setTimeout(() => {
        clearInterval(rollInterval)
        const d1 = Math.floor(Math.random() * 6) + 1
        const d2 = Math.floor(Math.random() * 6) + 1
        const total = d1 + d2
        let outcome: 'win' | 'lose' | 'push' = 'lose'
        let payout = 0
        if (total === 7 || total === 11) { outcome = 'win'; payout = betAmount * 2 }
        else if (total === 2 || total === 3 || total === 12) { outcome = 'lose'; payout = 0 }
        else { outcome = 'push'; payout = betAmount * (PUSH_RETURN_PERCENT / 100) }
        const netChange = payout - betAmount

        setDiceResult([d1, d2])
        setGameResult(outcome)
        setLastNetChange(netChange)
        setDemoBalance(prev => prev + netChange)
        setCasinoHistory(prev => [...prev.slice(-9), { bet: betAmount, result: outcome, netChange }])
        setIsRolling(false)
      }, 1000)
      return
    }

    if (betAmount > balance) {
      setError('Insufficient balance for this play')
      return
    }

    setIsRolling(true)
    setGameResult(null)
    setError(null)
    const rollInterval = setInterval(() => {
      setDiceResult([Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1])
    }, 100)

    try {
      const response = await fetch('/api/casino/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, betAmount, gameType: 'dice' })
      })
      const data = await response.json()
      setTimeout(() => {
        clearInterval(rollInterval)
        if (!response.ok) {
          setError(data.error || 'Play error')
          setIsRolling(false)
          return
        }
        setDiceResult(data.dice)
        setGameResult(data.outcome)
        setLastNetChange(data.netChange)
        setBalance(data.newBalance)
        setCasinoHistory(prev => [...prev.slice(-9), { bet: betAmount, result: data.outcome, netChange: data.netChange }])
        setIsRolling(false)
      }, 1000)
    } catch (err) {
      clearInterval(rollInterval)
      setError('Network connection issues')
      setIsRolling(false)
    }
  }

  const currentBalance = demoMode ? demoBalance : balance
  const canPlay = !isRolling && betAmount >= MIN_BET && betAmount <= MAX_BET && betAmount <= currentBalance

  return (
    <div className="px-4 py-4 space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-600 to-red-600 p-6 shadow-lg shadow-orange-900/20">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="h-7 w-7" />
            GRAND CASINO
          </h1>
          <p className="text-orange-100 text-[10px] font-bold uppercase tracking-widest mt-1">The Pattern of Luck and Skill</p>
        </div>
        <div className="absolute top-0 right-0 p-4 opacity-20">
          <Sparkles className="h-24 w-24 text-white" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {CASINO_GAMES.map((game) => (
          <button
            key={game.id}
            onClick={() => setActiveGame(game.id)}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              activeGame === game.id
                ? 'bg-slate-800 border-orange-500/50 ring-1 ring-orange-500/30 shadow-lg'
                : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className={`p-2 rounded-lg ${game.bg}`}>
              <game.icon className={`h-5 w-5 ${game.color}`} />
            </div>
            <span className={`text-sm font-bold ${activeGame === game.id ? 'text-white' : 'text-slate-400'}`}>
              {game.name}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-4 animate-in fade-in duration-700">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Echo Reflection</span>
        </div>
        <p className="text-xs text-slate-400 italic">
          Luck is the intersection of preparation and the Weave's favor. The pattern of play is consistent.
        </p>
      </div>

      {activeGame === 'dice' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-inner">
            <div className="flex justify-center gap-8 my-8">
              {diceResult.map((die, idx) => {
                const DiceIcon = DiceIcons[die - 1]
                return (
                  <div
                    key={idx}
                    className={`w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl transform transition-all duration-300 ${
                      isRolling ? 'animate-bounce' : 'rotate-0 hover:rotate-12'
                    } ${gameResult === 'win' ? 'ring-4 ring-green-400 scale-110' : gameResult === 'lose' ? 'ring-4 ring-red-400 opacity-80' : ''}`}
                  >
                    <DiceIcon className="h-12 w-12 text-slate-950" />
                  </div>
                )
              })}
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Available to Play</p>
                  <p className="text-xl font-black text-orange-400">{demoMode ? demoBalance.toFixed(0) : balance.toFixed(2)} <span className="text-xs font-normal text-slate-400">{demoMode ? 'Credits' : 'TRX'}</span></p>
                </div>
                {!demoMode && (
                  <a href="/wallet/deposit-withdraw">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-400 hover:text-white hover:bg-slate-700 gap-2"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                      Deposit
                    </Button>
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                {[10, 25, 50, 100].map(amt => (
                  <button
                    key={amt}
                    onClick={() => { applyBetAmount(amt); setCustomAmountInput('') }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${
                      betAmount === amt && customAmountInput === '' ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {amt}
                  </button>
                ))}
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">Or enter a custom amount (min {MIN_BET} TRX)</p>
                <Input
                  type="number"
                  min={MIN_BET}
                  max={MAX_BET}
                  step="1"
                  value={customAmountInput}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  placeholder={`e.g. ${MIN_BET}`}
                  className="bg-slate-950 border-slate-800 text-white"
                />
                {betAmountError && (
                  <p className="text-xs text-red-400 mt-1.5">{betAmountError}</p>
                )}
              </div>

              <Button
                className="w-full h-16 text-xl font-black bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 bg-[length:200%_auto] animate-gradient hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-orange-900/40"
                onClick={rollDice}
                disabled={!canPlay}
              >
                {isRolling ? <Loader2 className="h-7 w-7 animate-spin" /> : `PLAY ${betAmount} ${demoMode ? 'CREDITS' : 'TRX'}`}
              </Button>
            </div>
          </div>

          {gameResult && !isRolling && (
            <div className={`p-4 rounded-xl border animate-in zoom-in-95 duration-300 ${
              lastNetChange > 0 ? 'bg-green-500/10 border-green-500/30 text-green-400' :
              lastNetChange < 0 ? 'bg-red-500/10 border-red-500/30 text-red-400' :
              'bg-orange-500/10 border-orange-500/30 text-orange-400'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-widest text-sm">
                  {gameResult === 'win' ? 'Victory' : gameResult === 'push' ? 'Neutral' : 'Defeat'}
                </span>
                <span className="text-2xl font-black">
                  {lastNetChange > 0 ? `+${lastNetChange.toFixed(2)}` : lastNetChange < 0 ? `${lastNetChange.toFixed(2)}` : '0'}
                </span>
              </div>
              {gameResult === 'push' && (
                <p className="text-xs mt-1 opacity-80">
                  {PUSH_RETURN_PERCENT}% of your stake was returned.
                </p>
              )}
            </div>
          )}

          <div className="bg-slate-900/40 rounded-2xl p-4 border border-slate-800/50">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Recent Sessions</h3>
            <div className="space-y-2">
              {casinoHistory.slice().reverse().map((h, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${h.result === 'win' ? 'bg-green-500' : h.result === 'push' ? 'bg-orange-500' : 'bg-red-500'}`} />
                    <span className="text-sm text-slate-300 font-medium">{h.result === 'win' ? 'Won' : h.result === 'push' ? 'Push' : 'Lost'}</span>
                  </div>
                  <span className={`text-sm font-mono font-bold ${h.netChange > 0 ? 'text-green-400' : h.netChange < 0 ? 'text-red-400' : 'text-orange-400'}`}>
                    {h.netChange > 0 ? `+${h.netChange.toFixed(2)}` : h.netChange.toFixed(2)}
                  </span>
                </div>
              ))}
              {casinoHistory.length === 0 && (
                <p className="text-center text-slate-600 text-xs py-4 italic">No recent activity found.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
          <div className="p-4 rounded-full bg-slate-800 mb-4">
            <LayoutGrid className="h-10 w-10 text-slate-600" />
          </div>
          <h3 className="text-white font-bold">New Experience Coming</h3>
          <p className="text-slate-500 text-sm max-w-[200px] mt-2">The Weave is integrating more patterns here soon.</p>
        </div>
      )}

      <div className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl border border-slate-800">
        <div>
          <p className="text-sm font-bold text-white">{demoMode ? 'Practice Mode' : 'Authentic Play'}</p>
          <p className="text-[10px] text-slate-500">{demoMode ? 'Virtual credits only' : 'Using actual TRX resources'}</p>
        </div>
        <button
          onClick={() => { setDemoMode(!demoMode); setError(null); setGameResult(null) }}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
            demoMode ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          {demoMode ? 'SWITCH TO TRX' : 'TRY PRACTICE'}
        </button>
      </div>
    </div>
  )
}
