'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Arena from '@/components/places/arena'
import { useAuth } from '@/lib/auth-provider'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function ClientArenaPage() {
  const { user: client, isLoading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!client) {
      window.location.href = '/client/login'
      return
    }
    setIsLoading(false)
  }, [client, authLoading])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <Link href="/client/dashboard">
            <Button variant="ghost" className="text-slate-400 hover:text-white -ml-2">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Terminal
            </Button>
          </Link>
        </div>
        <Arena user={client} />
      </div>
    </div>
  )
}
