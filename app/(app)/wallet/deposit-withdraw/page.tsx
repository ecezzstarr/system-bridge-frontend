'use client'

import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'
import { ArrowRight, ArrowDownToLine, ArrowUpFromLine, Wallet, Copy, Check, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { WEAVE_OPAY_ACCOUNT_NUMBER } from '@/lib/opay-config'

export default function WalletDepositWithdrawPage() {
  const { user } = useAuth()
  const isOpayRole = user?.role === 'admin' || user?.role === 'agent' || user?.role === 'bridger'
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [balance, setBalance] = useState(0)
  const [withdrawAddress, setWithdrawAddress] = useState('')
  const [flameCoinRate, setFlameCoinRate] = useState<number | null>(null)
  const [trxPaymentRate, setTrxPaymentRate] = useState<number | null>(null)
  const [companyTrxWallet, setCompanyTrxWallet] = useState('')
  const [depositTxHash, setDepositTxHash] = useState('')
  const [platformFeePercent, setPlatformFeePercent] = useState(5)
  const [withdrawBankName, setWithdrawBankName] = useState('')
  const [withdrawAccountNumber, setWithdrawAccountNumber] = useState('')
  const [withdrawAccountName, setWithdrawAccountName] = useState('')
  const [conversions, setConversions] = useState<any[]>([])
  const [depositStep, setDepositStep] = useState<'amount' | 'receipt'>('amount')
  const [pendingDepositId, setPendingDepositId] = useState<string | null>(null)
  const [pendingDepositFlameCoin, setPendingDepositFlameCoin] = useState<string>('')
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
    fetch('/api/rate/flame-coin-ngn')
      .then(res => res.json())
      .then(data => {
        setFlameCoinRate(data.rate)
        setPlatformFeePercent(data.platformFeePercent)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchBalance()
    if (user && isOpayRole) {
      fetchConversions()
    }
  }, [user, isOpayRole])

  useEffect(() => {
    if (!user || isOpayRole) return
    fetch('/api/rate/trx-payment-ngn')
      .then(res => res.json())
      .then(data => {
        if (!data.success) return
        setTrxPaymentRate(data.rateNgnPerTrx)
        setCompanyTrxWallet(data.companyTrxWallet || '')
      })
      .catch(() => {})
  }, [user, isOpayRole])

  const fetchBalance = async () => {
    if (!user) return
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch('/api/wallet/balance', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      const data = await response.json()
      if (data.success) {
        setBalance(data.flameCoinBalance ?? 0)
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
    if (!isOpayRole && !depositTxHash.trim()) {
      setMessage('Enter the TRX transaction hash after sending to the Company TRX wallet')
      return
    }

    setLoading(true)
    setMessage('')
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const endpoint = isOpayRole ? '/api/deposit/opay' : '/api/deposit/tron'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          ...(isOpayRole ? {} : { txHash: depositTxHash.trim() }),
        }),
      })

      const data = await response.json()
      if (data.success) {
        if (isOpayRole && data.paymentLink) {
          window.location.href = data.paymentLink
        } else if (isOpayRole && data.deposit?.id) {
          setPendingDepositId(data.deposit.id)
          setPendingDepositFlameCoin(data.deposit.amount_trx || '')
          setDepositStep('receipt')
          setMessage('')
        } else {
          setMessage(`TRX payment submitted. Administration will verify it and credit the equivalent Flame Coin.`)
          setAmount('')
          setDepositTxHash('')
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
        setPendingDepositFlameCoin('')
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

  const copyPlatformWallet = () => {
    if (!companyTrxWallet) return
    navigator.clipboard.writeText(companyTrxWallet)
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
      setMessage('Please enter a external wallet address')
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
          amount: parseFloat(amount),
          address: withdrawAddress,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setMessage(`Withdrawal of ${amount} Flame Coin initiated! Processing time: 1-24 hours`)
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
          amount: parseFloat(amount),
          bankName: withdrawBankName,
          accountNumber: withdrawAccountNumber,
          accountName: withdrawAccountName,
        }),
      })
      const data = await response.json()
      if (data.success) {
        setMessage(data.message || `Withdrawal of ${amount} Flame Coin initiated via OPay!`)
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

  const quickAmounts = [10, 50, 100, 500, 1000]

  return (
    <main className="mx-auto w-full max-w-5xl p-3 md:p-6">
      <section className="weave-system-depth overflow-hidden rounded-[2rem] border border-cyan-300/15 bg-[#030a15]/72">
        <header className="border-b border-white/10 bg-[radial-gradient(circle_at_14%_0%,rgba(34,211,238,.13),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(16,185,129,.07),transparent_28%)] p-5 md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <Link href={getTerminalRoute()} className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.14em] text-sky-300">
                Return to operating room <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <p className="mt-4 weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-cyan-300">Value Movement Engine</p>
              <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">Deposit, verification, conversion and withdrawal are one recorded value lifecycle.</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">Every deposit creates a verifiable movement before Flame Coin is credited. Every withdrawal moves from recorded balance into an authorized external rail.</p>
            </div>
            <div className="rounded-xl border border-cyan-300/15 bg-cyan-400/[0.05] px-4 py-3 text-right">
              <p className="text-[8px] font-black uppercase tracking-wider text-cyan-300">Current position</p>
              <p className="mt-1 text-sm font-black capitalize text-white">{user.role}</p>
            </div>
          </div>
        </header>

        <div className="grid gap-4 p-4 md:p-6 lg:grid-cols-[1fr_280px]">
          <section className="min-w-0">

          {/* Balance Card */}
          <div className="group relative mb-6">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl opacity-30 blur"></div>
            <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Current Balance</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-cyan-400">{balance.toFixed(2)}</span>
                    <span className="text-xl text-slate-400">Flame Coin</span>
                  </div>
                  {isOpayRole && (
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
                        Your deposit record has been created for <strong>{pendingDepositFlameCoin} Flame Coin</strong>. Send the NGN payment to OPay account <strong>{WEAVE_OPAY_ACCOUNT_NUMBER}</strong>, then paste your transaction reference or receipt details below. An admin will verify and credit your wallet.
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
                  ) : isOpayRole ? (
                    <>
                      <h2 className="text-xl font-bold text-white mb-4">Deposit via OPay (NGN) - Manual Verification</h2>
                      <p className="text-slate-400 text-sm mb-6">
                        Deposit Naira (NGN) through the Company OPay account. The verified Naira amount is converted at the current TRX/NGN price and credited as Flame Coin for purchases, subscriptions, workshops, Arena, Casino, and other paid participation across Weave.
                      </p>
                      
                      <div className="mb-6 grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Exchange Rate</p>
                          <p className="text-cyan-400 font-bold">{flameCoinRate ? `1 Flame Coin = ₦${flameCoinRate.toFixed(2)}` : 'Loading...'}</p>
                        </div>
                        <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Target Asset</p>
                          <p className="text-white font-bold">Flame Coin</p>
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
                        {amount && flameCoinRate && (
                          <p className="text-xs text-cyan-400 mt-2">
                            Estimated conversion: <span className="font-bold">{(parseFloat(amount) / flameCoinRate).toFixed(6)} Flame Coin</span>
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <h2 className="text-xl font-bold text-white mb-4">Fund Flame Coin with TRX</h2>
                      <p className="text-slate-400 text-sm mb-6">Send real TRX to the Company TRX payment wallet below. After verification, the same number of Flame Coins is credited to your Weave balance.</p>

                      {/* Platform Wallet Address */}
                      <div className="mb-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Company TRX Payment Wallet</p>
                        <div className="flex items-center justify-between gap-2">
                          <code className="text-cyan-400 font-mono text-sm break-all">{companyTrxWallet}</code>
                          <Button onClick={copyPlatformWallet} variant="ghost" size="sm" className="shrink-0 hover:bg-slate-700">
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Amount Input */}
                      <div className="mb-6">
                        <label className="block text-sm font-semibold text-white mb-3">Amount Sent (TRX)</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Enter TRX amount"
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                          />
                        </div>
                      </div>
                      {amount && (
                        <p className="text-xs text-cyan-400 -mt-4 mb-6">
                          After verification: <span className="font-bold">{parseFloat(amount).toLocaleString(undefined, { maximumFractionDigits: 6 })} TRX = {parseFloat(amount).toLocaleString(undefined, { maximumFractionDigits: 6 })} Flame Coin</span>
                          {trxPaymentRate ? <> · NGN value ≈ ₦{(parseFloat(amount) * trxPaymentRate).toLocaleString(undefined, { maximumFractionDigits: 2 })}</> : null}
                        </p>
                      )}
                      <div className="mb-6">
                        <label className="block text-sm font-semibold text-white mb-3">TRX Transaction Hash</label>
                        <input
                          type="text"
                          value={depositTxHash}
                          onChange={(e) => setDepositTxHash(e.target.value)}
                          placeholder="Paste the TRX transaction hash"
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                        />
                      </div>
                    </>
                  )}

                  {/* Quick Amounts */}
                  <div className="mb-6">
                    <p className="text-sm text-slate-400 mb-3">Quick select ({isOpayRole ? 'NGN' : 'TRX'}):</p>
                    <div className="grid grid-cols-5 gap-2">
                      {(isOpayRole ? [1000, 5000, 10000, 50000, 100000] : [1, 5, 10, 50, 100]).map((amt) => (
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
                    disabled={loading || !amount || (!isOpayRole && !depositTxHash.trim())}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 py-6 text-lg"
                  >
                    {loading ? 'Processing...' : `Deposit ${isOpayRole ? 'NGN' : 'TRX'}`}
                  </Button>

                  <p className="text-xs text-slate-500 text-center mt-4">
                    {isOpayRole 
                      ? `Manual OPay Deposit: Send NGN to OPay ${WEAVE_OPAY_ACCOUNT_NUMBER}, then submit your deposit for admin verification.` 
                      : 'Send TRX, submit its transaction hash, and Administration will verify 1 TRX = 1 Flame Coin.'}
                  </p>
                </div>
              </div>

              {isOpayRole && (
                <div className="space-y-6">
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Conversion Rationale</h3>
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
                          <span className="text-cyan-400 text-xs font-bold">1</span>
                        </div>
                        <p className="text-slate-400 text-sm">Flame Coin is Weave's internal purchasing unit for platform purchases, subscriptions, workshops, Arena, Casino, and other paid participation.</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
                          <span className="text-cyan-400 text-xs font-bold">2</span>
                        </div>
                        <p className="text-slate-400 text-sm">Agents and Bridgers fund Flame Coin through verified Naira payments to the Company OPay account.</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
                          <span className="text-cyan-400 text-xs font-bold">3</span>
                        </div>
                        <p className="text-slate-400 text-sm">Clients fund Flame Coin by sending TRX to the Company TRX wallet; after verification, 1 TRX credits 1 Flame Coin.</p>
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
                              <p className="text-sm font-bold text-cyan-400">+{conv.amount} Flame Coin</p>
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
                    <p className="text-slate-400 text-sm mb-6">Cash out your Flame Coin balance to your bank account via OPay.</p>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-white mb-3">Amount (Flame Coin)</label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter Flame Coin amount"
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      />
                      <p className="text-slate-500 text-sm mt-2">Available: {balance.toFixed(2)} Flame Coin</p>
                      {amount && flameCoinRate && (
                        <p className="text-xs text-orange-400 mt-2">
                          You'll receive: <span className="font-bold">₦{(parseFloat(amount) * flameCoinRate * (1 - platformFeePercent / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                          {' '}(rate: 1 Flame Coin = ₦{flameCoinRate.toFixed(2)}, {platformFeePercent}% fee)
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
                      Minimum withdrawal: 10 Flame Coin - Processing time: 1-24 hours
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-white mb-4">Withdraw Flame Coin</h2>
                    <p className="text-slate-400 text-sm mb-6">Withdraw Flame Coin as TRX to your external TRON wallet</p>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-white mb-3">Amount (Flame Coin)</label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter Flame Coin amount"
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      />
                      <p className="text-slate-500 text-sm mt-2">Available: {balance.toFixed(2)} Flame Coin</p>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-white mb-3">TRON Wallet Address</label>
                      <input
                        type="text"
                        value={withdrawAddress}
                        onChange={(e) => setWithdrawAddress(e.target.value)}
                        placeholder="Enter your external wallet address (T...)"
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
                      Minimum withdrawal: 10 Flame Coin - Processing time: 1-24 hours
                    </p>
                  </>
                )}
              </div>
            </div>
          )}


          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-emerald-300/15 bg-emerald-400/[0.04] p-4">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">Value causality</p></div>
              <div className="mt-3 space-y-2 text-xs font-semibold text-slate-300">
                <p>External value → deposit record.</p>
                <p>Deposit record → verification.</p>
                <p>Verification → Flame Coin credit.</p>
                <p>Flame Coin → participation or withdrawal.</p>
              </div>
            </section>

            <section className="rounded-3xl border border-sky-300/15 bg-sky-400/[0.04] p-4">
              <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-sky-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">Recorded balance</p></div>
              <p className="mt-3 text-2xl font-black text-white">{balance.toFixed(2)}</p>
              <p className="text-xs font-black text-slate-300">Flame Coin</p>
              <Link href="/ledger" className="mt-4 inline-flex w-full items-center justify-between rounded-xl border border-sky-300/15 bg-sky-400/[0.06] px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-sky-100">Open Record <ArrowRight className="h-3.5 w-3.5"/></Link>
            </section>

            <section className="rounded-3xl border border-amber-300/15 bg-amber-400/[0.04] p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">Referral separation</p>
              <p className="mt-3 text-xs leading-5 text-slate-300">Referral movement no longer appears inside Wallet because value transfer and role referral are separate systems. Bridger referral continuity remains in the Bridger Operating Room where it is actually recorded.</p>
            </section>
          </aside>
        </div>
      </section>
    </main>
  )
}
