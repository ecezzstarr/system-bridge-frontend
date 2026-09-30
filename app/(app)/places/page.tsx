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

export default function LegacyPlacesRedirect(){
  const {user,isInitialized,isLoading}=useAuth()
  const router=useRouter()
  useEffect(()=>{
    if(!isInitialized||isLoading)return
    router.replace(roleHome(user?.role))
  },[isInitialized,isLoading,user?.role,router])
  return <div className="min-h-[40vh]" data-environment-pending="true"/>
}
