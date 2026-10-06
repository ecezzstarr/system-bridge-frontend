'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BriefcaseBusiness, CheckCircle2, FileSignature, Loader2, Lock, Mail, Target } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { WeaveLogo } from '@/components/weave-logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export default function ManagerEmploymentRegistrationPage(){
  const router=useRouter()
  const {login,logout,isLoading}=useAuth()
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [candidate,setCandidate]=useState<any>(null)
  const [token,setToken]=useState('')
  const [accepted,setAccepted]=useState(false)
  const [signature,setSignature]=useState('')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)

  const authenticate=async(event:FormEvent)=>{
    event.preventDefault();setError('');setBusy(true)
    try{
      const user=await login(email,password)
      if(!['agent','bridger'].includes(user.role||'')){
        logout();throw new Error('Manager employment registration is only for an existing Agent or Bridger account.')
      }
      const sessionToken=window.localStorage.getItem('ssb_auth_token')||''
      if(!sessionToken) throw new Error('Unable to establish the employment registration session.')
      const response=await fetch('/api/manager/employment',{headers:{Authorization:`Bearer ${sessionToken}`},cache:'no-store'})
      const data=await response.json()
      if(!response.ok) throw new Error(data.error||'Unable to read Manager employment status.')
      if(data.state&&data.state.employment?.status!=='ended'){
        router.push('/manager/dashboard');return
      }
      setCandidate(user);setToken(sessionToken)
    }catch(err){setError(err instanceof Error?err.message:'Unable to continue')}
    finally{setBusy(false)}
  }

  const acceptDocument=async()=>{
    if(!candidate||!token)return
    if(!accepted){setError('Accept the Manager employment document to begin probation.');return}
    if(signature.trim().toLowerCase()!==String(candidate.name||'').trim().toLowerCase()){
      setError('Type your full account name exactly as your signature.');return
    }
    setBusy(true);setError('')
    try{
      const response=await fetch('/api/manager/employment',{
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body:JSON.stringify({action:'accept_document',accepted:true,documentVersion:1,signature:signature.trim()}),
      })
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'Unable to accept Manager employment document.')
      router.push('/manager/dashboard')
    }catch(err){setError(err instanceof Error?err.message:'Unable to begin probation')}
    finally{setBusy(false)}
  }

  if(!candidate){
    return <Card className="w-full max-w-md border-slate-700 bg-slate-800/50 backdrop-blur">
      <CardHeader className="text-center flex flex-col items-center"><WeaveLogo size="md" className="mb-2"/><BriefcaseBusiness className="h-8 w-8 text-amber-300"/><CardTitle className="mt-2 uppercase tracking-tight">Manager Employment Registration</CardTitle><CardDescription>Manager is an employment position carried by an existing Agent or Bridger. WEAVE has 3 Manager positions.</CardDescription></CardHeader>
      <CardContent><form onSubmit={authenticate} className="space-y-4">{error&&<div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</div>}<div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><Input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Existing Agent or Bridger email" className="pl-10 bg-slate-700/50 border-slate-600"/></div><div className="relative"><Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><Input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="pl-10 bg-slate-700/50 border-slate-600"/></div><Button type="submit" disabled={busy||isLoading} className="w-full bg-amber-600 hover:bg-amber-700 font-black uppercase tracking-wider">{busy||isLoading?<Loader2 className="h-4 w-4 animate-spin"/>:'Open Employment Document'}</Button><div className="text-center"><Link href="/manager/login" className="text-xs text-cyan-300">Already a Manager? Enter here</Link></div></form></CardContent>
    </Card>
  }

  return <Card className="w-full max-w-2xl border-slate-700 bg-slate-800/50 backdrop-blur">
    <CardHeader className="text-center flex flex-col items-center"><FileSignature className="h-9 w-9 text-amber-300"/><CardTitle className="mt-2 uppercase tracking-tight">WEAVE Manager Employment Document</CardTitle><CardDescription>{candidate.name} · underlying WEAVE position: {String(candidate.role).toUpperCase()}</CardDescription></CardHeader>
    <CardContent className="space-y-5">
      {error&&<div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</div>}
      <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-300 space-y-3">
        <p><strong className="text-white">Employment position.</strong> Manager is a WEAVE employment position. Your underlying company identity remains {candidate.role}; Manager does not create a fifth WEAVE role.</p>
        <p><strong className="text-white">Probation.</strong> Probation begins on the exact date and time you accept this document and lasts for one calendar month. At the end of probation, the employment record enters Administration review.</p>
        <p><strong className="text-white">Core duty.</strong> Your main duty is marketing WEAVE to prospective Agents and Bridgers and carrying verified people into WEAVE through your referral movement.</p>
        <p><strong className="text-white">First-month estimate.</strong> The probation marketing estimate is <span className="font-black text-emerald-300">300 verified Agent or Bridger registrations</span>. This is the operating target used to measure probation movement.</p>
        <p><strong className="text-white">Salary.</strong> Manager salary is <span className="font-black text-amber-300">₦150,000 monthly</span>. Payroll remains administered by WEAVE Administration.</p>
        <p><strong className="text-white">Referral bonus.</strong> The Manager keeps the underlying Agent/Bridger referral identity and receives the current staff referral bonus for qualifying verified referrals. The referral bonus is separate from salary.</p>
        <p><strong className="text-white">Conduct.</strong> Marketing must represent WEAVE accurately. Fabricated claims, false scarcity, deceptive earnings promises, or unauthorized handling of customer funds are not Manager duties.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-amber-300/15 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-500">Salary</p><p className="mt-1 text-lg font-black text-white">₦150,000/mo</p></div><div className="rounded-xl border border-emerald-300/15 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-500">Probation</p><p className="mt-1 text-lg font-black text-white">1 month</p></div><div className="rounded-xl border border-cyan-300/15 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-500">Estimate</p><p className="mt-1 text-lg font-black text-white">300 people</p></div></div>
      <label className="flex items-start gap-3 rounded-xl border border-white/10 p-3 text-xs text-slate-300"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} className="mt-1"/><span>I accept the WEAVE Manager employment document and understand that acceptance starts my one-month probation immediately.</span></label>
      <div><p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Signature · type your full account name</p><Input value={signature} onChange={e=>setSignature(e.target.value)} placeholder={candidate.name||'Full name'} className="bg-slate-900/50 border-slate-700"/></div>
      <Button onClick={acceptDocument} disabled={busy||!accepted} className="w-full bg-amber-600 hover:bg-amber-700 font-black uppercase tracking-wider">{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<><CheckCircle2 className="mr-2 h-4 w-4"/>Accept Document · Begin Probation</>}</Button>
      <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider text-slate-500"><Target className="h-3.5 w-3.5"/>Acceptance timestamp becomes Day 1</div>
    </CardContent>
  </Card>
}
