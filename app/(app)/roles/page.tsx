'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SettingsPage() {
  const { user, token } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  if (!user) {
    return (
      <div className="p-6 text-slate-400">
        You need to be logged in to view settings.
      </div>
    )
  }

  const handleSave = async () => {
    setError('')
    setMessage('')

    if (newPassword && newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (newPassword && newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          name: name !== user.name ? name : undefined,
          newPassword: newPassword || undefined,
          confirmPassword: confirmPassword || undefined,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to update settings')
        return
      }

      setMessage('Settings updated successfully')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-md mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground mt-2">
          Signed in as {user.email} ({user.role})
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your name and password</CardDescription>
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

          <div>
            <label className="text-xs font-medium mb-2 block">Email (Read-only)</label>
            <Input type="email" value={user.email} disabled />
          </div>

          <div>
            <label className="text-xs font-medium mb-2 block">Full Name</label>
            <Input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="border-t pt-6">
            <p className="text-sm font-medium mb-4">Change Password</p>
            <div className="space-y-3">
              <Input
                type="password"
                placeholder="New password (leave blank to keep current)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
