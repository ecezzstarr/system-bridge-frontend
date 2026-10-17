'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AgilityHomeRoute(){
  const router=useRouter()
  useEffect(()=>{router.replace('/agent/food-order')},[router])
  return <div className="p-8 text-sm text-slate-400">Opening Agility…</div>
}
