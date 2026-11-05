'use client'
import { useAuth } from '@/lib/auth-provider'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { WeaveDashboardWorld } from '@/components/world/weave-dashboard-world'
import { AdminWorkplace } from '@/components/admin/admin-workplace'

export default function AdministrationWorld(){
  const {user,isInitialized,isLoading}=useAuth()
  const router=useRouter()
  const [originalWorld,setOriginalWorld]=useState(false)
  useEffect(()=>{
    if(isInitialized&&!isLoading&&user&&user.role!=='admin')router.replace('/event')
  },[isInitialized,isLoading,user?.role,router])
  if(!isInitialized||isLoading||user?.role!=='admin')return null
  return originalWorld ? (
    <div data-admin-original-district-world="preserved">
      <button type="button" onClick={()=>setOriginalWorld(false)}
        className="relative z-30 m-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-300/40 bg-[#142334] px-4 py-2 text-sm font-semibold text-amber-100">
        <ArrowLeft className="h-4 w-4"/> Return to Command Desk
      </button>
      <WeaveDashboardWorld role="admin" userName={user?.name}/>
    </div>
  ) : (
    <AdminWorkplace userName={user?.name} onOpenDistricts={()=>setOriginalWorld(true)}/>
  )
}
