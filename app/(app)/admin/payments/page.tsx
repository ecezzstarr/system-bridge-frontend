'use client'

import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CreditCard, LogOut, ArrowRight, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { getAllUsers, recordAgentPayment, getAgentPayments, type MockUser } from '@/lib/mock-db'

export default function AdminPaymentPage() {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const [agents, setAgents] = useState<MockUser[]>([])
  const [mounted, setMounted] = useState(false)
  const [payments, setPayments] = useState<any[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    month: new Date().toISOString().slice(0, 7),
    confirmedFunctions: '',
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && user && user.role === 'admin') {
      const allUsers = getAllUsers()
      const agentsList = allUsers.filter(u => u.role === 'agent')
      setAgents(agentsList)
      
      // Load all payments
      const allPayments = agentsList.flatMap(agent => 
        getAgentPayments(agent.id).map(p => ({ ...p, agent }))
      )
      setPayments(allPayments)
    }
  }, [mounted, user])

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const handlePayAgent = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAgent || !paymentForm.amount || !paymentForm.confirmedFunctions) {
      alert('Please fill in all fields')
      return
    }

    const payment = recordAgentPayment(
      selectedAgent,
      parseFloat(paymentForm.amount),
      paymentForm.month,
      user.id,
      paymentForm.confirmedFunctions
    )

    setPayments([...payments, { ...payment, agent: agents.find(a => a.id === selectedAgent) }])
    setPaymentForm({ amount: '', month: new Date().toISOString().slice(0, 7), confirmedFunctions: '' })
    setSelectedAgent(null)
    alert('Payment recorded successfully!')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-blue-950/10 to-background">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Agent Payments</h1>
            <p className="text-sm text-slate-400">Manage monthly agent compensation via EIGHT</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Payment Form */}
        <div className="card p-6 sm:p-8 rounded-xl mb-8">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-cyan-400" />
            Record Agent Payment
          </h2>

          <form onSubmit={handlePayAgent} className="space-y-6">
            {/* Agent Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Select Agent</label>
              <select
                value={selectedAgent || ''}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">Choose an agent...</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} ({agent.username})
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Amount (TRX)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Month */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Payment Month</label>
                <input
                  type="month"
                  value={paymentForm.month}
                  onChange={(e) => setPaymentForm({ ...paymentForm, month: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Confirmed Functions */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Confirmed Functions/Work</label>
              <textarea
                value={paymentForm.confirmedFunctions}
                onChange={(e) => setPaymentForm({ ...paymentForm, confirmedFunctions: e.target.value })}
                placeholder="Describe what work the agent has done (e.g., 'Recruited 2 new bridgers, managed client onboarding')"
                rows={4}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
            >
              <CreditCard className="h-5 w-5" />
              Record Payment via EIGHT
            </button>
          </form>
        </div>

        {/* Payment History */}
        <div className="card p-6 sm:p-8 rounded-xl">
          <h2 className="text-xl font-bold text-white mb-6">Payment History</h2>

          {payments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 mb-2">No payments recorded yet</p>
              <p className="text-sm text-slate-500">Payments recorded above will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Agent</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Month</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Confirmed Work</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment, idx) => (
                    <tr key={idx} className="border-b border-slate-700 hover:bg-slate-800/50 transition">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-white">{payment.agent?.name}</p>
                          <p className="text-xs text-slate-500">@{payment.agent?.username}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-cyan-400">{payment.amount} TRX</span>
                      </td>
                      <td className="py-4 px-4 text-slate-300">{payment.month}</td>
                      <td className="py-4 px-4 text-slate-400 text-sm max-w-xs">{payment.confirmed_functions}</td>
                      <td className="py-4 px-4 text-slate-500 text-sm">
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
