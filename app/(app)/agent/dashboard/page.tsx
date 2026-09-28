'use client'

import { useAuth } from '@/lib/auth-provider'
import { WeaveDashboardWorld } from '@/components/world/weave-dashboard-world'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AgentWorld() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(()=>{
    if(user&&user.role!=='agent')router.replace('/dashboard')
  },[user,router])

  if(!user||user.role!=='agent')return null
  return <WeaveDashboardWorld role="agent" userName={user.name} />
}
