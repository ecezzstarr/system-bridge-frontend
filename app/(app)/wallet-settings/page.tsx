'use client'

import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Wallet, Copy, Check } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function WalletSettingsPage() {
  const { user } = useAuth()
  const [personalWallet, setPersonalWallet] = useState(user?.personal_wallet_address || '')
  const [isEditing, setIsEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  if (!user) return null

  const handleSaveWallet = async () => {
    setIsSaving(true)
    try {
      // Validate TRON address format (starts with T and is 34 characters)
      if (personalWallet && !personalWallet.startsWith('T')) {
        alert('Invalid TRON wallet address. Must start with T')
        setIsSaving(false)
        return
      }

      const response = await fetch('/api/wallet/personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: personalWallet }),
      })

      if (response.ok) {
        setIsEditing(false)
        alert('Personal wallet saved successfully!')
      } else {
        alert('Failed to save wallet address')
      }
    } catch (error) {
      console.error('Error saving wallet:', error)
      alert('Error saving wallet address')
    } finally {
      setIsSaving(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(personalWallet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-950 border-b border-slate-800 px-4 py-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <button className="p-1.5 hover:bg-slate-800 rounded-lg transition">
              <ArrowLeft className="h-5 w-5 text-slate-400" />
            </button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">Personal Wallet</h1>
            <p className="text-xs text-slate-400">Manage your TRON wallet address</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 max-w-md mx-auto">
        {/* Info Cards */}
        <div className="space-y-4 mb-6">
          {/* Platform Wallet */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-4 w-4 text-cyan-400" />
              <p className="text-xs text-slate-400 font-semibold">Platform Wallet</p>
            </div>
            <p className="text-2xl font-bold text-cyan-400 mb-1">{user.platform_wallet_balance || 0}</p>
            <p className="text-xs text-slate-500">Gaming balance (for Arena, Market)</p>
          </div>

          {/* Personal Wallet */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-400" />
                <p className="text-xs text-slate-400 font-semibold">Your TRON Wallet</p>
              </div>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded transition text-white"
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={personalWallet}
                  onChange={(e) => setPersonalWallet(e.target.value)}
                  placeholder="Enter TRON address (starts with T)"
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <div className="text-xs text-slate-400">
                  <p className="mb-2">TRON Address Format:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Starts with letter T</li>
                    <li>34 characters total</li>
                    <li>Example: TRaJcVQZfJzxTL7SEh7LGmxm3Qp2Y8wFSw</li>
                  </ul>
                </div>
                <Button
                  onClick={handleSaveWallet}
                  disabled={isSaving}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-0 h-9"
                >
                  {isSaving ? 'Saving...' : 'Save Wallet'}
                </Button>
              </div>
            ) : (
              <div>
                {personalWallet ? (
                  <div className="flex items-start gap-2 p-3 bg-slate-800/50 rounded border border-slate-700">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-emerald-400 break-all">{personalWallet}</p>
                      <p className="text-xs text-slate-500 mt-1">Connected and active</p>
                    </div>
                    <button
                      onClick={copyToClipboard}
                      className="p-1.5 hover:bg-slate-700 rounded transition flex-shrink-0"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-800/30 rounded border border-slate-700 border-dashed text-center">
                    <p className="text-xs text-slate-500">No wallet connected yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-3">
          <h3 className="font-bold text-white text-sm">Why add a personal wallet?</h3>
          <ul className="text-xs text-slate-400 space-y-2">
            <li className="flex gap-2">
              <span className="text-cyan-400 flex-shrink-0">•</span>
              <span>Deposit funds from your personal wallet to your gaming account</span>
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-400 flex-shrink-0">•</span>
              <span>Withdraw winnings directly to your TRON wallet</span>
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-400 flex-shrink-0">•</span>
              <span>Track all transactions on the blockchain</span>
            </li>
          </ul>
        </div>

        {/* Security Notice */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mt-4">
          <p className="text-xs text-yellow-600">
            <span className="font-bold">⚠️ Security:</span> Your personal wallet address is only used for deposits and withdrawals. We never request your private key.
          </p>
        </div>
      </div>
    </div>
  )
}
