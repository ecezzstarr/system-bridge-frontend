'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff, Lock, Mail, User, Briefcase, Handshake, Gift, ShieldCheck, ScrollText, Target, ArrowLeft, CheckCircle2, MessageCircle, ShieldAlert, Key, Loader2 } from 'lucide-react'
import { WeaveLogo } from '@/components/weave-logo'
import { DepartmentEntryTicketGate } from '@/components/department-entry-ticket-gate'

type Step = 'role' | 'dept-gate' | 'notice' | 'terms' | 'guide' | 'details'

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { register, isLoading } = useAuth()

  const [step, setStep] = useState<Step>('role')
  const [referredBy, setReferredBy] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    name: '',
    password: '',
    confirmPassword: '',
    role: '' as 'agent' | 'bridger' | '',
    departmentalCode: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isValidatingCode, setIsValidatingCode] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [termsScrolledToEnd, setTermsScrolledToEnd] = useState(false)
  const [fullNameConfirm, setFullNameConfirm] = useState('')

  useEffect(() => {
    const ref = searchParams.get('ref')
    const roleParam = searchParams.get('role')
    if (ref) setReferredBy(ref)
    if (roleParam === 'bridger') {
      setFormData(prev => ({ ...prev, role: 'bridger' }))
      setStep('dept-gate')
    }
  }, [searchParams])

  const handleRoleSelect = (role: 'agent' | 'bridger') => {
    setFormData({ ...formData, role })
    setStep('dept-gate')
  }

  const handleVerifyCode = async () => {
    if (!formData.departmentalCode) {
      setError('Please enter your departmental code.')
      return
    }

    setIsValidatingCode(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formData.departmentalCode,
          department: formData.role.toUpperCase()
        })
      })

      const result = await response.json()
      if (result.valid) {
        setStep('notice')
      } else {
        setError(result.error || 'Invalid code.')
      }
    } catch (err) {
      setError('Connection error. Please try again.')
    } finally {
      setIsValidatingCode(false)
    }
  }

  const handleTermsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 20) {
      setTermsScrolledToEnd(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (!formData.role) {
      setError('Please select a role')
      return
    }
    if (fullNameConfirm.trim().toLowerCase() !== formData.name.trim().toLowerCase()) {
      setError('Your typed name must match the Full Name field exactly to confirm the Terms of Service.')
      return
    }

    setIsSubmitting(true)
    try {
      await register({
        email: formData.email,
        username: formData.username,
        name: formData.name,
        password: formData.password,
        role: formData.role as 'agent' | 'bridger',
        department: formData.role.toUpperCase(),
        departmentalCode: formData.departmentalCode,
        referredBy: referredBy || undefined,
        termsAccepted: true,
        fullNameConfirmed: fullNameConfirm.trim(),
      } as any)
      window.location.href = '/dashboard'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
      setIsSubmitting(false)
    }
  }

  // Step 1: Role Selection
  if (step === 'role') {
    return (
      <Card className="border-slate-700 bg-slate-800/50 backdrop-blur max-w-lg mx-4 sm:mx-0">
        <CardHeader className="text-center flex flex-col items-center">
          <WeaveLogo size="md" className="mb-2" />
          <CardTitle className="text-xl sm:text-2xl uppercase tracking-tighter">System Entry</CardTitle>
          <CardDescription>Select your intended department</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => handleRoleSelect('agent')}
              className="p-5 sm:p-6 rounded-lg border-2 border-slate-600 bg-slate-700/30 hover:border-blue-500 hover:bg-blue-500/10 transition-all text-left group"
            >
              <Briefcase className="h-8 w-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-white mb-2 uppercase tracking-wide">Agent</h3>
              <p className="text-xs text-slate-400 mb-3">Institutional representative and ecosystem operator.</p>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-md p-2">
                <p className="text-[10px] text-blue-300 font-black uppercase">Fixed Compensation</p>
              </div>
            </button>
            <button
              onClick={() => handleRoleSelect('bridger')}
              className="p-5 sm:p-6 rounded-lg border-2 border-slate-600 bg-slate-700/30 hover:border-green-500 hover:bg-green-500/10 transition-all text-left group"
            >
              <Handshake className="h-8 w-8 text-green-400 mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-white mb-2 uppercase tracking-wide">Bridger</h3>
              <p className="text-xs text-slate-400 mb-3">Independent partner and client bridge architect.</p>
              <div className="bg-green-500/10 border border-green-500/30 rounded-md p-2">
                <p className="text-[10px] text-green-300 font-black uppercase">Performance Share</p>
              </div>
            </button>
          </div>
          <div className="text-center text-sm pt-2">
            <span className="text-slate-500">Already registered? </span>
            <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-bold uppercase text-xs tracking-widest">Enter System</Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Step 2: Departmental Entry Ticket Gate
  if (step === 'dept-gate') {
    return (
      <Card className="border-slate-700 bg-slate-800/50 backdrop-blur max-w-lg mx-4 sm:mx-0">
        <CardHeader className="text-center flex flex-col items-center">
          <ShieldAlert className="h-10 w-10 text-amber-500 mb-2" />
          <CardTitle className="text-xl sm:text-2xl uppercase tracking-tighter">Department Entry Ticket</CardTitle>
          <CardDescription>
            {formData.role === 'agent' ? 'Agent' : 'Bridger'} entry is released through a verified 3 Flame Coin ticket.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DepartmentEntryTicketGate
            department={formData.role.toUpperCase() as 'AGENT' | 'BRIDGER'}
            onCodeReady={(code) => {
              setFormData(prev => ({ ...prev, departmentalCode: code }))
              setError(null)
              setStep('notice')
            }}
            onBack={() => {
              setError(null)
              setStep('role')
            }}
          />
        </CardContent>
      </Card>
    )
  }

  // Step 3: WEAVE Paid Platform Notice
  if (step === 'notice') {
    return (
      <Card className="border-slate-700 bg-slate-800/50 backdrop-blur max-w-lg mx-4 sm:mx-0">
        <CardHeader className="text-center flex flex-col items-center">
          <WeaveLogo size="md" className="mb-2" />
          <ShieldCheck className="h-10 w-10 text-amber-400 mb-2" />
          <CardTitle className="text-xl sm:text-2xl uppercase tracking-tighter">Authorized Entry</CardTitle>
          <CardDescription className="text-green-400 font-bold">Code Validated: {formData.departmentalCode}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 space-y-2">
            <p className="text-sm text-amber-200 font-semibold">WEAVE is a company platform.</p>
            <p className="text-sm text-slate-300">
              Most services on this platform are paid. As {formData.role === 'agent' ? 'an Agent' : 'a Bridger'}, you are joining as a representative of the WEAVE ecosystem, not a free client account.
            </p>
          </div>
          <ul className="text-sm text-slate-400 space-y-2">
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" /> Your account activity, earnings, and client dealings happen under WEAVE's terms.</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" /> Certain roles (Bridgers) carry a recurring subscription to remain active.</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" /> You will be asked to review and accept our Terms of Service next.</li>
          </ul>
          <Button onClick={() => setStep('terms')} className="w-full bg-amber-600 hover:bg-amber-700 font-bold uppercase tracking-widest h-11">
            I Understand, Continue
          </Button>
          <Button type="button" variant="ghost" onClick={() => setStep('dept-gate')} className="w-full text-slate-400">
            <ArrowLeft className="h-3 w-3 mr-2" /> Back
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Step 4: Terms of Service
  if (step === 'terms') {
    return (
      <Card className="border-slate-700 bg-slate-800/50 backdrop-blur max-w-lg mx-4 sm:mx-0">
        <CardHeader className="text-center flex flex-col items-center">
          <ScrollText className="h-8 w-8 text-cyan-400 mb-2" />
          <CardTitle className="text-xl sm:text-2xl uppercase tracking-tighter">Terms of Presence</CardTitle>
          <CardDescription>Review ecosystem protocols</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onScroll={handleTermsScroll}
            className="h-64 overflow-y-auto bg-slate-900/60 border border-slate-700 rounded-lg p-4 text-xs text-slate-400 space-y-3"
          >
            <p><strong className="text-slate-300">1. Platform Nature.</strong> WEAVE is a paid operational platform. Access to Arena, Casino, Marketplace, and related tools may require an active balance, subscription, or company approval.</p>
            <p><strong className="text-slate-300">2. Role Responsibilities.</strong> {formData.role === 'agent' ? 'Agents represent WEAVE directly and are compensated on a fixed schedule set by Administration.' : 'Bridgers operate as independent partners connecting clients to WEAVE and earn a share of client activity, subject to an active monthly subscription.'}</p>
            <p><strong className="text-slate-300">3. Financial Conduct.</strong> All deposits, withdrawals, and client fund handling must go through WEAVE's official channels. Off-platform arrangements with clients are not covered or protected by WEAVE.</p>
            <p><strong className="text-slate-300">4. Continuance & Access.</strong> Certain roles may be suspended if recurring dues are not paid within the grace period communicated to you.</p>
            <p><strong className="text-slate-300">5. Conduct.</strong> Misrepresentation of WEAVE, fraudulent client dealings, or circumventing platform fees may result in immediate suspension.</p>
            <p><strong className="text-slate-300">6. Data & Communication.</strong> Your registered contact details may be used by WEAVE Administration for account verification, payouts, and platform notices.</p>
            <p><strong className="text-slate-300">7. Changes.</strong> WEAVE may update these terms; continued use of the platform after an update constitutes acceptance.</p>
            <p className="text-slate-500 italic pt-2 text-center">— End of Terms —</p>
          </div>
          {!termsScrolledToEnd && (
            <p className="text-[10px] text-amber-500 text-center font-bold uppercase tracking-widest">Scroll to end of protocol to continue</p>
          )}
          <Button
            onClick={() => setStep('guide')}
            disabled={!termsScrolledToEnd}
            className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 font-bold uppercase tracking-widest h-11"
          >
            Protocol Accepted, Continue
          </Button>
          <Button type="button" variant="ghost" onClick={() => setStep('notice')} className="w-full text-slate-400">
            <ArrowLeft className="h-3 w-3 mr-2" /> Back
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Step 5: Client Acquisition Guide
  if (step === 'guide') {
    return (
      <Card className="border-slate-700 bg-slate-800/50 backdrop-blur max-w-lg mx-4 sm:mx-0">
        <CardHeader className="text-center flex flex-col items-center">
          <Target className="h-8 w-8 text-green-400 mb-2" />
          <CardTitle className="text-xl sm:text-2xl uppercase tracking-tighter">Operational Guidance</CardTitle>
          <CardDescription>Ecosystem participation brief</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 text-green-400 text-xs font-bold flex items-center justify-center">1</span>
              <p className="text-xs">Share your personal referral link with prospective clients directly — WhatsApp, social media, or in person.</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 text-green-400 text-xs font-bold flex items-center justify-center">2</span>
              <p className="text-xs">Explain WEAVE clearly and honestly — clients trust representatives who don't overpromise returns.</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 text-green-400 text-xs font-bold flex items-center justify-center">3</span>
              <p className="text-xs">Once a client registers through your link, they're tracked to your account automatically.</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 text-green-400 text-xs font-bold flex items-center justify-center">4</span>
              <p className="text-xs">Stay responsive in the Lounge — clients and Administration may reach you there for support.</p>
            </div>
          </div>
          <Button onClick={() => setStep('details')} className="w-full bg-green-600 hover:bg-green-700 mt-2 font-bold uppercase tracking-widest h-11">
            Complete Registration
          </Button>
          <Button type="button" variant="ghost" onClick={() => setStep('terms')} className="w-full text-slate-400">
            <ArrowLeft className="h-3 w-3 mr-2" /> Back
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Step 6: Account Details
  return (
    <Card className="border-slate-700 bg-slate-800/50 backdrop-blur max-w-md mx-4 sm:mx-0">
      <CardHeader className="text-center">
        <CardTitle className="text-xl sm:text-2xl uppercase tracking-tighter">Create Identity</CardTitle>
        <CardDescription className="flex items-center justify-center gap-2">
          {formData.role === 'agent' ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-wider">
              <Briefcase className="h-3 w-3" /> Agent
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-black uppercase tracking-wider">
              <Handshake className="h-3 w-3" /> Bridger
            </div>
          )}
          <span className="text-slate-500 font-mono text-[10px]">{formData.departmentalCode}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-md text-[10px] font-bold uppercase tracking-wide text-center">
              {error}
            </div>
          )}

          {formData.role === 'bridger' && (
            <div className="relative">
              <Gift className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <Input
                type="text"
                placeholder="Referral code (optional)"
                value={referredBy || ''}
                onChange={(e) => setReferredBy(e.target.value.trim() || null)}
                className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 text-xs"
                disabled={isSubmitting || isLoading}
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <Input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 text-xs"
              required
              disabled={isSubmitting || isLoading}
            />
          </div>

          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <Input
              type="text"
              placeholder="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 text-xs"
              required
              disabled={isSubmitting || isLoading}
            />
          </div>

          <Input
            type="text"
            placeholder="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 text-xs"
            required
            disabled={isSubmitting || isLoading}
          />

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="pl-10 pr-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 text-xs"
              required
              disabled={isSubmitting || isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <Input
            type="password"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 text-xs"
            required
            disabled={isSubmitting || isLoading}
          />

          <div className="border-t border-slate-800 pt-4 space-y-2">
            <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest ml-1">
              Type full name to confirm Protocol
            </label>
            <Input
              type="text"
              placeholder="Type your full name here"
              value={fullNameConfirm}
              onChange={(e) => setFullNameConfirm(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 text-xs"
              required
              disabled={isSubmitting || isLoading}
            />
          </div>

          <Button
            type="submit"
            className={`w-full font-black uppercase tracking-widest h-11 ${formData.role === 'agent' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting || isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : `Commit as ${formData.role === 'agent' ? 'Agent' : 'Bridger'}`}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep('guide')}
            className="w-full text-slate-500"
            disabled={isSubmitting || isLoading}
          >
            <ArrowLeft className="h-3 w-3 mr-2" /> Back
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <Card className="border-slate-700 bg-slate-800/50 backdrop-blur max-w-lg mx-4 sm:mx-0">
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-600 mx-auto" />
        </CardContent>
      </Card>
    }>
      <RegisterContent />
    </Suspense>
  )
}
