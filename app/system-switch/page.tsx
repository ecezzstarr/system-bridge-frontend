'use client'

import {redirect} from 'next/navigation'
import {useAuth} from '@/lib/auth-provider'

/**
 * System Switch changes the website into Burning River. It is a crossing,
 * not a second plaza with a second river. Private Client File Folders retain
 * their own protected System Switch destination.
 */
export default function SystemSwitchEntryPage(){
  const {user,isInitialized,isLoading}=useAuth()
  if(!isInitialized||isLoading)return <main className="min-h-dvh bg-[#06182b]" data-system-switch-transition="resolving-position"/>
  if(!user||!user.role)redirect('/login')
  if(user.role==='client')redirect('/client/system-switch')
  if(['admin','agent','bridger'].includes(user.role))redirect('/system-switch/flame-event')
  redirect('/login')
}
