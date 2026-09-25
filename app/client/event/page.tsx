'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getClientToken, getClientUser } from '@/lib/client-auth'
import PositionEventWorld from '@/components/events/position-event-world'

export default function ClientEventPage() {
  const [client, setClient] = useState<any>(null)

  useEffect(() => {
    const user = getClientUser()
    const token = getClientToken()
    if (!user || !token) {
      window.location.href = '/client/login'
      return
    }
    setClient(user)
  }, [])

  if (!client) return <div className="min-h-[40vh]" />

  return (
    <div className="mx-auto w-full max-w-3xl p-3 pb-24 text-white sm:p-4">
      <Link href="/client/dashboard" className="mb-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
      </Link>
      <PositionEventWorld
        role="client"
        context={[
          { label: 'Position', value: 'Client' },
          { label: 'File Number', value: client.file_number || 'Open File Folder' },
        ]}
      />
    </div>
  )
}
