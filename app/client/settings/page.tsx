'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, Save } from 'lucide-react'

export default function ClientSettings() {
  const router = useRouter()
  const [client, setClient] = useState<any>(null)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const clientData = localStorage.getItem('client_user')
    if (clientData) {
      const parsed = JSON.parse(clientData)
      setClient(parsed)
      setName(parsed.name || '')
      
      // Only admins can access settings
      if (parsed.role !== 'admin') {
        router.push('/client/dashboard')
      }
    } else {
      router.push('/client/login')
    }
  }, [router])

  const handleSave = async () => {
    setError('')
    setMessage('')

    // Validate password
    if (password && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password && password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsSaving(true)

    try {
      const res = await fetch('/api/client/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: localStorage.getItem('client_token'),
          newName: name !== client.name ? name : undefined,
          newPassword: password || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to update settings')
        return
      }

      // Update local storage
      const updatedClient = { ...client, name }
      localStorage.setItem('client_user', JSON.stringify(updatedClient))
      setClient(updatedClient)
      setPassword('')
      setConfirmPassword('')
      setMessage('Settings updated successfully')
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!client) return null

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/client/dashboard">
            <button className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition">
              <ChevronLeft className="h-4 w-4" />
              Back to Dashboard
            </button>
          </Link>
        </div>

        {/* Settings Card */}
        <Card className="bg-slate-900/80 border-slate-700">
          <CardHeader>
            <CardTitle>Admin Settings</CardTitle>
            <CardDescription>Update your profile and security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {message && (
              <div className="bg-green-500/20 border border-green-500/50 text-green-300 px-3 py-2 rounded-lg text-sm">
                {message}
              </div>
            )}

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Profile Info */}
            <div>
              <label className="text-xs font-medium text-slate-300 mb-2 block">Email (Read-only)</label>
              <Input
                type="email"
                value={client.email}
                disabled
                className="bg-slate-800 border-slate-600 text-slate-400"
              />
            </div>

            {/* Name Update */}
            <div>
              <label className="text-xs font-medium text-slate-300 mb-2 block">Full Name</label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
                placeholder="Enter new name"
              />
            </div>

            {/* Divider */}
            <div className="border-t border-slate-700 pt-6">
              <p className="text-sm font-medium text-slate-300 mb-4">Change Password</p>
            </div>

            {/* Password Update */}
            <div>
              <label className="text-xs font-medium text-slate-300 mb-2 block">New Password (optional)</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
                placeholder="Leave blank to keep current password"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 mb-2 block">Confirm Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
                placeholder="Confirm new password"
              />
            </div>

            {/* Company Wallet Info */}
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
              <p className="text-xs text-slate-400 mb-1">Company Wallet</p>
              <p className="text-xs font-mono text-cyan-400 break-all">{client.company_wallet || 'Not set'}</p>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-800 flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
