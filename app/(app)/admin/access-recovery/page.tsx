'use client'

import { useCallback, useEffect, useState } from 'react'
import { Copy, KeyRound, RefreshCw, Search, ShieldCheck, XCircle } from 'lucide-react'

import { getAuthHeaders } from '@/lib/auth-client'

type UserRow={
  id:string
  name:string
  email:string
  username?:string|null
  role:string
  file_number?:string|null
  canIssue:boolean
}

type GrantRow={
  id:string
  user_id:string
  email:string
  reason:string
  expires_at:string
  consumed_at?:string|null
  revoked_at?:string|null
  created_at:string
  name:string
  role:string
  file_number?:string|null
  issued_by_name:string
}

export default function AdminAccessRecoveryPage(){
  const [query,setQuery]=useState('')
  const [users,setUsers]=useState<UserRow[]>([])
  const [recent,setRecent]=useState<GrantRow[]>([])
  const [reason,setReason]=useState('')
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [issued,setIssued]=useState<any>(null)

  const load=useCallback(async(q='')=>{
    setError('')
    const response=await fetch('/api/admin/access-recovery'+(q?'?q='+encodeURIComponent(q):''),{
      headers:getAuthHeaders(),
      cache:'no-store',
    })
    const body=await response.json()
    if(!response.ok)throw new Error(body.error||'Unable to open Access Recovery Desk')
    setUsers(body.users||[])
    setRecent(body.recent||[])
  },[])

  useEffect(()=>{
    load().catch((e:any)=>setError(e?.message||'Unable to open Access Recovery Desk'))
  },[load])

  const search=async()=>{
    setBusy('search');setError('');setNotice('');setIssued(null)
    try{await load(query.trim())}
    catch(e:any){setError(e?.message||'Unable to search users')}
    finally{setBusy('')}
  }

  const issue=async(user:UserRow)=>{
    setBusy('issue:'+user.id);setError('');setNotice('');setIssued(null)
    try{
      const response=await fetch('/api/admin/access-recovery',{
        method:'POST',
        headers:getAuthHeaders(),
        body:JSON.stringify({
          action:'issue',
          targetUserId:user.id,
          reason,
        }),
      })
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Unable to issue recovery access')
      setIssued(body.grant)
      setNotice('Recovery access issued. Copy the code now; only its hash remains in WEAVE.')
      setReason('')
      await load(query.trim())
    }catch(e:any){setError(e?.message||'Unable to issue recovery access')}
    finally{setBusy('')}
  }

  const revoke=async(grantId:string)=>{
    setBusy('revoke:'+grantId);setError('');setNotice('')
    try{
      const response=await fetch('/api/admin/access-recovery',{
        method:'POST',
        headers:getAuthHeaders(),
        body:JSON.stringify({action:'revoke',grantId}),
      })
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Unable to revoke recovery access')
      setNotice('Recovery access revoked.')
      await load(query.trim())
    }catch(e:any){setError(e?.message||'Unable to revoke recovery access')}
    finally{setBusy('')}
  }

  const copy=async(value:string)=>{
    await navigator.clipboard.writeText(value)
    setNotice('Recovery code copied.')
  }

  return <main className="relative px-4 pb-16 pt-10 text-white" data-admin-access-recovery="true">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(56,189,248,.12),transparent_25%),radial-gradient(circle_at_82%_68%,rgba(168,85,247,.08),transparent_30%)]"/>
    <div className="relative mx-auto max-w-6xl">
      <header className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 text-cyan-300">
          <ShieldCheck className="h-4 w-4"/>
          <span className="text-[9px] font-black uppercase tracking-[.2em]">Administration · Access Recovery</span>
        </div>
        <h1 className="mt-3 text-3xl font-black">Access Recovery Desk</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Restore access without exposing a user's old password. Verify the person, issue a one-time code, and let the user choose a new password at the WEAVE Access Recovery Gate.
        </p>
      </header>

      {(error||notice)&&<div className={'mt-5 border-l-2 px-4 py-3 text-sm '+(error?'border-rose-400 text-rose-200':'border-emerald-400 text-emerald-200')}>{error||notice}</div>}

      {issued&&<section className="mt-6 border-y border-emerald-300/20 bg-emerald-400/[.04] py-6">
        <p className="text-[8px] font-black uppercase tracking-[.2em] text-emerald-300">One-time recovery access</p>
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="text-sm font-black">{issued.target?.name||issued.target?.email}</p>
            <p className="mt-1 text-xs text-slate-400">{issued.target?.email} · {issued.target?.role}{issued.target?.fileNumber?' · '+issued.target.fileNumber:''}</p>
            <p className="mt-4 font-mono text-4xl font-black tracking-[.24em]">{issued.code}</p>
            <p className="mt-2 text-[10px] text-slate-500">Expires {new Date(issued.expiresAt).toLocaleString()} · visible only now</p>
          </div>
          <button onClick={()=>copy(issued.code)} className="flex items-center justify-center gap-2 border border-emerald-300/30 px-4 py-3 text-[9px] font-black uppercase tracking-[.14em] text-emerald-100">
            <Copy className="h-3.5 w-3.5"/>Copy code
          </button>
        </div>
        <p className="mt-5 text-xs leading-5 text-slate-400">Give this code only after identity verification. The user opens <b className="text-white">Forgot password → Use Administration recovery code</b>, enters their registered email and this code, then chooses a new password. Existing sessions close when the reset succeeds.</p>
      </section>}

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_.8fr]">
        <div className="border-y border-white/10 py-6">
          <p className="text-[8px] font-black uppercase tracking-[.18em] text-cyan-300">01 · Find user</p>
          <div className="mt-4 flex gap-2">
            <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void search()}} className="min-w-0 flex-1 border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none focus:border-cyan-300/40" placeholder="Email, username, name or Client File Number"/>
            <button onClick={search} disabled={busy==='search'||!query.trim()} className="flex items-center gap-2 border border-cyan-300/30 px-4 py-3 text-[9px] font-black uppercase tracking-[.12em] disabled:opacity-40">
              <Search className="h-3.5 w-3.5"/>{busy==='search'?'Searching…':'Search'}
            </button>
          </div>

          <label className="mt-5 block text-[8px] font-black uppercase tracking-[.16em] text-slate-500">Identity verification record</label>
          <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3} className="mt-2 w-full border border-white/10 bg-black/20 px-3 py-3 text-sm leading-6 outline-none focus:border-cyan-300/40" placeholder="Example: confirmed registered phone, File Number and last verified movement."/>

          <div className="mt-5 divide-y divide-white/[.07]">
            {users.map(user=><div key={user.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-sm font-black">{user.name||user.username||'WEAVE user'}</p>
                <p className="mt-1 text-[10px] text-slate-400">{user.email} · {user.role}{user.file_number?' · '+user.file_number:''}</p>
                {user.role==='admin'&&!user.canIssue&&<p className="mt-1 text-[10px] text-amber-300">Another Administration account cannot be reset from this desk.</p>}
              </div>
              <button onClick={()=>issue(user)} disabled={!user.canIssue||reason.trim().length<6||busy==='issue:'+user.id} className="flex items-center justify-center gap-2 border border-white/10 px-4 py-2.5 text-[9px] font-black uppercase tracking-[.12em] disabled:opacity-35">
                <KeyRound className="h-3.5 w-3.5"/>{busy==='issue:'+user.id?'Issuing…':'Issue recovery'}
              </button>
            </div>)}
            {query.trim()&&!users.length&&<p className="py-8 text-center text-xs text-slate-500">No active WEAVE user matched that search.</p>}
          </div>
        </div>

        <div className="border-y border-white/10 py-6">
          <p className="text-[8px] font-black uppercase tracking-[.18em] text-violet-300">02 · Guardrails</p>
          <div className="mt-4 space-y-4 text-xs leading-5 text-slate-400">
            <p><b className="text-white">No password disclosure.</b> WEAVE cannot recover the old password because it stores a bcrypt hash.</p>
            <p><b className="text-white">15-minute authority.</b> The issued code expires automatically and may be used once.</p>
            <p><b className="text-white">Five attempts.</b> Repeated wrong entries exhaust the recovery grant.</p>
            <p><b className="text-white">Session closure.</b> A successful reset removes all previous WEAVE sessions for that user.</p>
            <p><b className="text-white">Administration boundary.</b> An Administrator cannot issue a recovery code for another Administrator account.</p>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between border-y border-white/10 py-3">
          <p className="text-[8px] font-black uppercase tracking-[.18em] text-slate-400">Recovery audit</p>
          <button onClick={()=>load(query.trim()).catch((e:any)=>setError(e?.message||'Unable to refresh'))} className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[.12em] text-cyan-300"><RefreshCw className="h-3.5 w-3.5"/>Refresh</button>
        </div>
        <div className="divide-y divide-white/[.07]">
          {recent.map(row=>{
            const active=!row.consumed_at&&!row.revoked_at&&new Date(row.expires_at).getTime()>Date.now()
            return <div key={row.id} className="grid gap-3 py-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.12em] text-cyan-300">{row.role} · {row.consumed_at?'used':row.revoked_at?'revoked':active?'active':'expired'}</p>
                <p className="mt-1 text-sm font-black">{row.name} · {row.email}</p>
                <p className="mt-1 text-[10px] text-slate-500">{row.reason}</p>
                <p className="mt-1 text-[9px] text-slate-600">Issued by {row.issued_by_name} · {new Date(row.created_at).toLocaleString()}</p>
              </div>
              {active&&<button onClick={()=>revoke(row.id)} disabled={busy==='revoke:'+row.id} className="flex items-center justify-center gap-2 border border-rose-300/20 px-3 py-2 text-[8px] font-black uppercase tracking-[.12em] text-rose-200 disabled:opacity-40"><XCircle className="h-3.5 w-3.5"/>Revoke</button>}
            </div>
          })}
          {!recent.length&&<p className="py-8 text-center text-xs text-slate-500">No Administration recovery grants have been issued.</p>}
        </div>
      </section>
    </div>
  </main>
}
