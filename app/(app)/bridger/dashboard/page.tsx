'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Share2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { WeaveDashboardWorld } from '@/components/world/weave-dashboard-world'
import { BridgerWorkplace } from '@/components/bridger/bridger-workplace'
import { ManagerLifestyleEntry } from '@/components/manager-lifestyle-entry'

export default function BridgerDashboardPage() {
  const { user, isInitialized, isLoading } = useAuth()
  const router = useRouter()
  const [originalWorld, setOriginalWorld] = useState(false)

  useEffect(() => {
    if (isInitialized && !isLoading && user && user.role!=='bridger') router.replace('/event')
  }, [isInitialized, isLoading, user?.role, router])

  if (!isInitialized || isLoading || user?.role!=='bridger')return null

  return <>
    {originalWorld ? (
      <div data-bridger-original-district-world="preserved">
        <button
          type="button"
          onClick={() => setOriginalWorld(false)}
          className="relative z-30 m-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-300/40 bg-[#142334] px-4 py-2 text-sm font-semibold text-amber-100"
        >
          <ArrowLeft className="h-4 w-4"/> Return to Work Desk
        </button>
        <WeaveDashboardWorld role="bridger" userName={user?.name}/>
      </div>
    ) : (
      <BridgerWorkplace userName={user?.name} onOpenDistricts={() => setOriginalWorld(true)}/>
    )}
    <ManagerLifestyleEntry/>
    <Link href="/referrals" data-core-function="referral-movement" className="fixed bottom-24 right-4 z-30 inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-[#071711]/95 px-4 py-3 text-[10px] font-black uppercase tracking-[.12em] text-emerald-100 shadow-2xl backdrop-blur md:right-7">
      <Share2 className="h-4 w-4"/>Referral Movement · ₦500
    </Link>
  </>
}
