'use client'

import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  LogOut, 
  MessageCircle, 
  Gamepad2, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Shield, 
  Zap, 
  Code, 
  Terminal,
  Activity,
  ChevronRight,
  MessageSquare,
  Search,
  Trophy,
  Globe,
  ShieldCheck,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  FileBox,
  UserPlus,
  Database,
  Brain,
  Flame,
  Copy,
  Plus,
  LayoutTemplate
} from 'lucide-react'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { clearToken } from '@/lib/auth-client'
import { RiverChat } from '@/components/river-chat'
import { EcosystemNav } from '@/components/ecosystem-nav'
import { DepartmentalCodesSection } from '@/components/admin/departmental-codes-section'
import { WORLD_RULES } from '@/lib/world/constants'
import { visiblePoll } from '@/lib/visible-poll'

export default function AdminTerminal() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [liveStats, setLiveStats] = useState<{ totalUsers: number; platformVaultTrx: number; escrowPoolTrx: number } | null>(null)

  useEffect(() => {
    if (!user || user.role !== 'admin') return
    const token = localStorage.getItem('ssb_auth_token')
    fetch('/api/eight/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ action: 'stats', payload: {} })
    })
      .then(res => res.json())
      .then(data => { if (data.success) setLiveStats(data.stats) })
      .catch(() => {})
  }, [user])


  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [user, router])

  if (!user || user.role !== 'admin') {
    return null
  }

  const handleLogout = () => {
    logout()
    clearToken()
    router.push('/')
  }


  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-4 flex flex-wrap justify-end gap-3"><Link href="/admin/employment-applications" data-admin-employment-review-link className="inline-flex min-h-11 items-center rounded-xl border border-cyan-200/40 bg-cyan-200/10 px-4 py-2 text-xs font-black text-cyan-100">Company employment applications →</Link><Link href="/admin/orders" data-admin-order-inbox-link className="inline-flex min-h-11 items-center rounded-xl border border-amber-200/40 bg-amber-200/10 px-4 py-2 text-xs font-black text-amber-100">Orders & payment alerts →</Link></div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 mb-1">
            Administrations Control Center
          </h1>
          <p className="text-slate-400 text-sm">People, authorization, verification and announcements · {user.name}</p>
        </div>
        <Link
          href="/admin/access-recovery"
          className="border border-cyan-300/20 px-4 py-2.5 text-[9px] font-black uppercase tracking-[.14em] text-cyan-200 transition-colors hover:border-cyan-300/40 hover:text-white"
        >
          Access Recovery Desk
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Users</p>
          <p className="text-2xl font-bold text-purple-400">{liveStats ? liveStats.totalUsers : '—'}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Platform Vault</p>
          <p className="text-2xl font-bold text-emerald-400">{liveStats ? `${liveStats.platformVaultTrx.toLocaleString()} TRX` : '—'}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Escrow Pool</p>
          <p className="text-2xl font-bold text-yellow-400">{liveStats ? `${liveStats.escrowPoolTrx.toLocaleString()} TRX` : '—'}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">System Pulse</p>
          <p className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
            Active <Activity className="h-4 w-4 animate-pulse text-green-400" />
          </p>
        </div>
      </div>

      <section className="border-y border-purple-300/10 bg-black/15 px-2 py-4 sm:px-4" data-administration-control-room="focused">
        <div className="mb-4 border-l-2 border-purple-300/30 pl-3">
          <p className="text-[9px] font-black uppercase tracking-[.18em] text-purple-300">One control room</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Users, departmental authorization, Bridger standing, deposits, withdrawals and announcements stay as stations inside this room. Direct Communication, File Number and Workshops remain in their own WEAVE places.</p>
        </div>
        <AdminPanelSection user={user} />
      </section>

      <RiverChat />
    </div>
  )
}

function AdminPanelSection({ user }: { user: any }) {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'bridgers' | 'deposits' | 'bridge' | 'withdrawals' | 'announcements' | 'departmental'>('users')

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash
      if (hash === '#bridgers') setActiveSubTab('bridgers')
      else if (hash === '#users') setActiveSubTab('users')
      else if (hash === '#clients') window.location.replace('/communications?tab=clients')
      else if (hash === '#fne') window.location.replace('/admin/file-number-engine')
      else if (hash === '#deposits') setActiveSubTab('deposits')
      else if (hash === '#tron') window.location.replace('/admin/client-deposits')
      else if (hash === '#bridge') setActiveSubTab('bridge')
      else if (hash === '#withdrawals') setActiveSubTab('withdrawals')
      else if (hash === '#announcements') setActiveSubTab('announcements')
      else if (hash === '#departmental') setActiveSubTab('departmental')
    }

    handleHash()
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-slate-800 pb-px overflow-x-auto scrollbar-hide">
        <button 
          onClick={() => setActiveSubTab('users')}
          className={`pb-2 text-[10px] sm:text-sm font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'users' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          Users
        </button>
        <button 
          onClick={() => setActiveSubTab('departmental')}
          className={`pb-2 text-[10px] sm:text-sm font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'departmental' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          Dept. Authorization
        </button>

        <button 
          onClick={() => setActiveSubTab('bridgers')}
          className={`pb-2 text-[10px] sm:text-sm font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'bridgers' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          Bridger Ops
        </button>

        <button 
          onClick={() => setActiveSubTab('deposits')}
          className={`pb-2 text-[10px] sm:text-sm font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'deposits' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          Deposits
        </button>

        <button 
          onClick={() => setActiveSubTab('bridge')}
          className={`pb-2 text-[10px] sm:text-sm font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'bridge' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          Bridge Deposits
        </button>
        <button 
          onClick={() => setActiveSubTab('withdrawals')}
          className={`pb-2 text-[10px] sm:text-sm font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'withdrawals' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          Withdrawals
        </button>
        <button 
          onClick={() => setActiveSubTab('announcements')}
          className={`pb-2 text-[10px] sm:text-sm font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'announcements' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          Announcements
        </button>
      </div>

      <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-1 min-h-[400px]">
        {activeSubTab === 'users' && <UserManagementSection />}
        {activeSubTab === 'departmental' && <DepartmentalCodesSection />}
        {activeSubTab === 'bridgers' && <BridgerManagementSection />}
        {activeSubTab === 'deposits' && <DepositApprovalSection user={user} />}
        {activeSubTab === 'bridge' && <BridgeDepositApprovalSection user={user} />}
        {activeSubTab === 'withdrawals' && <WithdrawalApprovalSection user={user} />}
        {activeSubTab === 'announcements' && <AnnouncementSection />}
      </div>
    </div>
  )
}

function BridgerManagementSection() {
  const { token } = useAuth()
  const [bridgers, setBridgers] = useState<any[]>([])
  const [summary, setSummary] = useState({total:0,agenticOwned:0,agenticNotOwned:0,bridgeAiActive:0})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    if (!token) { setError('Administrations session required'); setLoading(false); return }
    setLoading(true)
    setError('')
    try {
      const response=await fetch('/api/admin/bridger/list',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
      const data=await response.json()
      if(!response.ok||!data.success)throw new Error(data.error||'Bridger register unavailable')
      setBridgers(data.bridgers||[])
      setSummary(data.summary||{total:0,agenticOwned:0,agenticNotOwned:0,bridgeAiActive:0})
    } catch (err) {setError(err instanceof Error?err.message:'Could not load Bridgers')}
    finally {setLoading(false)}
  }
  useEffect(()=>{void load()},[token])

  return <div className="p-4 text-white" data-admin-agentic-brider-ledger="permanent">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="text-lg font-bold uppercase">Bridger Operations</h3>
      <p className="mt-2 text-xs text-slate-400">No Bridger membership subscription. Agentic-Bridger opens Lifestyle and employment once for {WORLD_RULES.AGENTIC_BRIDGER_ONE_TIME_FLAME_COIN} System Switch. Echo is free; each new Bridge AI template path costs 8 System Switch.</p></div>
      <button type="button" onClick={()=>void load()} className="rounded-xl border border-white/15 px-3 py-2 text-xs font-bold text-white">Refresh</button>
    </div>
    <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
      {[
        ['Bridgers',summary.total],
        ['Agentic-Bridger owned',summary.agenticOwned],
        ['Not purchased',summary.agenticNotOwned],
        ['Bridge AI paths',summary.bridgeAiActive],
      ].map(([label,value])=><div key={label} className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-[10px] text-slate-400">{label}</p><p className="mt-1 text-lg font-black text-white">{value}</p></div>)}
    </div>
    {error&&<p role="alert" className="mb-4 text-sm text-rose-300">{error}</p>}
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-white/15 text-slate-400"><tr><th className="px-3 py-3">Bridger</th><th className="px-3 py-3">Agentic-Bridger</th><th className="px-3 py-3">Purchased</th><th className="px-3 py-3">Bridge AI</th><th className="px-3 py-3">Echo</th></tr></thead>
        <tbody>
          {loading?<tr><td colSpan={5} className="px-3 py-8 text-center">Loading Bridger register…</td></tr>:
          bridgers.length===0?<tr><td colSpan={5} className="px-3 py-8 text-center">No Bridgers found.</td></tr>:
          bridgers.map(bridger=><tr key={bridger.id} className="border-b border-white/[.06]">
            <td className="px-3 py-3"><strong>{bridger.name}</strong><p className="mt-1 text-[10px] text-slate-400">{bridger.email}</p></td>
            <td className="px-3 py-3">{bridger.agentic_bridger_owned?'Owned permanently':'Not purchased'}</td>
            <td className="px-3 py-3">{bridger.agentic_bridger_paid_at?new Date(bridger.agentic_bridger_paid_at).toLocaleDateString():'—'}</td>
            <td className="px-3 py-3">{bridger.bridge_ai_status==='templates_opened'?'Paths opened':'8 System Switch per path'}</td>
            <td className="px-3 py-3">Free</td>
          </tr>)}
        </tbody>
      </table>
    </div>
  </div>
}

type ManagedAccount={
  id:string;name:string;email:string;username:string|null;role:string
  departmental_code:string|null;assigned_agent_id:string|null
  is_active:boolean;created_at:string
  platform_wallet_balance:number|null;escrow_balance:number|null
  wallet_status:string
}

function UserManagementSection() {
  const {token}=useAuth()
  const [users,setUsers]=useState<ManagedAccount[]>([])
  const [agents,setAgents]=useState<any[]>([])
  const [filter,setFilter]=useState<'all'|'unassigned'>('all')
  const [search,setSearch]=useState('')
  const [total,setTotal]=useState(0)
  const [hasMore,setHasMore]=useState(false)
  const [loading,setLoading]=useState(true)
  const [loadingMore,setLoadingMore]=useState(false)
  const [loadError,setLoadError]=useState('')
  const [warnings,setWarnings]=useState<string[]>([])
  const [statusMsg,setStatusMsg]=useState<{type:'success'|'error';text:string}|null>(null)
  const [actingOn,setActingOn]=useState<string|null>(null)
  const requestSequence=useRef(0)

  const loadUsers=async(offset=0)=>{
    const seq=++requestSequence.current
    if(offset===0){
      setLoading(true)
      setLoadError('')
      setUsers([])
      setTotal(0)
      setHasMore(false)
    } else setLoadingMore(true)
    try{
      if(!token)throw new Error('Administrations session unavailable. Sign in again.')
      const params=new URLSearchParams({filter,q:search.trim(),offset:String(offset)})
      const response=await fetch('/api/admin/users?'+params.toString(),{
        headers:{Authorization:'Bearer '+token},cache:'no-store',
      })
      const payload=await response.json().catch(()=>null)
      if(!response.ok||!payload?.success||!Array.isArray(payload.users)){
        throw new Error(payload?.error||'Unable to retrieve registered users (HTTP '+response.status+').')
      }
      if(seq!==requestSequence.current)return
      setUsers(previous=>{
        if(offset===0)return payload.users
        const existing=new Set(previous.map(user=>user.id))
        return [...previous,...payload.users.filter((user:ManagedAccount)=>!existing.has(user.id))]
      })
      setTotal(Number(payload.total)||0)
      setHasMore(Boolean(payload.hasMore))
      setWarnings(Array.isArray(payload.warnings)?payload.warnings:[])
      setLoadError('')
    }catch(error){
      if(seq===requestSequence.current){
        setLoadError(error instanceof Error?error.message:'Registered users are temporarily unavailable.')
      }
    }finally{
      if(seq===requestSequence.current){
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }

  useEffect(()=>{
    const timer=setTimeout(()=>{void loadUsers(0)},search.trim()?250:0)
    return ()=>{clearTimeout(timer);requestSequence.current++}
  },[filter,search,token])

  const loadAgents=async()=>{
    if(!token)return
    try{
      const response=await fetch('/api/users?role=agent',{
        headers:{Authorization:'Bearer '+token},cache:'no-store',
      })
      const payload=await response.json()
      if(response.ok&&Array.isArray(payload.users))setAgents(payload.users)
    }catch(error){console.error('[Administrations] Agent assignment choices unavailable:',error)}
  }
  useEffect(()=>{void loadAgents()},[token])

  const submitChange=async(
    userId:string,request:()=>Promise<Response>,successFallback:string,
  )=>{
    setActingOn(userId)
    setStatusMsg(null)
    try{
      const response=await request()
      const body=await response.json().catch(()=>null)
      if(!response.ok||!body?.success)throw new Error(body?.error||'Account update failed.')
      setStatusMsg({type:'success',text:body.message||successFallback})
      await loadUsers(0)
      await loadAgents()
    }catch(error){
      setStatusMsg({type:'error',text:error instanceof Error?error.message:'Account update failed.'})
    }finally{setActingOn(null)}
  }
  const userHeaders=()=>({
    'Content-Type':'application/json',Authorization:'Bearer '+(token||''),
  })
  const assignDepartment=(userId:string,code:string)=>{
    void submitChange(userId,()=>fetch('/api/admin/users',{
      method:'PUT',headers:userHeaders(),
      body:JSON.stringify({userId,departmental_code:code}),
    }),'Department updated')
  }
  const assignBridgerToAgent=(bridgerId:string,agentId:string)=>{
    void submitChange(bridgerId,()=>fetch('/api/admin/assign-bridger',{
      method:'POST',headers:userHeaders(),body:JSON.stringify({bridgerId,agentId}),
    }),'Bridger assignment updated')
  }
  const deactivateAccount=(account:ManagedAccount)=>{
    if(!window.confirm('Deactivate '+account.email+'? Access will be revoked. Wallet, ledger and payment history will remain preserved.'))return
    void submitChange(account.id,()=>fetch(
      '/api/admin/users?userId='+encodeURIComponent(account.id),
      {method:'DELETE',headers:{Authorization:'Bearer '+(token||'')}},
    ),'Account deactivated')
  }
  const reactivateAccount=(account:ManagedAccount)=>{
    if(!window.confirm('Reactivate access for '+account.email+'?'))return
    void submitChange(account.id,()=>fetch('/api/admin/users',{
      method:'PUT',headers:userHeaders(),
      body:JSON.stringify({userId:account.id,action:'set_active',active:true}),
    }),'Account reactivated')
  }

  return <section className="space-y-4 p-4" aria-label="Administrations user directory">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="font-bold text-white">Registered users</h3>
        <p className="mt-1 text-xs text-slate-400">
          {loading?'Loading directory…':'Showing '+users.length+' of '+total+' matching accounts'}
          {' · '}Agents, Bridgers, Clients and Administrations
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={()=>setFilter('all')}
          className={filter==='all'
            ? 'rounded-lg bg-purple-500 px-3 py-2 text-xs font-semibold text-white'
            : 'rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200'}>
          All Users
        </button>
        <button type="button" onClick={()=>setFilter('unassigned')}
          className={filter==='unassigned'
            ? 'rounded-lg bg-purple-500 px-3 py-2 text-xs font-semibold text-white'
            : 'rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200'}>
          Needs assignment
        </button>
        <button type="button" onClick={()=>void loadUsers(0)}
          disabled={loading||loadingMore}
          className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
          Refresh users
        </button>
      </div>
    </div>
    <label className="block text-xs text-slate-300">
      Search registered users by name, email, username or position
      <input type="search" value={search} onChange={event=>setSearch(event.target.value)}
        placeholder="Find a registered account"
        className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-3 text-sm text-white placeholder:text-slate-500"
      />
    </label>
    {warnings.length>0&&<div role="status"
      className="space-y-1 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-xs text-amber-100">
      <strong>Financial information partially unavailable</strong>
      {warnings.map((warning,i)=><p key={i}>{warning}</p>)}
    </div>}
    {statusMsg&&<p role="status" className={
      statusMsg.type==='success'?'rounded-xl border border-green-300/20 p-3 text-xs text-green-200':
        'rounded-xl border border-red-300/20 p-3 text-xs text-red-200'
    }>{statusMsg.text}</p>}
    {loadError&&<div role="alert" className="rounded-xl border border-red-300/20 bg-red-400/5 p-4">
      <p className="text-sm font-semibold text-red-200">User directory could not be loaded</p>
      <p className="mt-2 text-xs text-slate-200">{loadError}</p>
      <button type="button" onClick={()=>void loadUsers(0)}
        className="mt-3 rounded-lg border border-white/20 px-4 py-2 text-xs font-semibold text-white">
        Retry user directory
      </button>
    </div>}
    {loading?<p role="status" className="py-8 text-center text-sm text-slate-300">Loading registered accounts…</p>
      :!loadError&&users.length===0
        ?<p className="py-8 text-center text-sm text-slate-300">
          No accounts match these filters. Try All Users or clear the search.
        </p>
        :users.length>0&&<div className="overflow-x-auto">
          <table className="w-full min-w-[730px] text-left text-xs">
            <thead className="border-b border-slate-700 text-slate-400">
              <tr>
                <th className="px-2 py-3">Account</th>
                <th className="px-2 py-3">Department</th>
                <th className="px-2 py-3">Assigned Agent</th>
                <th className="px-2 py-3">System Switch</th>
                <th className="px-2 py-3">Standing</th>
                <th className="px-2 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map(account=><tr key={account.id} className="hover:bg-slate-800/40">
                <td className="px-2 py-3">
                  <p className="font-semibold text-white">{account.name||account.username||'WEAVE user'}</p>
                  <p className="mt-1 break-all text-[10px] text-slate-400">{account.email}</p>
                  <p className="mt-1 text-[10px] capitalize text-slate-500">{account.role}</p>
                </td>
                <td className="px-2 py-3">
                  {account.role==='admin'||!account.is_active
                    ?<span className="text-slate-300">{account.role==='admin'?'Administrations (protected)':account.departmental_code||account.role}</span>
                    :<select value={account.departmental_code||''}
                      onChange={event=>assignDepartment(account.id,event.target.value)}
                      disabled={actingOn===account.id}
                      className="rounded border border-slate-700 bg-slate-800 px-2 py-2 text-white">
                      <option value="">No department</option>
                      <option value="HOPE">Bridger · Hope</option>
                      <option value="STABILITY">Agent · Stability</option>
                      <option value="MOVEMENT">Client · File Folder</option>
                    </select>}
                </td>
                <td className="px-2 py-3">
                  {(account.role==='bridger'||account.departmental_code==='HOPE')&&account.is_active
                    ?<select value={account.assigned_agent_id||''}
                      onChange={event=>assignBridgerToAgent(account.id,event.target.value)}
                      disabled={actingOn===account.id}
                      className="rounded border border-slate-700 bg-slate-800 px-2 py-2 text-white">
                      <option value="">No Agent assigned</option>
                      {agents.map(agent=><option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.bridger_count||0}/3)
                      </option>)}
                    </select>
                    :<span className="text-slate-500">—</span>}
                </td>
                <td className="px-2 py-3 font-mono text-cyan-200">
                  {account.platform_wallet_balance==null?'Unavailable':
                    Number(account.platform_wallet_balance).toLocaleString(undefined,{maximumFractionDigits:6})}
                  {account.wallet_status==='legacy'&&<p className="mt-1 text-[10px] text-amber-200">Legacy wallet</p>}
                  {account.wallet_status==='ambiguous'&&<p className="mt-1 text-[10px] text-amber-200">Wallet review required</p>}
                </td>
                <td className="px-2 py-3 text-slate-300">
                  {!account.is_active?'Deactivated':
                    account.role==='admin'?'Administrations':
                    account.assigned_agent_id?'Assigned':
                    account.role==='bridger'?'Awaiting Agent':
                    account.departmental_code?'Active':'Department pending'}
                </td>
                <td className="space-x-3 whitespace-nowrap px-2 py-3">
                  {account.role==='admin'?<span className="text-[10px] text-slate-400">Protected</span>:
                    account.is_active?<>
                      <button type="button" disabled={actingOn===account.id}
                        onClick={()=>{if(window.confirm('Remove departmental role for '+account.email+'?'))assignDepartment(account.id,'')}}
                        className="text-[10px] text-amber-200 disabled:opacity-50">Remove role</button>
                      <button type="button" disabled={actingOn===account.id}
                        onClick={()=>deactivateAccount(account)}
                        className="text-[10px] text-red-300 disabled:opacity-50">Deactivate</button>
                    </>:<button type="button" disabled={actingOn===account.id}
                      onClick={()=>reactivateAccount(account)}
                      className="text-[10px] text-emerald-200 disabled:opacity-50">Reactivate</button>}
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>}
    {!loading&&hasMore&&!loadError&&<button type="button" onClick={()=>void loadUsers(users.length)}
      disabled={loadingMore} className="rounded-lg border border-sky-200/30 px-4 py-2 text-xs font-semibold text-sky-100 disabled:opacity-50">
      {loadingMore?'Loading accounts…':'Load more registered users'}
    </button>}
  </section>
}

function DepositApprovalSection({ user }: { user: any }) {
  type ReviewDeposit = {
    id: string
    name: string | null
    email: string
    role: string
    status: string
    reference: string
    amount_ngn: number | string
    flame_coin: number | string
    created_at: string
    verified_at: string | null
    manual_credited?: boolean
  }
  const [deposits, setDeposits] = useState<ReviewDeposit[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [reconciling, setReconciling] = useState(false)
  type Inspection = {paymentStatus:string;mode:string;matched:boolean;canResolve:boolean;credits:number;creditedAmount:number;refunds:number;guidance:string}
  const [inspections, setInspections] = useState<Record<string, Inspection>>({})
  const [inspectingId, setInspectingId] = useState<string | null>(null)
  const [manualId, setManualId] = useState<string | null>(null)
  const [manualTransactionId, setManualTransactionId] = useState('')
  const [manualNote, setManualNote] = useState('')
  const [manualConfirmed, setManualConfirmed] = useState(false)
  const [manualBusy, setManualBusy] = useState(false)
  const [manualError, setManualError] = useState('')

  const openManualCredit = (deposit: ReviewDeposit) => {
    setManualId(deposit.id)
    setManualTransactionId('')
    setManualNote('Confirmed the successful charge in the original Paystack merchant dashboard.')
    setManualError('')
    setManualConfirmed(false)
  }
  const closeManualCredit = () => { if (!manualBusy) setManualId(null) }
  const creditAfterManualConfirmation = async (deposit: ReviewDeposit) => {
    if (manualBusy || !manualConfirmed) return
    setManualError('')
    setManualBusy(true)
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch('/api/admin/deposit/paystack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action:'manual_credit',depositId:deposit.id,
          confirmedInPaystackDashboard:manualConfirmed,
          evidenceNote:manualNote,
          paystackTransactionId:manualTransactionId.trim(),
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.success || result.credited !== true) {
        throw new Error(result.error || 'Manual credit endpoint unavailable on this release (HTTP ' + response.status + '). The wallet was not confirmed credited.')
      }
      toast.success(result.message || 'Manual Paystack credit recorded.')
      setManualId(null)
      await fetchPendingDeposits(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Manual credit unavailable.'
      setManualError(message)
      toast.error(message)
    } finally { setManualBusy(false) }
  }

  useEffect(() => {
    void fetchPendingDeposits()
    const stop = visiblePoll(() => fetchPendingDeposits(true), 8000, false)
    return stop
  }, [])

  const fetchPendingDeposits = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch('/api/admin/deposit/paystack', {
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to load deposits')
      setDeposits(Array.isArray(data.deposits) ? data.deposits : [])
    } catch (error) {
      console.error('Paystack reconciliation list failed:', error)
      if (!silent) toast.error(error instanceof Error ? error.message : 'Unable to load deposits')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const inspectDeposit = async (depositId: string) => {
    setInspectingId(depositId)
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch('/api/admin/deposit/paystack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'inspect', depositId }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Paystack evidence unavailable')
      setInspections(previous => ({ ...previous, [depositId]: data.inspection }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Paystack inspection unavailable')
    } finally {
      setInspectingId(null)
    }
  }

  const verifyDeposit = async (depositId: string) => {
    setProcessingId(depositId)
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch('/api/admin/deposit/paystack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'resolve', depositId }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || data.message || 'Payment is not yet verified')
      toast.success(data.message || 'Payment reconciled with Paystack')
      setInspections(previous => {
        const next = { ...previous }
        delete next[depositId]
        return next
      })
      await fetchPendingDeposits(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Payment verification is unavailable')
      await inspectDeposit(depositId)
    } finally {
      setProcessingId(null)
    }
  }

  const reconcileExisting = async () => {
    if (reconciling) return
    setReconciling(true)
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch('/api/admin/deposit/paystack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reconcilePending: true }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Reconciliation unavailable')
      toast.success(data.message || 'Reconciliation checked')
      await fetchPendingDeposits(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to reconcile Paystack deposits')
    } finally {
      setReconciling(false)
    }
  }

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="mb-1 font-bold text-white">Paystack Payments · Automatic Wallet Credit</h3>
          <p className="max-w-xl text-xs leading-5 text-slate-400">
            Paystack-confirmed payments credit the user's wallet automatically and immediately.
            Administrations receives a payment and credit notification; no manual approval is needed.
            For older stuck payments, Administrations may credit once after personally confirming the original successful charge in the Paystack merchant dashboard. Each exceptional credit is recorded for audit.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={reconciling} onClick={() => void reconcileExisting()}>
            {reconciling ? 'Checking Paystack...' : 'Reconcile previous deposits'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void fetchPendingDeposits()}>Refresh</Button>
        </div>
      </div>
      {loading ? (
        <p className="py-8 text-center text-xs text-slate-400">Loading Paystack deposits...</p>
      ) : deposits.length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-400">No Paystack deposit records yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {deposits.map(deposit => (
            <div key={deposit.id} className="rounded-lg border border-white/10 bg-slate-800/50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-white">{deposit.name || deposit.email} <span className="text-xs font-normal text-slate-400">· {deposit.role}</span></p>
                  <p className="text-sm text-cyan-200">₦{Number(deposit.amount_ngn).toLocaleString()} · {Number(deposit.flame_coin).toLocaleString()} System Switch</p>
                  <p className="mt-1 break-all font-mono text-[10px] text-slate-400">Reference: {deposit.reference}</p>
                  <p className="mt-1 text-[10px] text-slate-500">{new Date(deposit.created_at).toLocaleString()}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={deposit.status === 'approved' && deposit.verified_at ? 'text-xs font-bold text-emerald-300' : deposit.status === 'rejected' ? 'text-xs font-bold text-red-300' : 'text-xs font-bold text-amber-300'}>
                    {deposit.status === 'approved' ? (deposit.manual_credited ? 'Administrations-confirmed · Wallet credited' : deposit.verified_at ? 'Paystack verified · Wallet credited' : 'Approval without Paystack proof · Investigate') : deposit.status === 'rejected' ? 'Verification failed · Review' : 'Awaiting Paystack verification'}
                  </span>
                  {(deposit.status === 'pending' || deposit.status === 'rejected' || (deposit.status === 'approved' && !deposit.verified_at)) && (
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button variant="outline" size="sm" disabled={inspectingId === deposit.id} onClick={() => void inspectDeposit(deposit.id)}>
                        {inspectingId === deposit.id ? 'Inspecting...' : 'Inspect Paystack'}
                      </Button>
                      <Button size="sm" disabled={processingId === deposit.id} onClick={() => void verifyDeposit(deposit.id)}>
                        {processingId === deposit.id ? 'Verifying...' : deposit.status === 'pending' ? 'Verify with Paystack' : deposit.status === 'rejected' ? 'Retry verified recovery' : 'Attach verified proof'}
                      </Button>
                      {(deposit.status === 'pending' || deposit.status === 'rejected') && Number(deposit.amount_ngn) <= 10000 && (
                        <Button size="sm" variant="outline"
                          disabled={manualBusy}
                          onClick={() => openManualCredit(deposit)}>
                          Manual credit after Paystack confirmation
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {manualId === deposit.id && (
                <div className="mt-4 space-y-3 rounded-xl border border-amber-300/25 bg-black/30 p-4" role="region" aria-label="Manual Paystack wallet approval">
                  <p className="text-sm font-bold text-amber-100">Confirm successful payment · Credit wallet</p>
                  <p className="text-xs leading-5 text-slate-300">
                    Confirm this specific transaction shows Success in your original Paystack merchant dashboard.
                    Weave will credit the recorded amount once; it will not ask you to re-enter the reference or amount.
                  </p>
                  <div className="rounded-lg border border-white/10 bg-slate-900/60 p-3 text-sm text-white">
                    <p className="font-semibold">{deposit.name || deposit.email} · {deposit.role}</p>
                    <p>₦{Number(deposit.amount_ngn).toLocaleString()} → {Number(deposit.flame_coin).toLocaleString()} System Switch</p>
                    <p className="mt-1 break-all font-mono text-xs text-cyan-200">{deposit.reference}</p>
                  </div>
                  <a href="https://dashboard.paystack.com/" target="_blank" rel="noreferrer noopener"
                    className="inline-block rounded-lg border border-white/20 px-3 py-2 text-xs text-cyan-200 underline">
                    Open Paystack merchant dashboard
                  </a>
                  <label className="block text-xs text-slate-200">
                    Optional Paystack numeric transaction ID (for additional duplicate checking)
                    <input type="text" inputMode="numeric" autoComplete="off" value={manualTransactionId}
                      onChange={event => setManualTransactionId(event.target.value)}
                      placeholder="Leave blank if not shown in Paystack"
                      className="mt-1 w-full rounded-lg border border-white/20 bg-[#0a1a25] p-3 text-sm text-white" />
                  </label>
                  <label className="block text-xs text-slate-200">
                    Verification note
                    <textarea rows={2} maxLength={800} value={manualNote}
                      onChange={event => setManualNote(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-white/20 bg-[#0a1a25] p-3 text-sm text-white" />
                  </label>
                  <label className="flex items-start gap-3 rounded-lg border border-amber-300/20 p-3 text-xs leading-5 text-amber-100">
                    <input type="checkbox" checked={manualConfirmed}
                      onChange={event => setManualConfirmed(event.target.checked)} className="mt-1" />
                    I independently checked Paystack and confirm this reference was successfully paid, in full, without a refund or reversal. I authorize the exact stored wallet credit.
                  </label>
                  {manualError && <p role="alert" className="rounded-lg border border-red-400/30 p-3 text-xs text-red-200">{manualError}</p>}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={manualBusy || !manualConfirmed || manualNote.trim().length < 12 ||
                      (manualTransactionId.trim() !== '' && !/^[0-9]{1,40}$/.test(manualTransactionId.trim()))}
                      onClick={() => void creditAfterManualConfirmation(deposit)}>
                      {manualBusy ? 'Crediting wallet...' : 'Approve and credit ' + Number(deposit.flame_coin).toLocaleString() + ' System Switch'}
                    </Button>
                    <Button size="sm" variant="outline" disabled={manualBusy} onClick={closeManualCredit}>Cancel</Button>
                  </div>
                </div>
              )}
              {inspections[deposit.id] && (
                <div className="mt-3 rounded-lg border border-sky-300/15 bg-black/25 p-3 text-xs leading-5 text-slate-300" role="status">
                  <p className="font-bold text-sky-100">Paystack evidence · {inspections[deposit.id].paymentStatus} · {inspections[deposit.id].mode} mode</p>
                  <p className="mt-1">{inspections[deposit.id].guidance}</p>
                  <p className="mt-1">Prior ledger credits: {inspections[deposit.id].credits} · Recorded System Switch: {inspections[deposit.id].creditedAmount.toLocaleString()} · Refund events: {inspections[deposit.id].refunds}</p>
                  <p className="mt-1 font-semibold">{inspections[deposit.id].canResolve ? 'Eligible for Paystack-verified reconciliation.' : 'No automatic wallet credit permitted until evidence is resolved.'}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BridgeDepositApprovalSection({ user }: { user: any }) {
  const [deposits, setDeposits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    void fetchPendingDeposits()
    const stop = visiblePoll(() => fetchPendingDeposits(true), 8000, false)
    return stop
  }, [])

  const fetchPendingDeposits = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch('/api/admin/bridge-deposits/pending', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      const data = await response.json()
      setDeposits(Array.isArray(data.deposits) ? data.deposits : [])
    } catch (error) {
      console.error('Error fetching pending bridge deposits:', error)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const verifyDeposit = async (depositId: string, status: 'approved' | 'rejected', source?: string) => {
    setProcessingId(depositId)
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch('/api/admin/bridge-deposits/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ depositId, status, source }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success(status === 'approved' ? `Received — file number ${data.fileNumber}` : 'Declined')
      } else {
        toast.error(data.error || "That didn't update")
      }
      await fetchPendingDeposits(true)
    } catch (error) {
      console.error('Error verifying bridge deposit:', error)
      toast.error("That didn't go through")
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="p-4">
      <h3 className="font-bold text-white mb-1">Pending File Folder Crossings</h3>
      <p className="mb-4 text-[10px] leading-5 text-slate-500">Like Department Entry Tickets: payment arrives here, Administrations verifies it, and that verification issues the File Number and opens the Client crossing into System Switch.</p>

      {loading ? (
        <p className="text-slate-500 text-center py-8 text-xs">Loading deposits...</p>
      ) : deposits.length === 0 ? (
        <p className="text-slate-500 text-center py-8 text-xs">No pending deposits</p>
      ) : (
        <div className="space-y-3">
          {deposits.map((deposit: any) => (
            <div key={deposit.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-semibold text-white text-sm">{deposit.prospect_name} <span className="text-slate-500 font-normal">({deposit.prospect_phone})</span></p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {Number(deposit.tier_trx).toLocaleString()} TRX · {deposit.source === 'file_folder_purchase'
                      ? `Bridge of Radiance purchase${deposit.bridge_code ? ` · /bridge/${deposit.bridge_code}` : ''}`
                      : `via ${deposit.bridger_name || 'Bridger'}'s Bridge AI${deposit.bridge_code ? ` · /bridge/${deposit.bridge_code}` : ''}`}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {new Date(deposit.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-yellow-400 uppercase">{deposit.status === 'pending_admin_confirmation' ? 'awaiting verification' : deposit.status}</span>
              </div>
              {deposit.tx_hash && (
                <div className="mt-2 p-2 bg-slate-900/50 rounded border border-slate-700">
                  <p className="text-[10px] text-slate-500 uppercase mb-1">Tx Hash</p>
                  <p className="text-xs text-slate-300 break-all">{deposit.tx_hash}</p>
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  disabled={processingId === deposit.id}
                  onClick={() => verifyDeposit(deposit.id, 'approved', deposit.source)}
                  className="bg-green-600 hover:bg-green-700 h-8 text-xs"
                >
                  {processingId === deposit.id ? 'Verifying…' : 'Verify · Issue File Number · Open Crossing'}
                </Button>
                <Button
                  size="sm"
                  disabled={processingId === deposit.id}
                  onClick={() => verifyDeposit(deposit.id, 'rejected', deposit.source)}
                  className="bg-red-600 hover:bg-red-700 h-8 text-xs"
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function WithdrawalApprovalSection({ user }: { user: any }) {
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    fetchPendingWithdrawals()
  }, [])

  const fetchPendingWithdrawals = async () => {
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch('/api/admin/withdrawal/pending', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      const data = await response.json()
      setWithdrawals(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching pending withdrawals:', error)
    } finally {
      setLoading(false)
    }
  }

  const verifyWithdrawal = async (withdrawalId: string, status: 'approved' | 'rejected') => {
    setProcessingId(withdrawalId)
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch('/api/admin/withdrawal/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ withdrawalId, status }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success(data.message || `Withdrawal ${status === 'approved' ? 'released' : 'declined'}`)
      } else {
        toast.error(data.error || "That didn't update")
      }
      fetchPendingWithdrawals()
    } catch (error) {
      console.error('Error verifying withdrawal:', error)
      toast.error("That didn't go through")
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="p-4">
      <h3 className="font-bold text-white mb-4">Pending Withdrawals</h3>

      {loading ? (
        <p className="text-slate-500 text-center py-8 text-xs">Loading withdrawals...</p>
      ) : withdrawals.length === 0 ? (
        <p className="text-slate-500 text-center py-8 text-xs">No pending withdrawals</p>
      ) : (
        <div className="space-y-3">
          {withdrawals.map((w: any) => (
            <div key={w.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-semibold text-white text-sm">{w.name} <span className="text-slate-500 font-normal">({w.email})</span> <span className="text-slate-600 text-[10px] uppercase">{w.user_role}</span></p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {Number(w.amount_trx).toFixed(6)} TRX → {w.wallet_address}
                  </p>
                  {w.payout_details && (() => {
                    try {
                      const details = typeof w.payout_details === 'string' ? JSON.parse(w.payout_details) : w.payout_details
                      if (!details || (!details.bankName && !details.accountNumber && !details.accountName)) return null
                      return (
                        <p className="text-[10px] text-cyan-400 mt-1">
                          {details.bankName} • {details.accountNumber} • {details.accountName}
                        </p>
                      )
                    } catch {
                      return null
                    }
                  })()}
                  <p className="text-[10px] text-slate-500 mt-1">
                    {new Date(w.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-yellow-400 uppercase">{w.status}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  disabled={processingId === w.id}
                  onClick={() => verifyWithdrawal(w.id, 'approved')}
                  className="bg-green-600 hover:bg-green-700 h-8 text-xs"
                >
                  {processingId === w.id ? 'Processing...' : 'Approve'}
                </Button>
                <Button
                  size="sm"
                  disabled={processingId === w.id}
                  onClick={() => verifyWithdrawal(w.id, 'rejected')}
                  className="bg-red-600 hover:bg-red-700 h-8 text-xs"
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AnnouncementSection() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [targetRole, setTargetRole] = useState('all')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const sendAnnouncement = async () => {
    if (!title.trim() || !message.trim()) {
      setResult('Title and message are required')
      return
    }
    setSending(true)
    setResult(null)
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const roles = targetRole === 'all' ? undefined : [targetRole]
      const response = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ title, content: message, type: 'announcement', roles }),
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setResult(data.message)
        setTitle('')
        setMessage('')
      } else {
        setResult(data.error || 'Failed to send')
      }
    } catch (error) {
      setResult('Failed to send announcement')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-lg">
      <h3 className="font-bold text-white">Send Announcement / App Update Notice</h3>
      {result && (
        <div className="px-3 py-2 rounded-lg text-xs bg-cyan-500/20 text-cyan-300">{result}</div>
      )}
      <div className="space-y-1">
        <label className="text-[10px] text-slate-500 uppercase font-bold">Send To</label>
        <select
          value={targetRole}
          onChange={(e) => setTargetRole(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-xs"
        >
          <option value="all">All Users</option>
          <option value="agent">Agents Only</option>
          <option value="bridger">Bridgers Only</option>
        </select>
      </div>
      <input
        type="text"
        placeholder="Title (e.g. App Update Available)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm"
      />
      <textarea
        placeholder="Message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm"
      />
      <Button onClick={sendAnnouncement} disabled={sending} className="bg-cyan-600 hover:bg-cyan-700">
        {sending ? 'Sending...' : 'Send Notification'}
      </Button>
    </div>
  )
}
