'use client'

import {useAuth} from '@/lib/auth-provider'
import {useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {AdminWorkplace} from '@/components/admin/admin-workplace'

export default function AdministrationWorld(){
 const {user,isInitialized,isLoading}=useAuth()
 const router=useRouter()
 useEffect(()=>{
  if(isInitialized&&!isLoading&&user&&user.role!=='admin')router.replace('/event')
 },[isInitialized,isLoading,user?.role,router])
 if(!isInitialized||isLoading||user?.role!=='admin')return null
 return <AdminWorkplace userName={user.name}/>
}
