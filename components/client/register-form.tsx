'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { saveClientToken, saveClientUser } from '@/lib/client-auth'

export default function ClientRegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [referredBy, setReferredBy] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', business_name: '', file_number: '', password: '', confirmPassword: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const ref = searchParams.get('ref')
    const file = searchParams.get('file')
    if (ref) setReferredBy(ref)
    if (file) setFormData(current => ({ ...current, file_number: file.toUpperCase() }))
  }, [searchParams])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (formData.password !== formData.confirmPassword) return setError('Passwords do not match')
    if (formData.password.length < 6) return setError('Password must be at least 6 characters')
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/client/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, referredBy, file_number: formData.file_number.trim().toUpperCase() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Registration failed'); return }
      saveClientToken(data.token); saveClientUser(data.client)
      window.location.href = '/client/dashboard'
    } catch { setError('Network error. Please try again.') } finally { setIsSubmitting(false) }
  }

  return (
    <Card className="w-full max-w-md bg-slate-900/80 border-slate-700 mx-4 sm:mx-0">
      <CardHeader className="text-center px-4 sm:px-6"><CardTitle className="text-xl sm:text-2xl">Join Client Portal</CardTitle><CardDescription className="text-xs sm:text-sm">Complete your Client registration and connect your File Folder</CardDescription></CardHeader>
      <CardContent className="px-4 sm:px-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div><label className="text-xs font-semibold text-slate-300 mb-1 block">File Number</label><Input type="text" name="file_number" placeholder="WEAVE-2026-0907-0001" value={formData.file_number} onChange={handleChange} className="bg-slate-800 border-slate-600 text-white placeholder-slate-500 font-mono" disabled={isSubmitting} /></div>
          <div><label className="text-xs font-semibold text-slate-300 mb-1 block">Full Name</label><Input type="text" name="name" placeholder="Your name" value={formData.name} onChange={handleChange} className="bg-slate-800 border-slate-600 text-white placeholder-slate-500" disabled={isSubmitting} required /></div>
          <div><label className="text-xs font-semibold text-slate-300 mb-1 block">Email</label><Input type="email" name="email" placeholder="your@email.com" value={formData.email} onChange={handleChange} className="bg-slate-800 border-slate-600 text-white placeholder-slate-500" disabled={isSubmitting} required /></div>
          <div><label className="text-xs font-semibold text-slate-300 mb-1 block">Phone</label><Input type="tel" name="phone" placeholder="+1 234 567 8900" value={formData.phone} onChange={handleChange} className="bg-slate-800 border-slate-600 text-white placeholder-slate-500" disabled={isSubmitting} required /></div>
          <div><label className="text-xs font-semibold text-slate-300 mb-1 block">Business Name</label><Input type="text" name="business_name" placeholder="Your business" value={formData.business_name} onChange={handleChange} className="bg-slate-800 border-slate-600 text-white placeholder-slate-500" disabled={isSubmitting} required /></div>
          <div><label className="text-xs font-semibold text-slate-300 mb-1 block">Password</label><Input type="password" name="password" placeholder="••••••••" value={formData.password} onChange={handleChange} className="bg-slate-800 border-slate-600 text-white placeholder-slate-500" disabled={isSubmitting} required /></div>
          <div><label className="text-xs font-semibold text-slate-300 mb-1 block">Confirm Password</label><Input type="password" name="confirmPassword" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} className="bg-slate-800 border-slate-600 text-white placeholder-slate-500" disabled={isSubmitting} required /></div>
          {error && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/50 rounded p-2">{error}</div>}
          <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white border-0" disabled={isSubmitting}>{isSubmitting ? 'Opening File Folder...' : 'Complete Registration'}</Button>
          <div className="text-center text-xs text-slate-400">Already have an account? <Link href="/client/login" className="text-cyan-400 hover:text-cyan-300">Sign in here</Link></div>
        </form>
      </CardContent>
    </Card>
  )
}
