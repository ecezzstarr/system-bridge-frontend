'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { WORLD_RULES } from '@/lib/world/constants'

const SUBSCRIPTION_AMOUNT = WORLD_RULES.BRIDGER_CONTINUANCE_NGN

type Continuance = {
  id: string
  role: string
  subscription_status: 'active' | 'due' | 'suspended'
  subscription_expiry: string | null
  is_subscription_exempt: boolean
  subscription_last_paid_at: string | null
}

export default function BridgerContinuancePage() {
  const { user, token } = useAuth()
  const userId = user?.id ?? null
  const [subscription, setContinuance] = useState<Continuance | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [reference, setReference] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userId) {
      fetchContinuance()
    } else {
      setLoading(false)
    }
  }, [userId, token])

  async function fetchContinuance() {
    setLoading(true)
    try {
      const res = await fetch('/api/bridger/subscription', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      const data = await res.json()
      if (data.success) {
        setContinuance(data.subscription)
      } else {
        setError(data.error || 'Failed to load subscription')
      }
    } catch (err) {
      setError('Failed to load subscription')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    if (!reference.trim()) {
      setError('Please enter a payment reference')
      return
    }

    setSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      const res = await fetch('/api/bridger/subscription/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          reference: reference.trim(),
          paymentMethod
        })
      })
      const data = await res.json()

      if (data.success) {
        setMessage('Payment submitted. An admin will review and approve it shortly.')
        setReference('')
      } else {
        setError(data.message || 'Submission failed')
      }
    } catch (err) {
      setError('Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  function statusBadge(status: string) {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      due: 'bg-yellow-100 text-yellow-800',
      suspended: 'bg-red-100 text-red-800'
    }
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading subscription...</div>
  }

  if (!userId) {
    return <div className="p-6 text-center text-red-600">You must be logged in to view this page.</div>
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Bridger Continuance</h1>

      {subscription && (
        <div className="border rounded-xl p-5 space-y-3 bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Status</span>
            {statusBadge(subscription.subscription_status)}
          </div>

          {subscription.is_subscription_exempt ? (
            <div className="text-sm text-gray-500">
              Your account is exempt from subscription payments.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Expiry date</span>
                <span>
                  {subscription.subscription_expiry
                    ? new Date(subscription.subscription_expiry).toLocaleDateString()
                    : 'Not set'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Last paid</span>
                <span>
                  {subscription.subscription_last_paid_at
                    ? new Date(subscription.subscription_last_paid_at).toLocaleDateString()
                    : 'Never'}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {!subscription?.is_subscription_exempt && (
        <div className="border rounded-xl p-5 bg-white shadow-sm space-y-4">
          <h2 className="text-lg font-medium">Pay Monthly Continuance — ₦{SUBSCRIPTION_AMOUNT.toLocaleString()}</h2>
          <p className="text-sm text-gray-500">
            Transfer ₦{SUBSCRIPTION_AMOUNT.toLocaleString()} using the method below, then submit your payment reference for admin approval.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Payment method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Payment reference / proof</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. transaction ID or teller number"
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}
            {message && <div className="text-sm text-green-600">{message}</div>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Payment'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
