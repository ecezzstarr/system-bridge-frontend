'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {useAuth} from '@/lib/auth-provider'
type Report={reportedAmountUSDT:number;verifiedAmountUSDT:number;status:string;notice:string;proActivated:boolean}
export default function ClientSiblingsEventCard(){
 const {token,user}=useAuth()
 const [report,setReport]=useState<Report|null>(null)
 useEffect(()=>{
  if(!token||user?.role!=='client')return
  let active=true
  void fetch('/api/client/pro-activation',{headers:{Authorization:'Bearer '+token},cache:'no-store'})
   .then(r=>r.ok?r.json():null)
   .then(d=>{if(active)setReport(d?.siblingsEvent||null)})
   .catch(()=>{})
  return()=>{active=false}
 },[token,user?.role])
 if(!report)return null
 return <section className="mx-auto max-w-6xl px-4 pb-6 text-white" data-client-siblings-event-summary="true">
  <div className="rounded-2xl border border-violet-300/25 bg-[#0c1023]/90 p-5">
   <p className="text-xs font-bold uppercase tracking-widest text-violet-200">Siblings Event · Mandate Business Earnings</p>
   <p className="mt-2 text-3xl font-bold">{report.reportedAmountUSDT.toLocaleString()} USDT</p>
   <p className="mt-1 text-sm font-semibold text-amber-200">Reported funds · Pending independent verification</p>
   <p className="mt-2 text-xs leading-6 text-slate-300">{report.notice}</p>
   <p className="mt-1 text-xs text-slate-400">Verified: {report.verifiedAmountUSDT.toLocaleString()} USDT · Other funds: Pending verification</p>
   <Link href="/client/pro-activation" className="mt-3 inline-block text-sm font-semibold text-cyan-200 underline">Open Pro activation and signed agreement</Link>
  </div>
 </section>
}
