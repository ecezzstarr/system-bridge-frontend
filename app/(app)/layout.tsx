'use client'

import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    // Only redirect if we've finished loading and confirmed not authenticated
    if (!isLoading && !isAuthenticated && !isRedirecting) {
      setIsRedirecting(true)
      // Use replace to avoid back button issues
      router.replace('/login')
    }
  }, [isLoading, isAuthenticated, isRedirecting, router])

  // Show loading state while checking auth or redirecting
  if (isLoading || (isRedirecting && !isAuthenticated)) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Only render children if authenticated
  if (!isAuthenticated) {
    // Don't render anything, let the redirect happen
    return null
  }

  return <>{children}</>
}
