'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { getClientUser } from '@/lib/client-auth'
import Link from 'next/link'

export default function ClientWithdrawPage() {
  const router = useRouter()
  const [client, setClient] = useState<any>(null)
  const [balance, setBalance] = useState(0)
  const [amount, setAmount] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const clientData = getClientUser()
    if (!clientData) {
      router.push('/client/login')
      return
    }
    setClient(clientData)
    fetch('/api/client/vault', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.success) setBalance(Number(data.vault?.balance || 0))
        else setError(data.error || 'Unable to load Client Vault')
      })
      .catch(() => setError('Unable to load Client Vault'))
  }, [router])

  const handleWithdraw = async () => {
    const value = Number(amount)
    if (!Number.isFinite(value) || value < 10) {
      setError('Minimum withdrawal is 10 TRX')
      return
    }
    if (!walletAddress || !walletAddress.startsWith('T') || walletAddress.length !== 34) {
      setError('Please enter a valid TRON wallet address')
      return
    }
    if (value > balance) {
      setError('Insufficient Client Vault balance')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess('')
    try {
      const response = await fetch('/api/client/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount: value, destination: walletAddress }),
      })
      const data = await response.json()
      if (data.success) {
        setSuccess(`Withdrawal ${data.withdrawal?.id || ''} is pending Admin review.`)
        setAmount('')
        setWalletAddress('')
      } else {
        setError(data.error || 'Withdrawal failed')
      }
    } catch {
      setError('Withdrawal request failed')
    } finally {
      setIsLoading(false)
    }
  }

  if (!client) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" /></div>

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        <Link href="/client/dashboard"><Button variant="ghost" className="mb-6 text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard</Button></Link>
        <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6"><div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center"><ArrowUpRight className="h-6 w-6 text-red-400" /></div><div><h1 className="text-2xl font-bold">Withdraw from Client Vault</h1><p className="text-slate-400 text-sm">TRX withdrawals require Admin review</p></div></div>
          <div className="mb-6 p-4 bg-slate-800/50 rounded-lg"><p className="text-sm text-slate-400">Available Client Vault</p><p className="text-3xl font-bold text-white">{balance.toFixed(2)} TRX</p></div>
          <div className="space-y-4 mb-6">
            <div><label className="text-sm text-slate-400 mb-2 block">Amount (TRX)</label><Input type="number" min="10" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Minimum 10 TRX" className="bg-slate-800 border-slate-600 text-white" /></div>
            <div><label className="text-sm text-slate-400 mb-2 block">TRON Wallet Address</label><Input value={walletAddress} onChange={e => setWalletAddress(e.target.value)} placeholder="T..." className="bg-slate-800 border-slate-600 text-white" /></div>
          </div>
          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>}
          {success && <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">{success}</div>}
          <Button onClick={handleWithdraw} disabled={isLoading || !amount || !walletAddress} className="w-full bg-gradient-to-r from-red-500 to-rose-500 hover:opacity-90 text-white py-6 text-lg">{isLoading ? 'Submitting...' : `Request ${amount || '0'} TRX`}</Button>
          <p className="text-xs text-slate-500 text-center mt-4">Your Client Vault balance is not deducted until Admin approves the withdrawal.</p>
        </div>
      </div>
    </div>
  )
}
