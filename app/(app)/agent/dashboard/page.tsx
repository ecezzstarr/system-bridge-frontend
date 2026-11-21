'use client'

import Link from 'next/link'
import {useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {useAuth} from '@/lib/auth-provider'
import {AgentWorkplace} from '@/components/agent/agent-workplace'
import {ManagerLifestyleEntry} from '@/components/manager-lifestyle-entry'
import {RegionalSystemSwitchGate} from '@/components/weave/regional-system-switch-gate'

export default function AgentWorld(){
 const {user}=useAuth()
 const router=useRouter()
 useEffect(()=>{
  if(!user)return
  if(user.role!=='agent'){router.replace('/dashboard');return}
 },[user,router])
 if(!user||user.role!=='agent')return null
 return <>
  <AgentWorkplace userName={user.name}/>
  <details className="mx-auto my-4 w-full max-w-5xl rounded-xl border border-amber-100/25 bg-[#132b35] p-3 text-white">
   <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">My appointments and System Switch</summary>
   <RegionalSystemSwitchGate compact />
   <ManagerLifestyleEntry inline/>
  </details>
  <nav className="sr-only focus-within:not-sr-only" aria-label="Direct food access">
   <Link href="/agility">Agility home</Link>
   <Link href="/electrolyte">Electrolyte home</Link>
  </nav>
 </>
}
