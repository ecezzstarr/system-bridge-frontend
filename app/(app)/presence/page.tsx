'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-provider'

function presenceHome(role?:string|null){
  if(role==='client')return '/client/presence'
  if(role==='agent')return '/agent/presence'
  if(role==='bridger')return '/bridger/presence'
  if(role==='admin')return '/admin/dashboard'
  return '/dashboard'
}

export default function LegacyPresenceDistrictRedirect(){
  const {user,isInitialized,isLoading}=useAuth()
  const router=useRouter()
  useEffect(()=>{
    if(!isInitialized||isLoading)return
    router.replace(presenceHome(user?.role))
  },[isInitialized,isLoading,user?.role,router])
  return <div className="min-h-[40vh]" data-environment-pending="true"/>
}
