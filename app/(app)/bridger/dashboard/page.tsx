'use client'

import Link from 'next/link'
import { Share2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { WeaveDashboardWorld } from '@/components/world/weave-dashboard-world'

export default function BridgerDashboardPage() {
  const { user } = useAuth()
  return <>
    <WeaveDashboardWorld role="bridger" userName={user?.name} />
    <Link href="/referrals" data-core-function="referral-movement" className="fixed bottom-24 right-4 z-30 inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-[#071711]/95 px-4 py-3 text-[10px] font-black uppercase tracking-[.12em] text-emerald-100 shadow-2xl backdrop-blur md:right-7">
      <Share2 className="h-4 w-4"/>Referral Movement · ₦500
    </Link>
  </>
}
