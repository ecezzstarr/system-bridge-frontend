'use client'
import Link from 'next/link'
import { useEffect,useState } from 'react'
import { useAuth } from '@/lib/auth-provider'

export default function CompanyStaffWorkspaceEntry(){
  const {user,token}=useAuth()
  const [position,setPosition]=useState('')
  useEffect(()=>{
    if(user?.role!=='client'||!token)return
    let active=true
    fetch('/api/client/staff-workspace',{headers:{Authorization:'Bearer '+token},cache:'no-store'})
      .then(async r=>r.ok?r.json():null)
      .then(data=>{if(active&&data?.employed)setPosition(data.position?.position_title||'Company Position')})
      .catch(()=>{})
    return()=>{active=false}
  },[user?.role,token])
  if(!position)return null
  return <div className="mx-auto max-w-6xl px-4 pb-8 text-white">
    <Link href="/client/staff-workspace" className="block rounded-2xl border border-cyan-200/30 bg-cyan-300/10 p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-cyan-200">Your approved company position</p>
      <h2 className="mt-2 text-xl font-bold">{position}</h2>
      <p className="mt-2 text-sm text-slate-200">Open work assignments, prospect conversations, next actions and assistance →</p>
    </Link>
  </div>
}
