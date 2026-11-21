'use client'

import {useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {useAuth} from '@/lib/auth-provider'
import {BridgerWorkplace} from '@/components/bridger/bridger-workplace'
import {ManagerLifestyleEntry} from '@/components/manager-lifestyle-entry'
import {RegionalSystemSwitchGate} from '@/components/weave/regional-system-switch-gate'

export default function BridgerDashboardPage(){
 const {user,isInitialized,isLoading}=useAuth()
 const router=useRouter()
 useEffect(()=>{
  if(isInitialized&&!isLoading&&user&&user.role!=='bridger')router.replace('/event')
 },[isInitialized,isLoading,user?.role,router])
 if(!isInitialized||isLoading||user?.role!=='bridger')return null
 return <>
  <BridgerWorkplace userName={user.name}/>
  <details className="mx-auto my-4 w-full max-w-5xl rounded-xl border border-amber-100/25 bg-[#132b35] p-3 text-white">
   <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">My appointments and System Switch</summary>
   <RegionalSystemSwitchGate compact />
   <ManagerLifestyleEntry/>
  </details>
 </>
}
