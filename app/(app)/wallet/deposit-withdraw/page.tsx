'use client'

import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowDownToLine, ArrowUpFromLine, Wallet, Copy, Check, Home } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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

  const getDashboardRoute = () => {
    if (!user) return '/dashboard'
    switch (user.role) {
      case 'admin': return '/admin/dashboard'
      case 'agent': return '/agent/dashboard'
      case 'bridger': return '/bridger/dashboard'
      default: return '/dashboard'
    }
  }

  useEffect(() => { fetchBalance() }, [user])

  const fetchBalance = async () => {
    if (!user) return
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/wallet/balance', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      const data = await response.json(); if (data.success) setBalance(data.coreTrx || 0)
    } catch (e) { console.error('Failed to fetch balance:', e) }
  }

  if (!user) return null

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) { setMessage('Please enter a valid amount'); return }
    setLoading(true); setMessage('')
    try {
      const response = await fetch('/api/deposit/flutterwave', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ amountUSD:parseFloat(amount) }) })
      const data=await response.json(); if(data.success&&data.paymentLink)window.location.href=data.paymentLink; else setMessage(data.error||'Failed to initialize payment')
    } catch { setMessage('Error processing deposit') } finally { setLoading(false) }
  }

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) { setMessage('Please enter a valid amount'); return }
    if (parseFloat(amount) > balance) { setMessage('Insufficient balance'); return }
    if (!withdrawAddress) { setMessage('Please enter a TRON wallet address'); return }
    setLoading(true); setMessage('')
    try {
      const token=localStorage.getItem('auth_token')
      const response=await fetch('/api/wallet/withdraw',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({amount:parseFloat(amount),address:withdrawAddress})})
      const data=await response.json(); if(data.success){setMessage(`Withdrawal of ${amount} TRX initiated! Processing time: 1-24 hours`);setAmount('');setWithdrawAddress('');fetchBalance()}else setMessage(data.error||'Withdrawal failed')
    } catch { setMessage('Error processing withdrawal') } finally { setLoading(false) }
  }

  const copyReferralLink = () => {
    const link = `${window.location.origin}/register?ref=${encodeURIComponent(user.id)}`
    navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const quickAmounts=[10,50,100,500,1000]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950">
      <div className="absolute inset-0 opacity-10"><div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px]"></div></div>
      <div className="relative z-10 p-6 md:p-8"><div className="max-w-2xl mx-auto">
        <div className="mb-8"><Link href={getDashboardRoute()}><Button variant="outline" className="border-slate-600 hover:bg-slate-800 mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Back to Dashboard</Button></Link><h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 mb-2">Deposit & Withdraw</h1><p className="text-slate-400">Manage your platform wallet funds</p></div>
        <div className="group relative mb-6"><div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl opacity-30 blur"></div><div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-6"><div className="flex items-center justify-between"><div><p className="text-slate-400 text-sm mb-1">Current Balance</p><div className="flex items-baseline gap-2"><span className="text-4xl font-bold text-cyan-400">{balance.toFixed(2)}</span><span className="text-xl text-slate-400">TRX</span></div></div><Wallet className="h-12 w-12 text-cyan-400/50" /></div></div></div>
        <div className="flex gap-2 mb-6"><Button onClick={()=>setActiveTab('deposit')} className={`flex-1 gap-2 ${activeTab==='deposit'?'bg-gradient-to-r from-green-500 to-emerald-500 text-white':'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}><ArrowDownToLine className="h-4 w-4" />Deposit</Button><Button onClick={()=>setActiveTab('withdraw')} className={`flex-1 gap-2 ${activeTab==='withdraw'?'bg-gradient-to-r from-orange-500 to-red-500 text-white':'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}><ArrowUpFromLine className="h-4 w-4" />Withdraw</Button></div>
        {activeTab==='deposit'&&<div className="group relative"><div className="relative bg-slate-900/80 border border-slate-700 rounded-2xl p-8"><h2 className="text-xl font-bold text-white mb-4">Deposit via Flutterwave</h2><p className="text-slate-400 text-sm mb-6">Pay in USD and receive TRX in your wallet (Rate: 1 USD = {TRX_RATE} TRX)</p><div className="mb-6"><label className="block text-sm font-semibold text-white mb-3">Amount (USD)</label><div className="relative"><span className="absolute left-3 top-3 text-slate-500">$</span><input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Enter amount in USD" className="w-full pl-8 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500" /></div>{amount&&<p className="text-green-400 text-sm mt-2">You will receive: {(parseFloat(amount)*TRX_RATE).toFixed(2)} TRX</p>}</div><div className="mb-6"><p className="text-sm text-slate-400 mb-3">Quick amounts (USD):</p><div className="grid grid-cols-5 gap-2">{quickAmounts.map(amt=><button key={amt} onClick={()=>setAmount(amt.toString())} className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white">${amt}</button>)}</div></div><Button onClick={handleDeposit} disabled={loading} className="w-full">{loading?'Processing...':'Continue to Flutterwave'}</Button></div></div>}
        {activeTab==='withdraw'&&<div className="relative bg-slate-900/80 border border-slate-700 rounded-2xl p-8"><h2 className="text-xl font-bold text-white mb-4">Withdraw TRX</h2><div className="mb-6"><label className="block text-sm font-semibold text-white mb-3">Amount (TRX)</label><input type="number" value={amount} onChange={e=>setAmount(e.target.value)} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white" /></div><div className="mb-6"><label className="block text-sm font-semibold text-white mb-3">TRON Address</label><input value={withdrawAddress} onChange={e=>setWithdrawAddress(e.target.value)} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white" /></div>{message&&<p className="text-sm text-slate-300 mb-4">{message}</p>}<Button onClick={handleWithdraw} disabled={loading} className="w-full">{loading?'Processing...':'Submit Withdrawal'}</Button></div>}
        <button onClick={copyReferralLink} className="mt-6 text-sm text-cyan-400">{copied?<><Check className="inline h-4 w-4 mr-1"/>Copied</>:<><Copy className="inline h-4 w-4 mr-1"/>Copy referral link</>}</button>
      </div></div>
    </div>
  )
}
