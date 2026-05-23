'use client'

import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowDownToLine, ArrowUpFromLine, Wallet, Copy, Check, Home } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// TRX rate: 1 USD = 10 TRX (example rate)
const TRX_RATE = 10

export default function WalletDepositWithdrawPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [balance, setBalance] = useState(0)
  const [copied, setCopied] = useState(false)
  const [withdrawAddress, setWithdrawAddress] = useState('')

  // Determine the correct dashboard route based on user role
  const getDashboardRoute = () => {
    if (!user) return '/dashboard'
    switch (user.role) {
      case 'admin': return '/admin/dashboard'
      case 'agent': return '/agent/dashboard'
      case 'bridger': return '/bridger/dashboard'
      default: return '/dashboard'
    }
  }

  useEffect(() => {
    fetchBalance()
  }, [user])

  const fetchBalance = async () => {
    if (!user) return
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/wallet/balance', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      const data = await response.json()
      if (data.success) {
        setBalance(data.coreTrx || 0)
      }
    } catch (e) {
      console.error('Failed to fetch balance:', e)
    }
  }

  if (!user) {
    return null
  }

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setMessage('Please enter a valid amount')
      return
    }

    setLoading(true)
    setMessage('')
    try {
      const response = await fetch('/api/deposit/flutterwave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          name: user.name,
          amountUSD: parseFloat(amount),
        }),
      })

      const data = await response.json()
      if (data.success && data.paymentLink) {
        // Redirect to Flutterwave payment page
        window.location.href = data.paymentLink
      } else {
        setMessage(data.error || 'Failed to initialize payment')
      }
    } catch (error) {
      setMessage('Error processing deposit')
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setMessage('Please enter a valid amount')
      return
    }

    if (parseFloat(amount) > balance) {
      setMessage('Insufficient balance')
      return
    }

    if (!withdrawAddress) {
      setMessage('Please enter a TRON wallet address')
      return
    }

    setLoading(true)
    setMessage('')
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          userId: user.id,
          amount: parseFloat(amount),
          address: withdrawAddress,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setMessage(`Withdrawal of ${amount} TRX initiated! Processing time: 1-24 hours`)
        setAmount('')
        setWithdrawAddress('')
        fetchBalance()
      } else {
        setMessage(data.error || 'Withdrawal failed')
      }
    } catch (error) {
      setMessage('Error processing withdrawal')
    } finally {
      setLoading(false)
    }
  }

  const copyReferralLink = () => {
    const link = `https://v0-live-site-deployment-pink.vercel.app/register?ref=${user.id}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const quickAmounts = [10, 50, 100, 500, 1000]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      <div className="relative z-10 p-6 md:p-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href={getDashboardRoute()}>
              <Button variant="outline" className="border-slate-600 hover:bg-slate-800 mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 mb-2">
              Deposit & Withdraw
            </h1>
            <p className="text-slate-400">Manage your platform wallet funds</p>
          </div>

          {/* Balance Card */}
          <div className="group relative mb-6">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl opacity-30 blur"></div>
            <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Current Balance</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-cyan-400">{balance.toFixed(2)}</span>
                    <span className="text-xl text-slate-400">TRX</span>
                  </div>
                </div>
                <Wallet className="h-12 w-12 text-cyan-400/50" />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <Button
              onClick={() => setActiveTab('deposit')}
              className={`flex-1 gap-2 ${
                activeTab === 'deposit'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <ArrowDownToLine className="h-4 w-4" />
              Deposit
            </Button>
            <Button
              onClick={() => setActiveTab('withdraw')}
              className={`flex-1 gap-2 ${
                activeTab === 'withdraw'
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <ArrowUpFromLine className="h-4 w-4" />
              Withdraw
            </Button>
          </div>

          {/* Deposit Tab */}
          {activeTab === 'deposit' && (
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl opacity-20 blur"></div>
              <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-2xl p-8">
                <h2 className="text-xl font-bold text-white mb-4">Deposit via Flutterwave</h2>
                <p className="text-slate-400 text-sm mb-6">Pay in USD and receive TRX in your wallet (Rate: 1 USD = {TRX_RATE} TRX)</p>

                {/* Amount Input */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-white mb-3">Amount (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-500">$</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount in USD"
                      className="w-full pl-8 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                    />
                  </div>
                  {amount && (
                    <p className="text-green-400 text-sm mt-2">
                      You will receive: {(parseFloat(amount) * TRX_RATE).toFixed(2)} TRX
                    </p>
                  )}
                </div>

                {/* Quick Amounts */}
                <div className="mb-6">
                  <p className="text-sm text-slate-400 mb-3">Quick amounts (USD):</p>
                  <div className="grid grid-cols-5 gap-2">
                    {quickAmounts.map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setAmount(amt.toString())}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-green-500 rounded-lg text-sm text-white transition-all"
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                </div>

                {message && (
                  <div className={`p-3 rounded-lg mb-6 text-sm ${message.includes('initiated') || message.includes('Success') ? 'bg-green-500/20 border border-green-500/50 text-green-300' : 'bg-red-500/20 border border-red-500/50 text-red-300'}`}>
                    {message}
                  </div>
                )}

                <Button
                  onClick={handleDeposit}
                  disabled={loading || !amount}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 py-6 text-lg"
                >
                  {loading ? 'Processing...' : 'Deposit Now'}
                </Button>

                <p className="text-xs text-slate-500 text-center mt-4">
                  Powered by Flutterwave - Secure payments
                </p>
              </div>
            </div>
          )}

          {/* Withdraw Tab */}
          {activeTab === 'withdraw' && (
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl opacity-20 blur"></div>
              <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-2xl p-8">
                <h2 className="text-xl font-bold text-white mb-4">Withdraw TRX</h2>
                <p className="text-slate-400 text-sm mb-6">Withdraw TRX to your external TRON wallet</p>

                {/* Amount Input */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-white mb-3">Amount (TRX)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter TRX amount"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                  <p className="text-slate-500 text-sm mt-2">Available: {balance.toFixed(2)} TRX</p>
                </div>

                {/* Wallet Address */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-white mb-3">TRON Wallet Address</label>
                  <input
                    type="text"
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                    placeholder="Enter your TRON wallet address (T...)"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                {message && (
                  <div className={`p-3 rounded-lg mb-6 text-sm ${message.includes('initiated') ? 'bg-green-500/20 border border-green-500/50 text-green-300' : 'bg-red-500/20 border border-red-500/50 text-red-300'}`}>
                    {message}
                  </div>
                )}

                <Button
                  onClick={handleWithdraw}
                  disabled={loading || !amount || !withdrawAddress}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 py-6 text-lg"
                >
                  {loading ? 'Processing...' : 'Withdraw'}
                </Button>

                <p className="text-xs text-slate-500 text-center mt-4">
                  Minimum withdrawal: 10 TRX - Processing time: 1-24 hours
                </p>
              </div>
            </div>
          )}

          {/* Referral Link Section */}
          <div className="mt-8 group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl opacity-20 blur"></div>
            <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-2">Your Referral Link</h3>
              <p className="text-slate-400 text-sm mb-4">Share your link and earn rewards when people join!</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`https://v0-live-site-deployment-pink.vercel.app/register?ref=${user.id}`}
                  className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-sm"
                />
                <Button
                  onClick={copyReferralLink}
                  className="bg-purple-500 hover:bg-purple-600 text-white"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
