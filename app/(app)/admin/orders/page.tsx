'use client'
import Link from 'next/link'
import { useEffect,useState } from 'react'
import { ArrowLeft,ArrowRight,Bell,CheckCircle2,RefreshCw,ShoppingBag } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { visiblePoll } from '@/lib/visible-poll'

type Alert={id:string;type:string;title:string;content:string;link:string;is_read:boolean;created_at:string}
type Feed={alerts:Alert[];page:number;total:number;unread:number}

export default function AdminOrderAlerts(){
  const {user}=useAuth()
  const [feed,setFeed]=useState<Feed>({alerts:[],page:0,total:0,unread:0})
  const [filter,setFilter]=useState('all')
  const [page,setPage]=useState(0)
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)

  useEffect(()=>{
    if(user?.role!=='admin')return
    const stop=visiblePoll(async signal=>{
      try{
        const token=localStorage.getItem('ssb_auth_token')
        const response=await fetch('/api/admin/orders?page='+page,{
          signal,cache:'no-store',headers:token?{Authorization:'Bearer '+token}:{},
        })
        if(!response.ok)throw new Error('Order alert feed could not be loaded')
        const data=await response.json()
        if(!signal.aborted){setFeed({alerts:data.alerts||[],page,total:data.total||0,unread:data.unread||0});setError('')}
      }catch{
        if(!signal.aborted)setError('Order notifications are temporarily unavailable. Retry shortly.')
      }
    },10000,true)
    return stop
  },[page,user?.role])

  const markRead=async(id:string)=>{
    setBusy(true)
    try{
      const token=localStorage.getItem('ssb_auth_token')
      const result=await fetch('/api/notifications',{method:'PATCH',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({notificationId:id})})
      if(!result.ok)throw new Error('Read update failed')
      setFeed(prev=>({...prev,unread:Math.max(0,prev.unread-(prev.alerts.find(a=>a.id===id&&!a.is_read)?1:0)),alerts:prev.alerts.map(a=>a.id===id?{...a,is_read:true}:a)}))
    }catch{setError('Could not mark the order alert as read')}
    finally{setBusy(false)}
  }
  if(user?.role!=='admin')return <p className="p-5 text-sm text-slate-400">Administration access required.</p>
  const visible=feed.alerts.filter(alert=>{
    if(filter==='unread')return !alert.is_read
    if(filter==='all')return true
    return alert.content.startsWith('['+filter.toUpperCase()+']')
  })
  const allowedLink=(link:string)=>link.startsWith('/admin/')&&!link.startsWith('//')?link:'/admin/control-center'
  return <main className="mx-auto min-h-dvh max-w-5xl px-3 py-5 text-white sm:px-5" data-admin-order-inbox="live">
    <Link href="/admin/control-center" className="inline-flex items-center gap-2 text-xs text-slate-300"><ArrowLeft className="h-4 w-4"/>Administration</Link>
    <header className="mt-5 flex flex-wrap items-start justify-between gap-4 border-b border-amber-200/20 pb-5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[.16em] text-amber-200">WEAVE · Administration</p>
        <h1 className="mt-2 text-2xl font-black sm:text-3xl">Orders & payment alerts</h1>
        <p className="mt-2 text-xs leading-5 text-slate-400">Committed requests from Agents, Bridgers, Clients and their public Customer Doors. Payment proof is not payment approval.</p>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="rounded-xl border border-white/15 px-3 py-2"><ShoppingBag className="mr-1 inline h-4 w-4"/> {feed.total} events</span>
        <span className="rounded-xl border border-amber-200/30 bg-amber-200/10 px-3 py-2"><Bell className="mr-1 inline h-4 w-4"/> {feed.unread} unread</span>
      </div>
    </header>
    <nav className="mt-5 flex gap-2 overflow-x-auto pb-2" aria-label="Filter Administration order alerts">
      {['all','unread','agent','bridger','client','visitor'].map(item=><button key={item} type="button" onClick={()=>setFilter(item)}
        className={'shrink-0 rounded-full border px-3 py-2 text-xs font-bold capitalize '+(filter===item?'border-amber-200 bg-amber-100 text-slate-950':'border-white/15 bg-white/5 text-slate-200')}
        aria-pressed={filter===item}>{item}</button>)}
    </nav>
    {error&&<p role="status" className="mt-4 border border-amber-200/35 bg-amber-300/5 p-3 text-xs text-amber-100">{error}</p>}
    <div className="mt-4 space-y-2">
      {visible.map(alert=><article key={alert.id} className={'rounded-xl border px-4 py-3 '+(alert.is_read?'border-white/10 bg-white/[.025]':'border-amber-200/30 bg-amber-200/[.055]')}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-black text-white">{alert.title}</p>
          <time className="text-[10px] text-slate-400">{new Date(alert.created_at).toLocaleString()}</time>
        </div>
        <p className="mt-2 break-words text-xs leading-5 text-slate-300">{alert.content}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Link href={allowedLink(alert.link)} onClick={()=>{void markRead(alert.id)}} className="inline-flex min-h-9 items-center gap-1 text-xs font-black text-amber-200">Open Administration workspace <ArrowRight className="h-4 w-4"/></Link>
          {!alert.is_read&&<button type="button" disabled={busy} onClick={()=>{void markRead(alert.id)}} className="inline-flex min-h-9 items-center gap-1 text-xs text-sky-200 disabled:opacity-40"><CheckCircle2 className="h-4 w-4"/>Mark read</button>}
        </div>
      </article>)}
      {!visible.length&&!error&&<p className="rounded-xl border border-white/10 p-5 text-sm text-slate-300">No order alerts match this filter on this page.</p>}
    </div>
    <footer className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 py-4 text-xs text-slate-200">
      <button type="button" disabled={page===0} onClick={()=>setPage(v=>v-1)} className="min-h-10 rounded-lg border border-white/20 px-4 disabled:opacity-35">Previous</button>
      <span>Page {page+1} of {Math.max(1,Math.ceil(feed.total/100))}</span>
      <button type="button" disabled={(page+1)*100>=feed.total} onClick={()=>setPage(v=>v+1)} className="min-h-10 rounded-lg border border-white/20 px-4 disabled:opacity-35">Next <RefreshCw className="ml-1 inline h-3.5 w-3.5"/></button>
    </footer>
  </main>
}
