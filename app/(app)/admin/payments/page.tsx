'use client'

import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CreditCard, LogOut, DollarSign } from 'lucide-react'

type Agent = { id: string; name: string; username: string }
type Payment = {
  id: string
  agent_id: string
  agent_name: string
  agent_username: string
  amount: number | string
  currency: string
  payment_month: string
  confirmed_functions: string
  payment_date: string
  status: string
}

export default function AdminPaymentPage() {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState('')
  const [message, setMessage] = useState('')
  const [paymentForm, setPaymentForm] = useState({ amount: '', month: new Date().toISOString().slice(0, 7), confirmedFunctions: '' })

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/agent-payments', { cache: 'no-store' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Unable to load agent payments')
      setAgents(body.agents || [])
      setPayments(body.payments || [])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load agent payments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') void load()
  }, [user?.role])

  if (isLoading || loading && user?.role === 'admin') {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="text-muted-foreground">Loading...</div></div>
  }

  if (!user || user.role !== 'admin') return null

  const handleLogout = () => { logout(); router.push('/login') }

  const handlePayAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    if (!selectedAgent || !paymentForm.amount || !paymentForm.confirmedFunctions.trim()) {
      setMessage('Please fill in all fields')
      return
    }
    try {
      const res = await fetch('/api/admin/agent-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: selectedAgent, amount: Number(paymentForm.amount), paymentMonth: paymentForm.month, confirmedFunctions: paymentForm.confirmedFunctions }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Unable to record payment')
      setPaymentForm({ amount: '', month: new Date().toISOString().slice(0, 7), confirmedFunctions: '' })
      setSelectedAgent('')
      setMessage('Payment recorded successfully.')
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to record payment')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-blue-950/10 to-background">
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div><h1 className="text-2xl sm:text-3xl font-bold text-white">Agent Payments</h1><p className="text-sm text-slate-400">Manage monthly agent compensation via Administration</p></div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Logout</span></button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && <div className="mb-6 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">{message}</div>}

        <div className="card p-6 sm:p-8 rounded-xl mb-8">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><CreditCard className="h-6 w-6 text-cyan-400" />Record Agent Payment</h2>
          <form onSubmit={handlePayAgent} className="space-y-6">
            <div><label className="block text-sm font-medium text-slate-300 mb-2">Select Agent</label><select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"><option value="">Choose an agent...</option>{agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name} ({agent.username})</option>)}</select></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div><label className="block text-sm font-medium text-slate-300 mb-2">Amount (TRX)</label><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" /><input type="number" min="0" step="0.00000001" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} placeholder="0.00" className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500" /></div></div>
              <div><label className="block text-sm font-medium text-slate-300 mb-2">Payment Month</label><input type="month" value={paymentForm.month} onChange={e => setPaymentForm({ ...paymentForm, month: e.target.value })} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500" /></div>
            </div>
            <div><label className="block text-sm font-medium text-slate-300 mb-2">Confirmed Functions/Work</label><textarea value={paymentForm.confirmedFunctions} onChange={e => setPaymentForm({ ...paymentForm, confirmedFunctions: e.target.value })} placeholder="Describe confirmed work" rows={4} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 resize-none" /></div>
            <button type="submit" className="w-full px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-medium rounded-lg transition flex items-center justify-center gap-2"><CreditCard className="h-5 w-5" />Record Payment</button>
          </form>
        </div>

        <div className="card p-6 sm:p-8 rounded-xl">
          <h2 className="text-xl font-bold text-white mb-6">Payment History</h2>
          {payments.length === 0 ? <div className="text-center py-12"><CreditCard className="h-16 w-16 text-slate-600 mx-auto mb-4" /><p className="text-slate-400">No payments recorded yet</p></div> : <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-700"><th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Agent</th><th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Amount</th><th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Month</th><th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Confirmed Work</th><th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Date</th></tr></thead><tbody>{payments.map(payment => <tr key={payment.id} className="border-b border-slate-700 hover:bg-slate-800/50 transition"><td className="py-4 px-4"><p className="font-medium text-white">{payment.agent_name}</p><p className="text-xs text-slate-500">@{payment.agent_username}</p></td><td className="py-4 px-4"><span className="font-bold text-cyan-400">{payment.amount} {payment.currency}</span></td><td className="py-4 px-4 text-slate-300">{payment.payment_month}</td><td className="py-4 px-4 text-slate-400 text-sm max-w-xs">{payment.confirmed_functions}</td><td className="py-4 px-4 text-slate-500 text-sm">{new Date(payment.payment_date).toLocaleDateString()}</td></tr>)}</tbody></table></div>}
        </div>
      </div>
    </div>
  )
}
