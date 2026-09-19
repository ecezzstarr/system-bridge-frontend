'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  FileText,
  Mail,
  Lock,
  Briefcase,
  ArrowRight,
  CheckCircle2,
  Loader2,
  ShieldCheck
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-provider'

function ClientRegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setSession } = useAuth()

  const [step, setStep] = useState<'validate' | 'details'>('validate')
  const [isLoading, setIsLoading] = useState(false)
  const [fileNumber, setFileNumber] = useState('')
  const [identityData, setIdentityData] = useState<{ name: string; phone: string } | null>(null)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    businessName: ''
  })

  const runValidate = async (fn: string) => {
    if (!fn) return
    setIsLoading(true)
    try {
      const valRes = await fetch(`/api/client/weave-validate?fileNumber=${fn}`)
      const result = await valRes.json()

      if (result.success) {
        setIdentityData(result.identity_data)
        setStep('details')
        toast.success('Recognized')
      } else {
        toast.error(result.error || "This file number isn't recognized")
      }
    } catch (error) {
      toast.error('Something interrupted that. Try again.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const fnFromUrl = searchParams.get('fileNumber')
    if (fnFromUrl) {
      setFileNumber(fnFromUrl)
      runValidate(fnFromUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fileNumber) return
    await runValidate(fileNumber)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      toast.error("Those passwords don't match")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/client/weave-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileNumber,
          email: formData.email,
          password: formData.password,
          businessName: formData.businessName
        })
      })

      const result = await res.json()
      if (result.success) {
        toast.success('Welcome into the Weave')
        setSession(result.token, result.user)
        router.push('/client/dashboard')
      } else {
        toast.error(result.error || "That didn't complete. Try again.")
      }
    } catch (error) {
      toast.error("That didn't complete. Try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900 rounded-full blur-[120px]" />
      </div>

      <div className="mb-8 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-4">
          <ShieldCheck className="h-3 w-3" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Secure Registration Protocol</span>
        </div>
        <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">WEAVE Identity</h1>
      </div>

      <Card className="w-full max-w-md border-slate-700 bg-slate-900/50 backdrop-blur-xl relative z-10 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl font-bold text-white uppercase tracking-tight">
            {step === 'validate' ? 'Protocol Initiation' : 'Finalize Credentials'}
          </CardTitle>
          <CardDescription className="text-xs font-medium text-slate-400">
            {step === 'validate'
              ? 'Enter your issued File Number to begin.'
              : 'Secure your presence in the WEAVE ecosystem.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'validate' ? (
            <form onSubmit={handleValidate} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">File Number Authority</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="WEAVE-2026-XXXX-XXXX"
                    value={fileNumber}
                    onChange={(e) => setFileNumber(e.target.value.toUpperCase())}
                    className="pl-10 bg-slate-800/50 border-slate-700 text-white font-mono text-sm h-12 focus:border-blue-500 transition-all"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-12 font-bold uppercase tracking-tighter" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Validate Credentials'}
                {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>

              <div className="text-center">
                <p className="text-[10px] text-slate-500 italic">
                  Don't have a File Number? Contact an authorized Bridger.
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span className="text-[9px] font-black uppercase tracking-wider">Identity Confirmed</span>
                  </div>
                  <div className="h-1 w-12 bg-blue-500/30 rounded-full" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Client Name</p>
                    <p className="text-sm text-white font-bold">{identityData?.name}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">File Authority</p>
                    <p className="text-sm font-mono text-blue-300 font-bold">{fileNumber.split('-').pop()}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10 bg-slate-800/50 border-slate-700 text-white text-sm h-11"
                    required
                  />
                </div>

                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Business Name (Optional)"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className="pl-10 bg-slate-800/50 border-slate-700 text-white text-sm h-11"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="password"
                    placeholder="Create Secure Password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10 bg-slate-800/50 border-slate-700 text-white text-sm h-11"
                    required
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="password"
                    placeholder="Confirm Password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="pl-10 bg-slate-800/50 border-slate-700 text-white text-sm h-11"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-12 font-bold uppercase tracking-tighter" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Complete Registration'}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep('validate')}
                  className="w-full text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-2 hover:bg-transparent hover:text-white"
                  disabled={isLoading}
                >
                  Change File Number
                </Button>
              </div>
            </form>
          )}

          <div className="mt-8 text-center border-t border-slate-800 pt-6">
            <p className="text-xs text-slate-500 font-medium">
              Already have an account? <Link href="/client/login" className="text-blue-400 font-bold hover:text-blue-300 ml-1">Secure Sign In</Link>
            </p>
          </div>
        </CardContent>
      </Card>

      <p className="mt-12 text-[10px] text-slate-600 font-black uppercase tracking-[0.4em]">© 2026 WEAVE PROCOL · OMNI-PRESENCE</p>
    </div>
  )
}

export default function ClientRegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    }>
      <ClientRegisterContent />
    </Suspense>
  )
}
