'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DevWorkshopRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/authority')
  }, [router])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-purple-500 font-mono animate-pulse">
        REDIRECTING TO ECOSYSTEM AUTHORITY...
      </div>
    </div>
  )
}
