'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Share2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { BridgerWorkplace } from '@/components/bridger/bridger-workplace'
import {NativeDepartmentRail} from '@/components/weave/native-department-rail'
import { ManagerLifestyleEntry } from '@/components/manager-lifestyle-entry'
import { RegionalSystemSwitchGate } from '@/components/weave/regional-system-switch-gate'

export default function BridgerDashboardPage() {
  const { user, isInitialized, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isInitialized && !isLoading && user && user.role!=='bridger') router.replace('/event')
  }, [isInitialized, isLoading, user?.role, router])

  if (!isInitialized || isLoading || user?.role!=='bridger')return null

  return <>
    <div className="mx-auto w-full max-w-5xl px-3 sm:px-5"><RegionalSystemSwitchGate compact /></div>
    <BridgerWorkplace userName={user?.name}/>
    <NativeDepartmentRail department="hope"/>
    <ManagerLifestyleEntry/>
    <nav aria-label="Department shortcuts" className="mx-auto flex max-w-5xl flex-wrap gap-2 px-4 py-4">
    <Link href="/referrals" data-core-function="referral-movement" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-300/25 bg-[#071711]/95 px-4 py-3 text-[10px] font-black uppercase tracking-[.12em] text-emerald-100 shadow-2xl backdrop-blur">
      <Share2 className="h-4 w-4"/>Referral Movement · ₦500
    </Link>
    </nav>
  </>
}
