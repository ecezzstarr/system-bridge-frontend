'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-provider'

type PendingPayment = {
  id: string
  user_id: string
  amount: string
  payment_method: string
  transaction_reference: string
  created_at: string
  email: string
  name: string
}

export default function AdminContinuancesPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const [pending, setPending] = useState<PendingPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [actingOn, setActingOn] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/admin/dashboard')
      return
    }
    fetchPending()
  }, [user])

  if (!user || user.role !== 'admin') return null

  async function fetchPending() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/subscriptions', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      const data = await res.json()
      if (data.success) {
        setPending(data.pending)
      } else {
        setError(data.error || 'Failed to load pending payments')
      }
    } catch (err) {
      setError('Failed to load pending payments')
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setActingOn(id)
    setError(null)
    try {
      const res = await fetch(`/api/admin/subscriptions/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action })
      })
      const data = await res.json()
      if (data.success) {
        setPending((prev) => prev.filter((p) => p.id !== id))
      } else {
        setError(`Failed to ${action} payment`)
      }
    } catch (err) {
      setError(`Failed to ${action} payment`)
    } finally {
      setActingOn(null)
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading pending subscription payments...</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pending Continuance Payments</h1>
        <button
          onClick={fetchPending}
          className="text-sm text-blue-600 hover:underline"
        >
          Refresh
        </button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {pending.length === 0 ? (
        <div className="text-center text-gray-500 py-12 border rounded-xl bg-white">
          No pending subscription payments.
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((p) => (
            <div key={p.id} className="border rounded-xl p-5 bg-white shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.name || 'Unnamed bridger'}</div>
                  <div className="text-sm text-gray-500">{p.email}</div>
                </div>
                <div className="text-lg font-semibold">
                  ₦{Number(p.amount).toLocaleString()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Method: </span>
                  {p.payment_method}
                </div>
                <div>
                  <span className="text-gray-500">Submitted: </span>
                  {new Date(p.created_at).toLocaleString()}
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Reference: </span>
                  <span className="font-mono">{p.transaction_reference}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => handleAction(p.id, 'approve')}
                  disabled={actingOn === p.id}
                  className="flex-1 bg-green-600 text-white rounded-lg py-2 font-medium disabled:opacity-50"
                >
                  {actingOn === p.id ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleAction(p.id, 'reject')}
                  disabled={actingOn === p.id}
                  className="flex-1 bg-red-100 text-red-700 rounded-lg py-2 font-medium disabled:opacity-50"
                >
                  {actingOn === p.id ? 'Processing...' : 'Reject'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
