'use client'

import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'
import { ArrowLeft, DollarSign, Plus } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DepositPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  if (!user) {
    return null
  }

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setMessage('Please enter a valid amount')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          amount: parseFloat(amount),
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setMessage(`Successfully deposited ${amount} TRX!`)
        setAmount('')
        setTimeout(() => router.push('/wallet'), 2000)
      } else {
        setMessage(data.error || 'Deposit failed')
      }
    } catch (error) {
      setMessage('Error processing deposit')
    } finally {
      setLoading(false)
    }
  }

  const quickAmounts = [100, 500, 1000, 5000, 10000]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      <div className="relative z-10 p-6 md:p-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/wallet">
              <Button variant="outline" className="border-slate-600 hover:bg-slate-800 mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 mb-2">
              Deposit to Platform Wallet
            </h1>
            <p className="text-slate-400">Add funds to your platform wallet for gaming and trading</p>
          </div>

          {/* Deposit Card */}
          <div className="group relative mb-6">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-2xl opacity-30 blur group-hover:opacity-50 transition duration-500"></div>
            <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-2xl p-8">
              <div className="mb-6">
                <p className="text-slate-400 text-sm mb-2">Current Platform Wallet Balance</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-cyan-400">{user.platform_wallet_balance}</span>
                  <span className="text-xl text-slate-400">TRX</span>
                </div>
              </div>

              {/* Amount Input */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-white mb-3">Deposit Amount (TRX)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Quick Amount Buttons */}
              <div className="mb-6">
                <p className="text-sm text-slate-400 mb-3">Quick amounts:</p>
                <div className="grid grid-cols-5 gap-2">
                  {quickAmounts.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setAmount(amt.toString())}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-cyan-500 rounded-lg text-sm text-white transition-all"
                    >
                      {amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              {message && (
                <div className={`p-3 rounded-lg mb-6 text-sm ${message.includes('Successfully') ? 'bg-green-500/20 border border-green-500/50 text-green-300' : 'bg-red-500/20 border border-red-500/50 text-red-300'}`}>
                  {message}
                </div>
              )}

              {/* Deposit Button */}
              <Button
                onClick={handleDeposit}
                disabled={loading || !amount}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0 py-6 text-lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                {loading ? 'Processing...' : 'Deposit Now'}
              </Button>

              <p className="text-xs text-slate-500 text-center mt-4">
                Minimum deposit: 10 TRX • No fees on deposits
              </p>
            </div>
          </div>

          {/* Info */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <p className="text-sm text-slate-300">
              <strong>Note:</strong> Your platform wallet is separate from your personal TRON wallet. Funds here are used for gaming in the Arena and trading in the Market. You can withdraw anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
