'use client'
import Link from 'next/link'
import {useCallback,useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'

type Health={
 activeAdministrations:number
 inbox:{total:number;myUnread:number;last24h:number;latestAt:string|null}
 push:{initialized:boolean;subscribedAdministrationsDevices:number;myDevices:number;
   queued:number;delayed:number;myQueued:number}
 events:{type:string;total:number}[]
}
export default function AdministrationNotificationHealth(){
 const {user,token,isInitialized}=useAuth()
 const [data,setData]=useState<Health|null>(null)
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const [busy,setBusy]=useState(false)
 const refresh=useCallback(async()=>{
  if(!token)return
  try{
   const res=await fetch('/api/admin/notification-health',{headers:{Authorization:'Bearer '+token},cache:'no-store'})
   const body=await res.json()
   if(!res.ok)throw new Error(body.error||'Notification records unavailable')
   setData(body);setError('')
  }catch(e){setError(e instanceof Error?e.message:'Unable to load notification records')}
 },[token])
 useEffect(()=>{void refresh()},[refresh])
 async function test(){
  if(!token)return
  setBusy(true);setMessage('');setError('')
  try{
   const res=await fetch('/api/admin/notification-health',{method:'POST',
    headers:{Authorization:'Bearer '+token}})
   const body=await res.json()
   if(!res.ok)throw new Error(body.error||'Notification test failed')
   setMessage(body.notice||'Test recorded')
   await refresh()
  }catch(e){setError(e instanceof Error?e.message:'Notification test unavailable')}
  finally{setBusy(false)}
 }
 if(!isInitialized)return <main className="p-6 text-slate-200">Opening Administrations records…</main>
 if(user?.role!=='admin')return <main className="p-6 text-slate-200">Administrations access required.</main>
 return <main className="mx-auto min-h-dvh max-w-5xl space-y-6 px-4 py-8 text-white" data-administrations-notification-health="true">
  <nav className="flex flex-wrap gap-4 text-sm text-cyan-200">
   <Link href="/admin/control-center" className="underline">Administrations control center</Link>
   <Link href="/notifications" className="underline">Full notification inbox</Link>
   <Link href="/admin/orders" className="underline">Order alerts</Link>
  </nav>
  <header className="space-y-3">
   <p className="text-xs font-bold uppercase tracking-widest text-cyan-200">The Company of Time · Administrations</p>
   <h1 className="text-2xl font-bold sm:text-3xl">Notification & delivery health</h1>
   <p className="max-w-3xl text-sm leading-7 text-slate-300">Inspect recorded company alerts separately from phone delivery. A recorded notification does not prove that a phone displayed it. Device push requires an enabled subscription and a running delivery worker.</p>
  </header>
  <div className="flex flex-wrap gap-3">
   <button type="button" onClick={()=>void refresh()} className="rounded-xl border border-cyan-300/30 px-5 py-3 text-sm font-bold text-cyan-100">Refresh records</button>
   <button type="button" onClick={()=>void test()} disabled={busy} className="rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">{busy?'Recording…':'Send a test notification to my account'}</button>
  </div>
  {error&&<p role="alert" className="rounded-xl border border-rose-400/30 p-4 text-sm text-rose-200">{error}</p>}
  {message&&<p role="status" className="rounded-xl border border-cyan-300/30 p-4 text-sm text-cyan-100">{message}</p>}
  {data&&<>
   <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    {[
     ['Active Administrations accounts',data.activeAdministrations],
     ['Recorded alerts (all time)',data.inbox.total],
     ['My unread alerts',data.inbox.myUnread],
     ['Recorded alerts in 24 hours',data.inbox.last24h],
    ].map(([name,value])=><article key={name} className="rounded-xl border border-white/10 bg-slate-900/70 p-5"><p className="text-sm text-slate-300">{name}</p><p className="mt-3 text-3xl font-bold">{value}</p></article>)}
   </section>
   <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
    <h2 className="text-xl font-bold">Phone push delivery</h2>
    <p className="mt-2 text-sm leading-6 text-slate-300">{data.push.initialized?'Subscription and queue tables exist.':'Phone push tables are not initialized. Verify worker and notification setup.'} Recorded messages remain available in the inbox independently.</p>
    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
     <div><dt className="text-slate-400">Subscribed Administrations devices</dt><dd className="mt-1 font-bold">{data.push.subscribedAdministrationsDevices}</dd></div>
     <div><dt className="text-slate-400">My subscribed devices</dt><dd className="mt-1 font-bold">{data.push.myDevices}</dd></div>
     <div><dt className="text-slate-400">Queued deliveries</dt><dd className="mt-1 font-bold">{data.push.queued}</dd></div>
     <div><dt className="text-slate-400">Delayed over ten minutes</dt><dd className="mt-1 font-bold">{data.push.delayed}</dd></div>
    </dl>
    {data.push.myDevices===0&&<p className="mt-4 text-sm text-amber-200">This Administrations account has no registered push device. Open the notification bell and select Enable phone notifications.</p>}
    {data.push.delayed>0&&<p className="mt-4 text-sm text-amber-200">Some phone deliveries are delayed. Inspect the running push worker and subscription health. Inbox records are not lost.</p>}
   </section>
   <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
    <h2 className="text-xl font-bold">My activity types · last 24 hours</h2>
    <p className="mt-2 text-sm text-slate-300">Counts of recorded alerts, not unverified revenue or completed work.</p>
    <div className="mt-4 divide-y divide-white/10">
     {data.events.map(row=><div key={row.type} className="flex items-center justify-between gap-3 py-3 text-sm"><span className="break-words text-slate-200">{row.type.replaceAll('_',' ')}</span><strong>{row.total}</strong></div>)}
     {data.events.length===0&&<p className="py-4 text-sm text-slate-400">No notifications were recorded for this Administrations account in the last 24 hours.</p>}
    </div>
   </section>
  </>}
 </main>
}
