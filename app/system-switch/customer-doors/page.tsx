'use client'

import {redirect} from 'next/navigation'
import {useAuth} from '@/lib/auth-provider'

/** One public/current River. Client-hosted Door visits keep their own routes. */
export default function PublicAvatarSystemSwitch(){
  const {user,isInitialized,isLoading}=useAuth()
  if(!isInitialized||isLoading)return <main className="min-h-dvh bg-[#06182b]" data-customer-door-world-transition="loading"/>
  if(user?.role==='admin'||user?.role==='agent'||user?.role==='bridger')redirect('/system-switch/flame-event')
  if(user?.role==='client')redirect('/client/event')
  redirect('/flame-event')
}
