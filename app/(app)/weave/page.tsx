'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-provider'

function roleHome(role?:string|null){
  if(role==='client')return '/client/dashboard'
  if(role==='agent')return '/agent/dashboard'
  if(role==='bridger')return '/bridger/dashboard'
  if(role==='admin')return '/admin/dashboard'
  return '/dashboard'
}

export default function WeaveRoleRedirect(){
  const {user,isInitialized,isLoading}=useAuth()
  const router=useRouter()

  useEffect(()=>{
    if(!isInitialized||isLoading)return
    router.replace(roleHome(user?.role))
  },[isInitialized,isLoading,user?.role,router])

  return <main className="flex min-h-[60vh] items-center justify-center px-4 text-center" data-environment-pending="true">
    <div>
      <div className="mx-auto h-9 w-9 animate-spin rounded-full border border-sky-200/15 border-t-sky-200 motion-reduce:animate-none"/>
      <p className="mt-3 text-[9px] font-black uppercase tracking-[.18em] text-sky-200">Opening your role world</p>
    </div>
  </main>
}
