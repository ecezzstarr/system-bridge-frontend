'use client'
import Link from 'next/link'
import {useCallback,useEffect,useState} from 'react'
import {ArrowLeft,ArrowUpRight,Bell,CheckCheck,Inbox,RefreshCw} from 'lucide-react'
import {useAuth} from '@/lib/auth-provider'
import {notificationDestination} from '@/lib/notification-navigation'

type Notice={id:string;type:string;title:string;content:string;from_user_name:string|null;link:string|null;is_read:boolean;created_at:string}
export default function NotificationInbox(){
  const {user,token,isInitialized}=useAuth()
  const [items,setItems]=useState<Notice[]>([])
  const [selectedId,setSelectedId]=useState('')
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const load=useCallback(async()=>{
    if(!token)return
    try{
      const response=await fetch('/api/notifications',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'Unable to load notifications')
      setItems(data.notifications||[])
      setError('')
    }catch(e){setError(e instanceof Error?e.message:'Unable to load notifications')}
    finally{setLoading(false)}
  },[token])
  useEffect(()=>{void load()},[load])
  useEffect(()=>{
    const requested=new URLSearchParams(window.location.search).get('open')
    if(requested)setSelectedId(requested)
  },[])
  const markRead=async(ids:string[],all=false)=>{
    if(!token)return
    try{
      const response=await fetch('/api/notifications',{method:'PATCH',
        headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body:JSON.stringify(all?{markAllRead:true}:{notificationIds:ids})})
      if(!response.ok)throw new Error('Unable to update notification')
      setItems(previous=>previous.map(item=>all||ids.includes(item.id)?{...item,is_read:true}:item))
      setError('')
    }catch(e){setError(e instanceof Error?e.message:'Unable to update notification')}
  }
  const select=(item:Notice)=>{
    setSelectedId(item.id)
    window.history.replaceState(null,'',`/notifications?open=${encodeURIComponent(item.id)}`)
    if(!item.is_read)void markRead([item.id])
  }
  const active=items.find(item=>item.id===selectedId)
  const unread=items.filter(item=>!item.is_read).length
  if(!isInitialized)return <main className="p-6 text-slate-200">Opening notifications…</main>
  if(!user)return <main className="p-6 text-slate-200">Sign in to view your messages.</main>
  return <main className="weave-operating-environment mx-auto min-h-[75vh] max-w-7xl px-3 py-6 text-white sm:px-6" data-weave-notification-inbox="role-inbox">
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <Link href={user.role==='admin'?'/admin/dashboard':user.role==='client'?'/client/dashboard':user.role==='bridger'?'/bridger/dashboard':'/agent/dashboard'} className="inline-flex items-center gap-2 text-xs font-bold text-cyan-200"><ArrowLeft className="h-4 w-4"/> Back to my dashboard</Link>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[.22em] text-cyan-200">WEAVE · Personal correspondence</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Notifications & messages</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Read the complete message before opening its company page. Only notifications addressed to your signed-in account appear here.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-2 text-xs font-bold text-cyan-100">{unread} unread</span>
        <button type="button" onClick={()=>void load()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 px-3 text-xs font-bold"><RefreshCw className="h-4 w-4"/> Refresh</button>
        {unread>0&&<button type="button" onClick={()=>void markRead([],true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 px-3 text-xs font-bold"><CheckCheck className="h-4 w-4"/> Mark all read</button>}
      </div>
    </header>
    {error&&<p role="alert" className="mb-4 rounded-xl border border-rose-300/20 bg-rose-300/5 p-4 text-sm text-rose-200">{error}</p>}
    <div className="grid min-h-[32rem] gap-4 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/65" aria-label="Your notification messages">
        <div className="flex items-center gap-2 border-b border-white/10 p-4 text-sm font-black"><Inbox className="h-4 w-4 text-cyan-200"/> Inbox · {items.length}</div>
        <div className="max-h-[65vh] overflow-y-auto">
          {items.map(item=><button key={item.id} type="button" onClick={()=>select(item)}
            aria-pressed={active?.id===item.id}
            className={`w-full border-b border-white/10 p-4 text-left transition hover:bg-cyan-100/10 ${selectedId===item.id?'bg-cyan-100/10':'bg-transparent'}`}>
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 break-words text-sm font-bold text-white">{!item.is_read&&<span className="mr-2 inline-block h-2 w-2 rounded-full bg-cyan-300" aria-label="Unread"/>}{item.title}</p>
              <span className="shrink-0 text-[10px] text-slate-400">{new Date(item.created_at).toLocaleDateString('en-NG')}</span>
            </div>
            <p className="mt-2 line-clamp-2 break-words text-xs leading-5 text-slate-300">{item.content||'Open to view this notification.'}</p>
            <p className="mt-2 text-[11px] font-bold text-cyan-200">View message →</p>
          </button>)}
          {!items.length&&<div className="p-10 text-center text-sm text-slate-400"><Bell className="mx-auto mb-3 h-8 w-8"/> {loading?'Loading notifications…':'No messages yet'}</div>}
        </div>
      </section>
      <section className="min-w-0 rounded-2xl border border-cyan-200/15 bg-slate-950/75 p-5 sm:p-7" aria-live="polite" aria-label="Full notification message">
        {active?<>
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-200">Full message · {active.type.replaceAll('_',' ')}</p>
          <h2 className="mt-4 break-words text-xl font-black sm:text-2xl">{active.title}</h2>
          <p className="mt-3 text-xs text-slate-400">{active.from_user_name||'WEAVE'} · {new Date(active.created_at).toLocaleString('en-NG')}</p>
          <div className="my-6 border-t border-white/10"/>
          <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-100">{active.content||'No additional message was provided.'}</p>
          <div className="mt-8 flex flex-wrap gap-3 border-t border-white/10 pt-5">
            {(()=>{const destination=notificationDestination(active,user.role);return <Link href={destination.href} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-cyan-300 px-5 text-sm font-black text-slate-950"><ArrowUpRight className="h-4 w-4"/>{destination.label}</Link>})()}
            {!active.is_read&&<button type="button" onClick={()=>void markRead([active.id])} className="min-h-12 rounded-xl border border-white/20 px-4 text-xs font-bold">Mark as read</button>}
          </div>
          {!notificationDestination(active,user.role).exact&&<p className="mt-3 text-xs leading-5 text-slate-400">This message did not include a direct destination. Open the indicated workspace to continue.</p>}
        </>:<div className="flex h-full min-h-64 flex-col items-center justify-center text-center"><Bell className="mb-4 h-9 w-9 text-cyan-200"/><h2 className="text-lg font-black">Select a message</h2><p className="mt-2 text-sm text-slate-400">Its complete contents and related work page will appear here.</p></div>}
      </section>
    </div>
  </main>
}
