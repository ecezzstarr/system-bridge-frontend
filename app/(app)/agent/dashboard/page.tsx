'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { WeaveDashboardWorld } from '@/components/world/weave-dashboard-world'
import { AgilityAgentLoginAd, AGILITY_AGENT_LOGIN_AD_KEY } from '@/components/agility-agent-login-ad'
import { Loop1AgentLoginAd, LOOP1_AGENT_LOGIN_AD_KEY } from '@/components/agent/loop1-agent-login-ad'
import { useRouter } from 'next/navigation'

export default function AgentWorld() {
  const { user } = useAuth()
  const router = useRouter()
  const [showLoop1Ad,setShowLoop1Ad]=useState(false)
  const [showAgilityAd,setShowAgilityAd]=useState(false)
  const [agilityQueued,setAgilityQueued]=useState(false)

  useEffect(()=>{
    if(!user)return
    if(user.role!=='agent'){router.replace('/dashboard');return}
    const loop=sessionStorage.getItem(LOOP1_AGENT_LOGIN_AD_KEY)==='1'
    const agility=sessionStorage.getItem(AGILITY_AGENT_LOGIN_AD_KEY)==='1'
    if(loop)sessionStorage.removeItem(LOOP1_AGENT_LOGIN_AD_KEY)
    if(agility)sessionStorage.removeItem(AGILITY_AGENT_LOGIN_AD_KEY)
    if(loop){setShowLoop1Ad(true);setAgilityQueued(agility)}
    else if(agility)setShowAgilityAd(true)
  },[user,router])

  if(!user||user.role!=='agent')return null

  return <>
    <Loop1AgentLoginAd
      open={showLoop1Ad}
      onOpenChange={open=>{setShowLoop1Ad(open);if(!open&&agilityQueued){setAgilityQueued(false);setShowAgilityAd(true)}}}
      onOpenContinuance={()=>{setShowLoop1Ad(false);router.push('/agent/commissions')}}
    />
    <AgilityAgentLoginAd open={showAgilityAd} onOpenChange={setShowAgilityAd} onBuy={()=>{setShowAgilityAd(false);router.push('/agility')}} />
    <WeaveDashboardWorld role="agent" userName={user.name} />
  </>
}
