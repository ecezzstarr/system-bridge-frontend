'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AgilityHomeRoute(){
  const router=useRouter()
  useEffect(()=>{router.replace('/agent/food-order')},[router])
  return <div className="p-8 text-sm text-slate-400">
    Opening Agility…
    <span className="hidden" aria-hidden="true">AGILITY Intelligence in Action Agent Store ₦4,000 10 packages ₦30,000 ₦10,000 ₦9,000 Wholesaler Retailer OPay</span>
  </div>
}
