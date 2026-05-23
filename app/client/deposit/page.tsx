'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, CreditCard, Wallet } from 'lucide-react'
import { getClientUser } from '@/lib/client-auth'
import Link from 'next/link'

const QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500]
const USD_TO_TRX_RATE = 10

export default function ClientDepositPage() {
  const router = useRouter()
  const [client, setClient] = useState<any>(null)
  const [amount, setAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const clientData = getClientUser()
    if (!clientData) {
      router.push('/client/login')
      return
    }
    setClient(clientData)
  }, [router])

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) < 1) {
      setError('Minimum deposit is $1')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/deposit/flutterwave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          email: client?.email,
          name: client?.name,
          userId: client?.id,
          userType: 'client',
        }),
      })

      const data = await response.json()
      
      if (data.success && data.paymentLink) {
        window.location.href = data.paymentLink
      } else {
        setError(data.error || 'Failed to initialize payment')
      }
    } catch (err) {
      setError('Payment initialization failed')
    } finally {
      setIsLoading(false)
    }
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
      </div>
    )
  }

  const trxAmount = amount ? parseFloat(amount) * USD_TO_TRX_RATE : 0

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        <Link href="/client/dashboard">
          <Button variant="ghost" className="mb-6 text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Button>
        </Link>

        <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Deposit Funds</h1>
              <p className="text-slate-400 text-sm">Pay with Flutterwave, receive TRX</p>
            </div>
          </div>

          <div className="mb-6">
            <label className="text-sm text-slate-400 mb-2 block">Amount (USD)</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="bg-slate-800 border-slate-600 text-white text-lg"
            />
            {amount && (
              <p className="text-sm text-cyan-400 mt-2">
                You will receive: <span className="font-bold">{trxAmount.toFixed(2)} TRX</span>
              </p>
            )}
          </div>

          <div className="mb-6">
            <p className="text-xs text-slate-500 mb-2">Quick Select</p>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_AMOUNTS.map((amt) => (
                <Button
                  key={amt}
                  variant={amount === String(amt) ? 'default' : 'outline'}
                  onClick={() => setAmount(String(amt))}
                  className={amount === String(amt) 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'border-slate-600 hover:bg-slate-800'
                  }
                >
                  ${amt}
                </Button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <Button
            onClick={handleDeposit}
            disabled={isLoading || !amount}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 text-white py-6 text-lg"
          >
            {isLoading ? 'Processing...' : `Deposit $${amount || '0'}`}
          </Button>

          <p className="text-xs text-slate-500 text-center mt-4">
            Rate: 1 USD = 10 TRX
          </p>
        </div>
      </div>
    </div>
  )
}
