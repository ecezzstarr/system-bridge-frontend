'use client'
import Link from 'next/link'
import {useEffect,useState} from 'react'
import {useAuth} from '@/lib/auth-provider'
type Status={fileNumber:string;tier:string;status:string;notice:string;constructionNote:string;
 loan:{remaining:number|null;display:string;agreementConfirmed:boolean;fundingConfirmed:boolean}}
export default function ProFolderUpgradeReminder(){
 const {token,user}=useAuth()
 const [upgrade,setUpgrade]=useState<Status|null>(null)
 useEffect(()=>{
  if(!token||user?.role!=='client')return
  let active=true
  const load=async()=>{
   try{
    const res=await fetch('/api/client/folder-upgrade',{headers:{Authorization:'Bearer '+token},cache:'no-store'})
    if(!res.ok)return
    const data=await res.json()
    if(active)setUpgrade(data.upgrade||null)
   }catch{}
  }
  void load()
  const refresh=window.setInterval(()=>{if(document.visibilityState==='visible')void load()},30000)
  return()=>{active=false;window.clearInterval(refresh)}
 },[token,user?.role])
 if(!upgrade||upgrade.status==='ready')return null
 return <section className="mx-auto max-w-6xl px-4 pb-6 text-white" data-weave-client-pro-reminder="true">
  <div className="rounded-2xl border border-sky-300/25 bg-[#071727]/95 p-5">
   <p className="text-xs font-bold uppercase tracking-[.16em] text-cyan-200">My Pro File Folder · {upgrade.fileNumber}</p>
   <h2 className="mt-3 text-xl font-black">Your Pro File Folder world is in construction</h2>
   <p className="mt-2 text-sm leading-6 text-slate-300">{upgrade.notice}</p>
   <p className="mt-3 text-sm font-bold text-amber-200">{upgrade.loan.remaining!==null?
    upgrade.loan.remaining.toFixed(2)+' USDT · Remaining verified personal loan':
    '100 USDT personal loan proposal · confirmation pending'}</p>
   <p className="mt-2 text-xs leading-6 text-slate-400">{upgrade.loan.display}</p>
   <Link href="/client/system-switch" className="mt-4 inline-flex rounded-xl border border-cyan-300/30 px-4 py-3 text-sm font-bold text-cyan-200">View the File Folder Gate →</Link>
  </div>
 </section>
}
