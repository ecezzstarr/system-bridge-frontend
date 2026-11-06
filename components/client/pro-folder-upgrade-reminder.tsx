'use client'
import Link from 'next/link'
import {useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
type Status={fileNumber:string;tier:string;status:string;notice:string}
export default function ProFolderUpgradeReminder(){
 const {token,user}=useAuth()
 const [upgrade,setUpgrade]=useState<Status|null>(null)
 useEffect(()=>{
  if(!token||user?.role!=='client')return
  let active=true
  const load=async()=>{
   try{const res=await fetch('/api/client/folder-upgrade',{headers:{Authorization:'Bearer '+token},cache:'no-store'})
    if(!res.ok)return
    const body=await res.json();if(active)setUpgrade(body.upgrade||null)
   }catch{}
  }
  void load()
  const interval=window.setInterval(()=>{if(document.visibilityState==='visible')void load()},30000)
  return()=>{active=false;window.clearInterval(interval)}
 },[token,user?.role])
 if(!upgrade||upgrade.status==='active')return null
 return <section className="mx-auto max-w-6xl px-4 pb-6 text-white" data-weave-client-pro-reminder="true">
  <div className="rounded-2xl border border-sky-300/25 bg-[#071727]/95 p-5">
   <p className="text-xs font-bold uppercase tracking-widest text-cyan-200">Pro File Folder · {upgrade.fileNumber}</p>
   <h2 className="mt-3 text-xl font-bold">One-time Pro activation · 680 USDT</h2>
   <p className="mt-2 text-sm text-slate-300">{upgrade.notice}</p>
   <p className="mt-2 text-xs text-slate-400">Your account and company workspaces remain available while the private Pro world awaits Forensics approval.</p>
   <Link href="/client/pro-activation" className="mt-4 inline-flex rounded-xl border border-cyan-300/30 px-4 py-3 text-sm font-bold text-cyan-200">Continue Pro activation</Link>
  </div>
 </section>
}
