'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getClientToken, getClientUser } from '@/lib/client-auth'
import PositionEventWorld from '@/components/events/position-event-world'

export default function ClientEventPage() {
  const [client,setClient]=useState<any>(null)
  useEffect(()=>{ const user=getClientUser(); const token=getClientToken(); if(!user||!token){window.location.href='/client/login';return}; setClient(user) },[])
  if(!client)return <main className="min-h-screen bg-black"/>
  return <main className="min-h-screen bg-black p-4 text-white md:p-8"><div className="mx-auto max-w-7xl">
    <Link href="/client/system-switch" className="mb-5 inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white"><ArrowLeft className="h-3.5 w-3.5"/> Back to File Folder</Link>
    <PositionEventWorld role="client" context={[{label:'Position',value:'Client'},{label:'File Number',value:client.file_number||'Open File Folder'}]}/>
  </div></main>
}
