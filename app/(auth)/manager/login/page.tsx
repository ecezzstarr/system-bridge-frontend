'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BriefcaseBusiness, Loader2, Lock, Mail } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { WeaveLogo } from '@/components/weave-logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export default function ManagerLoginPage() {
  const router=useRouter()
  const { login, logout, isLoading }=useAuth()
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [error,setError]=useState('')
  const [submitting,setSubmitting]=useState(false)

  const submit=async(event:FormEvent)=>{
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try{
      const user=await login(email,password)
      if(!['agent','bridger'].includes(user.role||'')){
        logout()
        throw new Error('Manager employment is carried only by an Agent or Bridger identity.')
      }
      const token=window.localStorage.getItem('ssb_auth_token')
      if(!token) throw new Error('Manager session could not be established.')
      const response=await fetch('/api/manager/employment',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
      const data=await response.json()
      if(!response.ok) throw new Error(data.error||'Unable to verify Manager employment.')
      if(!data.state||data.state.employment?.status==='ended'){
        logout()
        throw new Error('No active Manager employment record. Use Manager Employment Registration first.')
      }
      router.push('/manager/dashboard')
    }catch(err){
      setError(err instanceof Error?err.message:'Manager entry failed')
      setSubmitting(false)
    }
  }

  return <Card className="w-full max-w-md border-slate-700 bg-slate-800/50 backdrop-blur">
    <CardHeader className="text-center flex flex-col items-center">
      <WeaveLogo size="md" className="mb-2"/>
      <BriefcaseBusiness className="h-8 w-8 text-amber-300"/>
      <CardTitle className="mt-2 uppercase tracking-tight">Manager Entry</CardTitle>
      <CardDescription>For WEAVE Managers whose underlying position remains Agent or Bridger.</CardDescription>
    </CardHeader>
    <CardContent>
      <form onSubmit={submit} className="space-y-4">
        {error&&<div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</div>}
        <div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><Input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Agent or Bridger email" className="pl-10 bg-slate-700/50 border-slate-600"/></div>
        <div className="relative"><Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><Input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="pl-10 bg-slate-700/50 border-slate-600"/></div>
        <Button type="submit" disabled={submitting||isLoading} className="w-full bg-amber-600 hover:bg-amber-700 font-black uppercase tracking-wider">{submitting||isLoading?<Loader2 className="h-4 w-4 animate-spin"/>:'Enter Manager Work'}</Button>
        <div className="grid grid-cols-2 gap-2 text-center text-xs"><Link href="/manager/register" className="rounded-md border border-slate-700 px-3 py-2 text-cyan-300">Employment Registration</Link><Link href="/login" className="rounded-md border border-slate-700 px-3 py-2 text-slate-300">Normal Entry</Link></div>
      </form>
    </CardContent>
  </Card>
}
