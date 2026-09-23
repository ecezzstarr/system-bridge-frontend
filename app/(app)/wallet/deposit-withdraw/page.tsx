'use client'

import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowDownToLine, ArrowUpFromLine, Wallet, Copy, Check, Home } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { WEAVE_OPAY_ACCOUNT_NUMBER } from '@/lib/opay-config'

// TRX rate: 1 USD = 10 TRX (example rate)
const TRX_RATE = 10

export default function WalletDepositWithdrawPage() {
  const { user } = useAuth()
  const isOpayRole = user?.role === 'admin' || user?.role === 'agent' || user?.role === 'bridger'
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [balance, setBalance] = useState(0)
  const [copied, setCopied] = useState(false)
  const [withdrawAddress, setWithdrawAddress] = useState('')
  const [trxRate, setTrxRate] = useState<number | null>(null)
  const [platformFeePercent, setPlatformFeePercent] = useState(5)
  const [withdrawBankName, setWithdrawBankName] = useState('')
  const [withdrawAccountNumber, setWithdrawAccountNumber] = useState('')
  const [withdrawAccountName, setWithdrawAccountName] = useState('')
  const [conversions, setConversions] = useState<any[]>([])
  const [depositStep, setDepositStep] = useState<'amount' | 'receipt'>('amount')
  const [pendingDepositId, setPendingDepositId] = useState<string | null>(null)
  const [pendingDepositAmountTrx, setPendingDepositAmountTrx] = useState<string>('')
  const [receiptText, setReceiptText] = useState('')

  // Determine the correct dashboard route based on user role
  const getTerminalRoute = () => {
    if (!user) return '/dashboard'
    switch (user.role) {
      case 'admin': return '/admin/dashboard'
      case 'agent': return '/agent/dashboard'
      case 'bridger': return '/bridger/dashboard'
      default: return '/dashboard'
    }
  }

  useEffect(() => {
    fetch('/api/rate/trx-ngn')
      .then(res => res.json())
      .then(data => {
        setTrxRate(data.rate)
        setPlatformFeePercent(data.platformFeePercent)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchBalance()
    if (user && ['admin', 'agent', 'bridger'].includes(user.role)) {
      fetchConversions()
    }
  }, [user])

  const fetchBalance = async () => {
    if (!user) return
    try {
      const token = localStorage.getItem('ssb_auth_token')
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

  const fetchConversions = async () => {
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch('/api/ledger', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      const data = await response.json()
      if (data.success && data.data?.ledger) {
        const list = data.data.ledger.filter((t: any) => 
          t.description.toLowerCase().includes('opay') || 
          t.description.toLowerCase().includes('converted')
        )
        setConversions(list.slice(0, 5))
      }
    } catch (e) {
      console.error('Failed to fetch conversions:', e)
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
      const token = localStorage.getItem('ssb_auth_token')
      const isOpay = ['admin', 'agent', 'bridger'].includes(user?.role || '')
      const endpoint = isOpay ? '/api/deposit/opay' : '/api/deposit/tron'
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          userId: user.id,
          amount: parseFloat(amount),
          txHash: !isOpay && message.includes('hash:') ? message.split('hash:')[1].trim() : '',
        }),
      })

      const data = await response.json()
      if (data.success) {
        if (isOpay && data.paymentLink) {
          // Redirect to OPay/Flutterwave payment page
          window.location.href = data.paymentLink
        } else if (isOpay && data.deposit?.id) {
          // Move to receipt-submission step for manual OPay verification
          setPendingDepositId(data.deposit.id)
          setPendingDepositAmountTrx(data.deposit.amount_trx || '')
          setDepositStep('receipt')
          setMessage('')
        } else {
          setMessage(`Success! Your deposit of ${amount} ${isOpay ? 'NGN' : 'TRX'} is being verified. Hash: ${data.txHash || 'Pending'}`)
          setAmount('')
          fetchBalance()
        }
      } else {
        setMessage(data.error || 'Deposit initialization failed')
      }
    } catch (error) {
      setMessage('Error processing deposit')
    } finally {
      setLoading(false)
    }
  }

  const submitReceipt = async () => {
    if (!receiptText.trim()) {
      setMessage('Please enter your OPay transaction reference or receipt details')
      return
    }
    setLoading(true)
    setMessage('')
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch('/api/deposit/opay/receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ depositId: pendingDepositId, receipt: receiptText }),
      })
      const data = await response.json()
      if (data.success) {
        setMessage('Receipt submitted! Admin will verify your deposit shortly.')
        setDepositStep('amount')
        setPendingDepositId(null)
        setPendingDepositAmountTrx('')
        setReceiptText('')
        setAmount('')
        fetchBalance()
      } else {
        setMessage(data.error || 'Failed to submit receipt')
      }
    } catch (error) {
      setMessage('Error submitting receipt')
    } finally {
      setLoading(false)
    }
  }

  const PLATFORM_TRON_WALLET = 'TNzNPekX1tbeFYRe3DPjnNV2dG6QfvHymt'

  const copyPlatformWallet = () => {
    navigator.clipboard.writeText(PLATFORM_TRON_WALLET)
    setMessage('Wallet address copied to clipboard!')
    setTimeout(() => setMessage(''), 3000)
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
      const token = localStorage.getItem('ssb_auth_token')
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

  const handleOpayWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setMessage('Please enter a valid amount')
      return
    }
    if (parseFloat(amount) > balance) {
      setMessage('Insufficient balance')
      return
    }
    if (!withdrawBankName || !withdrawAccountNumber || !withdrawAccountName) {
      setMessage('Please fill in all bank details')
      return
    }
    setLoading(true)
    setMessage('')
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch('/api/wallet/withdraw/opay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          userId: user.id,
          amount: parseFloat(amount),
          bankName: withdrawBankName,
          accountNumber: withdrawAccountNumber,
          accountName: withdrawAccountName,
        }),
      })
      const data = await response.json()
      if (data.success) {
        setMessage(data.message || `Withdrawal of ${amount} TRX initiated via OPay!`)
        setAmount('')
        setWithdrawBankName('')
        setWithdrawAccountNumber('')
        setWithdrawAccountName('')
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
    const link = `https://ssbnow.shop/register?ref=${user.id}`
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
          <div className="mb-8 flex items-start justify-between">
            <div>
              <Link href={getTerminalRoute()}>
                <Button variant="outline" className="border-slate-600 hover:bg-slate-800 mb-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Terminal
                </Button>
              </Link>
              <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 mb-2">
                Deposit & Withdraw
              </h1>
              <p className="text-slate-400">Manage your platform wallet funds</p>
            </div>
            <div className="text-right">
              <div className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full inline-block">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">{user.role}</span>
              </div>
            </div>
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
                  {['admin', 'agent', 'bridger'].includes(user.role) && (
                    <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                      <Check className="h-3 w-3 text-green-500" />
                      Automatic conversion active
                    </p>
                  )}
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
            <div className="space-y-6">
              <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl opacity-20 blur"></div>
                <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-2xl p-8">
                  {isOpayRole && depositStep === 'receipt' ? (
                    <>
                      <h2 className="text-xl font-bold text-white mb-4">Submit Payment Proof</h2>
                      <p className="text-slate-400 text-sm mb-6">
                        Your deposit record has been created for <strong>{pendingDepositAmountTrx} TRX</strong>. Send the NGN payment to OPay account <strong>{WEAVE_OPAY_ACCOUNT_NUMBER}</strong>, then paste your transaction reference or receipt details below. An admin will verify and credit your wallet.
                      </p>

                      <div className="mb-6">
                        <label className="block text-sm font-semibold text-white mb-3">Transaction Reference / Receipt</label>
                        <textarea
                          value={receiptText}
                          onChange={(e) => setReceiptText(e.target.value)}
                          placeholder="Paste your OPay transaction ID or receipt details here..."
                          rows={4}
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                        />
                      </div>

                      {message && (
                        <div className={`p-3 rounded-lg mb-6 text-sm ${message.includes('Success') || message.includes('submitted') ? 'bg-green-500/20 border border-green-500/50 text-green-300' : 'bg-red-500/20 border border-red-500/50 text-red-300'}`}>
                          {message}
                        </div>
                      )}

                      <div className="flex gap-3">
                        <Button
                          onClick={() => { setDepositStep('amount'); setPendingDepositId(null); setReceiptText(''); setMessage('') }}
                          variant="outline"
                          className="flex-1 border-slate-700 text-slate-400 hover:bg-slate-800 py-6"
                        >
                          Back
                        </Button>
                        <Button
                          onClick={submitReceipt}
                          disabled={loading || !receiptText.trim()}
                          className="flex-[2] bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 py-6 text-lg"
                        >
                          {loading ? 'Submitting...' : 'Submit Receipt'}
                        </Button>
                      </div>
                    </>
                  ) : ['admin', 'agent', 'bridger'].includes(user.role) ? (
                    <>
                      <h2 className="text-xl font-bold text-white mb-4">Deposit via OPay (NGN) - Manual Verification</h2>
                      <p className="text-slate-400 text-sm mb-6">
                        Deposit Naira (NGN) safely with OPay. Funds will be <strong>automatically converted to TRX</strong> at the current platform rate and credited to your wallet for use in the Arena and Casino.
                      </p>
                      
                      <div className="mb-6 grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Exchange Rate</p>
                          <p className="text-cyan-400 font-bold">{trxRate ? `1 TRX = ₦${trxRate.toFixed(2)}` : 'Loading...'}</p>
                        </div>
                        <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Target Asset</p>
                          <p className="text-white font-bold">TRX (TRON)</p>
                        </div>
                      </div>

                      {/* Amount Input */}
                      <div className="mb-6">
                        <label className="block text-sm font-semibold text-white mb-3">Amount to Deposit (NGN)</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Enter amount in Naira"
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">NGN</div>
                        </div>
                        {amount && trxRate && (
                          <p className="text-xs text-cyan-400 mt-2">
                            Estimated conversion: <span className="font-bold">{(parseFloat(amount) / trxRate).toFixed(6)} TRX</span>
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <h2 className="text-xl font-bold text-white mb-4">Deposit via TRON (TRX)</h2>
                      <p className="text-slate-400 text-sm mb-6">Send TRX to the platform vault address below. Your balance will be updated automatically once the transaction is confirmed on the blockchain.</p>

                      {/* Platform Wallet Address */}
                      <div className="mb-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Platform Vault Address</p>
                        <div className="flex items-center justify-between gap-2">
                          <code className="text-cyan-400 font-mono text-sm break-all">{PLATFORM_TRON_WALLET}</code>
                          <Button onClick={copyPlatformWallet} variant="ghost" size="sm" className="shrink-0 hover:bg-slate-700">
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Amount Input */}
                      <div className="mb-6">
                        <label className="block text-sm font-semibold text-white mb-3">Amount Deposited (TRX)</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Enter amount in TRX"
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Quick Amounts */}
                  <div className="mb-6">
                    <p className="text-sm text-slate-400 mb-3">Quick select ({['admin', 'agent', 'bridger'].includes(user.role) ? 'NGN' : 'TRX'}):</p>
                    <div className="grid grid-cols-5 gap-2">
                      {[1000, 5000, 10000, 50000, 100000].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setAmount(amt.toString())}
                          className="px-2 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-green-500 rounded-lg text-[10px] text-white transition-all font-mono"
                        >
                          {amt >= 1000 ? `${amt/1000}k` : amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {message && (
                    <div className={`p-3 rounded-lg mb-6 text-sm ${message.includes('Success') || message.includes('copied') ? 'bg-green-500/20 border border-green-500/50 text-green-300' : 'bg-red-500/20 border border-red-500/50 text-red-300'}`}>
                      {message}
                    </div>
                  )}

                  <Button
                    onClick={handleDeposit}
                    disabled={loading || !amount}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 py-6 text-lg"
                  >
                    {loading ? 'Processing...' : `Deposit ${['admin', 'agent', 'bridger'].includes(user.role) ? 'NGN' : 'TRX'}`}
                  </Button>

                  <p className="text-xs text-slate-500 text-center mt-4">
                    {['admin', 'agent', 'bridger'].includes(user.role) 
                      ? `Manual OPay Deposit: Send NGN to OPay ${WEAVE_OPAY_ACCOUNT_NUMBER}, then submit your deposit for admin verification.` 
                      : 'Transfers are typically confirmed within 1-5 minutes'}
                  </p>
                </div>
              </div>

              {['admin', 'agent', 'bridger'].includes(user.role) && (
                <div className="space-y-6">
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Conversion Rationale</h3>
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
                          <span className="text-cyan-400 text-xs font-bold">1</span>
                        </div>
                        <p className="text-slate-400 text-sm">All Arena matches and Casino games operate exclusively on the TRON (TRX) blockchain for transparency and speed.</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
                          <span className="text-cyan-400 text-xs font-bold">2</span>
                        </div>
                        <p className="text-slate-400 text-sm">By depositing in Naira, the system handles the liquidity bridge for you, ensuring you always have TRX ready for play.</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
                          <span className="text-cyan-400 text-xs font-bold">3</span>
                        </div>
                        <p className="text-slate-400 text-sm">Winnings are also accumulated in TRX and can be withdrawn to any TRON-compatible wallet.</p>
                      </div>
                    </div>
                  </div>

                  {conversions.length > 0 && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                      <h3 className="text-lg font-bold text-white mb-4">Conversion History</h3>
                      <div className="space-y-3">
                        {conversions.map((conv) => (
                          <div key={conv.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                            <div>
                              <p className="text-xs text-white font-medium">{conv.description.split(':')[0]}</p>
                              <p className="text-[10px] text-slate-500">{new Date(conv.created_at).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-cyan-400">+{conv.amount} TRX</p>
                              <p className="text-[9px] text-slate-500">Converted from NGN</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Withdraw Tab */}
          {activeTab === 'withdraw' && (
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl opacity-20 blur"></div>
              <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-2xl p-8">
                {isOpayRole ? (
                  <>
                    <h2 className="text-xl font-bold text-white mb-4">Withdraw via OPay (NGN)</h2>
                    <p className="text-slate-400 text-sm mb-6">Cash out your TRX balance to your bank account via OPay.</p>

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
                      {amount && trxRate && (
                        <p className="text-xs text-orange-400 mt-2">
                          You'll receive: <span className="font-bold">₦{(parseFloat(amount) * trxRate * (1 - platformFeePercent / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                          {' '}(rate: 1 TRX = ₦{trxRate.toFixed(2)}, {platformFeePercent}% fee)
                        </p>
                      )}
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-white mb-3">Bank Name</label>
                      <input
                        type="text"
                        value={withdrawBankName}
                        onChange={(e) => setWithdrawBankName(e.target.value)}
                        placeholder="e.g. OPay"
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-white mb-3">Account Number</label>
                      <input
                        type="text"
                        value={withdrawAccountNumber}
                        onChange={(e) => setWithdrawAccountNumber(e.target.value)}
                        placeholder="Enter account number"
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-white mb-3">Account Name</label>
                      <input
                        type="text"
                        value={withdrawAccountName}
                        onChange={(e) => setWithdrawAccountName(e.target.value)}
                        placeholder="Enter account name"
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      />
                    </div>

                    {message && (
                      <div className={`p-3 rounded-lg mb-6 text-sm ${message.includes('initiated') ? 'bg-green-500/20 border border-green-500/50 text-green-300' : 'bg-red-500/20 border border-red-500/50 text-red-300'}`}>
                        {message}
                      </div>
                    )}

                    <Button
                      onClick={handleOpayWithdraw}
                      disabled={loading || !amount || !withdrawBankName || !withdrawAccountNumber || !withdrawAccountName}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 py-6 text-lg"
                    >
                      {loading ? 'Processing...' : 'Withdraw'}
                    </Button>

                    <p className="text-xs text-slate-500 text-center mt-4">
                      Minimum withdrawal: 10 TRX - Processing time: 1-24 hours
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-white mb-4">Withdraw TRX</h2>
                    <p className="text-slate-400 text-sm mb-6">Withdraw TRX to your external TRON wallet</p>

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
                  </>
                )}
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
                  value={`https://ssbnow.shop/register?ref=${user.id}`}
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
