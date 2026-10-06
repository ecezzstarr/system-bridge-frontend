'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth-provider'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { BriefcaseBusiness, FileSignature, Loader2 } from 'lucide-react'
import { WeaveEnvironmentSurface } from '@/components/world/weave-environment-surface'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname=usePathname()
  const { isAuthenticated, isLoading } = useAuth()
  const managerFlow=pathname.startsWith('/manager/')
  const showManagerEntrance=pathname==='/login'||pathname==='/register'

  useEffect(() => {
    // Manager employment registration authenticates an existing Agent/Bridger
    // before the employment document is accepted, so it must remain inside the
    // auth shell after identity verification.
    if (isAuthenticated && !isLoading && !managerFlow) {
      router.push('/weave')
    }
  }, [isAuthenticated, isLoading, managerFlow, router])

  if (isLoading) {
    return (
      <div className="relative flex min-h-dvh items-center justify-center bg-transparent">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    )
  }

  return (
    <div className="relative flex min-h-dvh items-start justify-center overflow-x-hidden overflow-y-auto bg-transparent px-4 py-8 sm:items-center">
      <div className={`${managerFlow?'max-w-2xl':'max-w-md'} w-full relative z-10`}>
        <WeaveEnvironmentSurface compact>{children}</WeaveEnvironmentSurface>
        {showManagerEntrance&&<section className="mt-4 grid gap-2 sm:grid-cols-2" aria-label="Manager employment access">
          <Link href="/manager/login" className="flex items-center justify-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[.04] px-3 py-3 text-[10px] font-black uppercase tracking-[.12em] text-amber-200 transition hover:bg-amber-300/[.08]"><BriefcaseBusiness className="h-4 w-4"/>Manager Entry</Link>
          <Link href="/manager/register" className="flex items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[.04] px-3 py-3 text-[10px] font-black uppercase tracking-[.12em] text-cyan-200 transition hover:bg-cyan-300/[.08]"><FileSignature className="h-4 w-4"/>Manager Employment Registration</Link>
        </section>}
      </div>
    </div>
  )
}
