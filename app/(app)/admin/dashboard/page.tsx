'use client'
import { useAuth } from '@/lib/auth-provider'
import {useEffect} from 'react'
import {useRouter} from 'next/navigation'
import { WeaveDashboardWorld } from '@/components/world/weave-dashboard-world'
export default function AdministrationWorld(){
 const {user,isInitialized,isLoading}=useAuth()
 const router=useRouter()
 useEffect(()=>{
   if(isInitialized&&!isLoading&&user&&user.role!=='admin')router.replace('/event')
 },[isInitialized,isLoading,user?.role,router])
 if(!isInitialized||isLoading||user?.role!=='admin')return null
 return <WeaveDashboardWorld role="admin" userName={user.name}/>
}
