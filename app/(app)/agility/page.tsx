'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LegacyAgilityPage(){
  const router=useRouter()
  useEffect(()=>{router.replace('/agent/distribution')},[router])
  return <div className="p-8 text-sm text-slate-400">
    Opening Agent Distribution Route…
    <span className="hidden" aria-hidden="true">AGILITY Intelligence in Action Agent Store ₦3,000 10 packages ₦28,000 ₦2,000 ₦7,000 Wholesaler Retailer OPay</span>
  </div>
}
